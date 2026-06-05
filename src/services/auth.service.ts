import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createHash } from "crypto";
import type { StringValue } from "ms";
import { supabaseAdmin, supabaseAuth } from "../lib/supabase.ts";
import { config } from "../config/index.ts";
import { AppError } from "../utils/AppError.ts";
import { logger } from "../utils/logger.ts";
import { formatEmployee } from "../utils/formatEmployee.ts";
import {
    employeeRepository,
    refreshTokenRepository,
    type Employee,
} from "../repositories/index.ts";
import type { EmployeeRole, EmployeePayload } from "../types/index.ts";

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

interface PinLoginInput {
    pin: string;
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
            sub: employee.supabaseUid,
            role: employee.role,
            employeeId: employee.id,
        },
        config.jwtSecret,
        { expiresIn: config.accessTokenExpiry as StringValue },
    );

const generateRefreshToken = (employee: Employee): string =>
    jwt.sign(
        {
            sub: employee.supabaseUid,
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

        const { data: authData, error: authError } =
            await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
            });

        if (authError) {
            if (authError.status === 422) {
                throw AppError.conflict("Email already registered");
            }
            throw AppError.internal("Failed to create auth user");
        }

        const supabaseUid = authData.user.id;

        try {
            const employee = await employeeRepository.insert({
                name,
                role: assignedRole,
                pin: pinHash ?? "",
                supabaseUid,
            });

            return { employee: formatEmployee(employee, authData.user.email) };
        } catch (err) {
            try {
                await supabaseAdmin.auth.admin.deleteUser(supabaseUid);
            } catch (deleteErr) {
                logger.error(
                    deleteErr as Error,
                    "Failed to rollback Supabase auth user after DB insert failure",
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

        const { data: sessionData, error: sessionError } =
            await supabaseAuth.auth.signInWithPassword({ email, password });

        if (sessionError) {
            logger.error(
                { message: sessionError.message, status: sessionError.status },
                "Supabase signInWithPassword error",
            );
            throw AppError.unauthorized("Invalid email or password");
        }

        const employee = await employeeRepository.findBySupabaseUid(
            sessionData.user.id,
        );
        if (!employee) {
            throw AppError.unauthorized("Employee record not found");
        }
        if (!employee.isActive) {
            throw AppError.unauthorized("Employee account is inactive");
        }

        const { accessToken, refreshToken } = await createTokenPair(employee);

        return {
            accessToken,
            refreshToken,
            employee: formatEmployee(employee, sessionData.user.email),
        };
    }

    async pinLogin(input: PinLoginInput): Promise<{
        accessToken: string;
        refreshToken: string;
        employee: EmployeePayload;
    }> {
        const { pin } = input;

        const employees = await employeeRepository.findActiveEmployees();

        let matchedEmployee: Employee | null = null;
        for (const emp of employees) {
            if (!emp.pin) continue;
            const match = await bcrypt.compare(pin, emp.pin);
            if (match) {
                matchedEmployee = emp;
                break;
            }
        }

        if (!matchedEmployee) {
            throw AppError.unauthorized("Invalid PIN");
        }

        if (!matchedEmployee.supabaseUid) {
            throw AppError.unauthorized("Employee has no linked auth account");
        }

        let email: string | undefined;
        const { data: userData, error: userError } =
            await supabaseAdmin.auth.admin.getUserById(
                matchedEmployee.supabaseUid,
            );
        if (!userError && userData?.user?.email) {
            email = userData.user.email;
        }

        const { accessToken, refreshToken } =
            await createTokenPair(matchedEmployee);

        return {
            accessToken,
            refreshToken,
            employee: formatEmployee(matchedEmployee, email),
        };
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

            const employee = await employeeRepository.findBySupabaseUid(
                payload.sub,
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
