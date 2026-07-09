import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createHash } from "crypto";
import type { StringValue } from "ms";

import { clerkClient } from "../../shared/lib/clerk.ts";
import { config } from "../../shared/config/index.ts";
import { AppError } from "../../shared/utils/AppError.ts";
import { logger } from "../../shared/utils/logger.ts";
import { formatEmployee } from "../../shared/utils/formatEmployee.ts";
import {
    employeeRepository,
    type Employee,
} from "../employees/employee.repository.ts";
import { refreshTokenRepository } from "./refresh-token.repository.ts";
import type {
    EmployeeRole,
    EmployeePayload,
} from "../../shared/types/index.ts";

const SALT_ROUNDS = 10;

interface SignupInput {
    email: string;
    password: string;
    name: string;
    pin?: string;
    role?: EmployeeRole;
}

interface LoginInput {
    email: string;
    password: string;
}

interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

const hashToken = (token: string): string =>
    createHash("sha256").update(token).digest("hex");

const generateAccessToken = (employee: Employee): string =>
    jwt.sign(
        {
            sub: employee.id,
            role: employee.role,
            employeeId: employee.id,
        },
        config.jwtSecret,
        { expiresIn: config.accessTokenExpiry as StringValue },
    );

const generateRefreshToken = (employee: Employee): string =>
    jwt.sign(
        {
            sub: employee.id,
            employeeId: employee.id,
        },
        config.jwtSecret,
        { expiresIn: config.refreshTokenExpiry as StringValue },
    );

const storeRefreshToken = async (
    employeeId: string,
    token: string,
): Promise<void> => {
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await refreshTokenRepository.insert({ employeeId, tokenHash, expiresAt });
};

const createTokenPair = async (employee: Employee): Promise<TokenPair> => {
    const accessToken = generateAccessToken(employee);
    const refreshToken = generateRefreshToken(employee);
    await storeRefreshToken(employee.id, refreshToken);
    return { accessToken, refreshToken };
};

export class AuthService {
    async signup(
        input: SignupInput,
        creatorRole: EmployeeRole,
    ): Promise<{ employee: EmployeePayload }> {
        const { email, password, name, pin, role } = input;
        const assignedRole = role ?? "barista";

        if (assignedRole === "owner" && creatorRole !== "owner") {
            throw AppError.forbidden("Only owners can create owner accounts");
        }

        let pinHash: string | null = null;
        if (pin) {
            const employees = await employeeRepository.findActiveEmployees();
            for (const emp of employees) {
                if (!emp.pin) continue;
                const match = await bcrypt.compare(pin, emp.pin);
                if (match) {
                    throw AppError.conflict("PIN already in use");
                }
            }
            pinHash = await bcrypt.hash(pin, SALT_ROUNDS);
        }

        let clerkUser;
        try {
            clerkUser = await clerkClient.users.createUser({
                emailAddress: [email],
                password,
            });
        } catch (err: any) {
            if (err?.errors?.[0]?.code === "form_identifier_exists") {
                throw AppError.conflict("Email already registered");
            }
            logger.error(err as Error, "Failed to create Clerk user");
            throw AppError.internal("Failed to create auth user");
        }

        try {
            const employee = await employeeRepository.insert({
                name,
                role: assignedRole,
                pin: pinHash ?? "",
                clerkUserId: clerkUser.id,
            });

            const primaryEmail =
                clerkUser.emailAddresses?.find(
                    (e) => e.id === clerkUser.primaryEmailAddressId,
                )?.emailAddress ?? email;

            return { employee: formatEmployee(employee, primaryEmail) };
        } catch (err) {
            try {
                await clerkClient.users.deleteUser(clerkUser.id);
            } catch (deleteErr) {
                logger.error(
                    deleteErr as Error,
                    "Failed to rollback Clerk user after DB insert failure",
                );
            }
            throw err;
        }
    }

    async login(input: LoginInput): Promise<{
        accessToken: string;
        refreshToken: string;
        employee: EmployeePayload;
    }> {
        const { email, password } = input;

        const users = await clerkClient.users.getUserList({
            emailAddress: [email],
        });
        if (users.data.length === 0) {
            throw AppError.unauthorized("Invalid email or password");
        }

        const clerkUser = users.data[0];

        try {
            await clerkClient.users.verifyPassword({
                userId: clerkUser.id,
                password,
            });
        } catch {
            throw AppError.unauthorized("Invalid email or password");
        }

        const employee = await employeeRepository.findByClerkUserId(
            clerkUser.id,
        );
        if (!employee) {
            throw AppError.unauthorized("Employee record not found");
        }
        if (!employee.isActive) {
            throw AppError.unauthorized("Employee account is inactive");
        }

        const { accessToken, refreshToken } = await createTokenPair(employee);

        const emailStr = clerkUser.emailAddresses?.find(
            (e) => e.id === clerkUser.primaryEmailAddressId,
        )?.emailAddress;

        return {
            accessToken,
            refreshToken,
            employee: formatEmployee(employee, emailStr),
        };
    }

    async verifyPin(pin: string): Promise<{
        id: string;
        name: string;
        role: EmployeeRole;
    }> {
        const employees = await employeeRepository.findActiveEmployees();

        for (const emp of employees) {
            if (!emp.pin) continue;
            const match = await bcrypt.compare(pin, emp.pin);
            if (match) {
                return { id: emp.id, name: emp.name, role: emp.role };
            }
        }

        throw AppError.unauthorized("Invalid PIN");
    }

    async refresh(refreshToken: string): Promise<string> {
        try {
            const payload = jwt.verify(refreshToken, config.jwtSecret) as {
                sub: string;
                employeeId: string;
            };

            const tokenHash = hashToken(refreshToken);
            const storedToken =
                await refreshTokenRepository.findByHash(tokenHash);

            if (!storedToken) {
                throw AppError.unauthorized("Invalid refresh token");
            }

            if (storedToken.expiresAt < new Date()) {
                throw AppError.unauthorized("Refresh token expired");
            }

            const employee = await employeeRepository.findById(
                payload.employeeId,
            );
            if (!employee || !employee.isActive) {
                throw AppError.unauthorized("Employee not found or inactive");
            }

            return generateAccessToken(employee);
        } catch (err) {
            if (err instanceof AppError) throw err;
            if (err instanceof jwt.TokenExpiredError) {
                throw AppError.unauthorized("Refresh token expired");
            }
            if (err instanceof jwt.JsonWebTokenError) {
                throw AppError.unauthorized("Invalid refresh token");
            }
            throw err;
        }
    }

    async logout(employeeId: string): Promise<void> {
        await refreshTokenRepository.revokeAllForEmployee(employeeId);
    }
}

export const authService = new AuthService();
