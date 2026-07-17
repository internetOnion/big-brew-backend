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
import {
    terminalRepository,
    type Terminal,
} from "../terminals/terminal.repository.ts";
import { refreshTokenRepository } from "./refresh-token.repository.ts";
import type {
    EmployeeRole,
    EmployeePayload,
} from "../../shared/types/index.ts";

const SALT_ROUNDS = 10;

const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCKOUT_MS = 15 * 60 * 1000;

// ponytail: in-memory per-IP rate limit — resets on restart, good enough for v1
const pinAttempts = new Map<string, { count: number; resetAt: number }>();

const checkPinRateLimit = (
    ip: string,
): { allowed: boolean; retryAfter?: number } => {
    const now = Date.now();
    const entry = pinAttempts.get(ip);

    if (!entry || now > entry.resetAt) {
        pinAttempts.set(ip, { count: 1, resetAt: now + PIN_LOCKOUT_MS });
        return { allowed: true };
    }

    entry.count++;
    if (entry.count > MAX_PIN_ATTEMPTS) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        return { allowed: false, retryAfter };
    }

    return { allowed: true };
};

interface SignupInput {
    email?: string;
    password?: string;
    name: string;
    pin?: string;
    role?: EmployeeRole;
}

interface LoginInput {
    email: string;
    password: string;
}

interface TerminalLoginInput {
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

const generateTerminalAccessToken = (terminal: Terminal): string =>
    jwt.sign(
        {
            sub: terminal.id,
            terminalId: terminal.id,
        },
        config.jwtSecret,
        { expiresIn: config.accessTokenExpiry as StringValue },
    );

const generateRefreshToken = (entityId: string): string =>
    jwt.sign(
        {
            sub: entityId,
        },
        config.jwtSecret,
        { expiresIn: config.refreshTokenExpiry as StringValue },
    );

const storeRefreshToken = async (
    entityId: string,
    entityType: "employee" | "terminal",
    token: string,
): Promise<void> => {
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await refreshTokenRepository.insert({
        entityId,
        entityType,
        tokenHash,
        expiresAt,
    });
};

const createEmployeeTokenPair = async (
    employee: Employee,
): Promise<TokenPair> => {
    const accessToken = generateAccessToken(employee);
    const refreshToken = generateRefreshToken(employee.id);
    await storeRefreshToken(employee.id, "employee", refreshToken);
    return { accessToken, refreshToken };
};

const createTerminalTokenPair = async (
    terminal: Terminal,
): Promise<TokenPair> => {
    const accessToken = generateTerminalAccessToken(terminal);
    const refreshToken = generateRefreshToken(terminal.id);
    await storeRefreshToken(terminal.id, "terminal", refreshToken);
    return { accessToken, refreshToken };
};

export class AuthService {
    async signup(
        input: SignupInput,
        creatorRole: EmployeeRole,
    ): Promise<{ employee: EmployeePayload }> {
        const { email, password, name, pin, role } = input;
        const assignedRole = role ?? "barista";

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

        // ponytail: baristas have no Clerk account — name + PIN only
        if (assignedRole === "barista") {
            try {
                const employee = await employeeRepository.insert({
                    name,
                    role: assignedRole,
                    pin: pinHash ?? "",
                    clerkUserId: null,
                });
                return { employee: formatEmployee(employee) };
            } catch (err: any) {
                if (err?.code === "23505") {
                    throw AppError.conflict("PIN already in use");
                }
                throw err;
            }
        }

        // Managers require email + password for Clerk
        if (!email || !password) {
            throw AppError.badRequest(
                "Email and password are required for manager accounts",
            );
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
            if (
                err?.errors?.[0]?.code === "form_password_pwned" ||
                err?.errors?.[0]?.code === "form_password_compromised"
            ) {
                throw AppError.badRequest(
                    "This password has been found in a data breach. Please choose a different password.",
                );
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
        } catch (err: any) {
            try {
                await clerkClient.users.deleteUser(clerkUser.id);
            } catch (deleteErr) {
                logger.error(
                    deleteErr as Error,
                    "Failed to rollback Clerk user after DB insert failure",
                );
            }
            if (err?.code === "23505") {
                throw AppError.conflict("PIN already in use");
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

        const { accessToken, refreshToken } =
            await createEmployeeTokenPair(employee);

        const emailStr = clerkUser.emailAddresses?.find(
            (e) => e.id === clerkUser.primaryEmailAddressId,
        )?.emailAddress;

        return {
            accessToken,
            refreshToken,
            employee: formatEmployee(employee, emailStr),
        };
    }

    async terminalLogin(input: TerminalLoginInput): Promise<{
        accessToken: string;
        refreshToken: string;
        terminal: { id: string; name: string };
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

        const terminal = await terminalRepository.findByClerkUserId(
            clerkUser.id,
        );
        if (!terminal) {
            throw AppError.unauthorized("Terminal record not found");
        }
        if (!terminal.isActive) {
            throw AppError.unauthorized("Terminal is inactive");
        }

        const { accessToken, refreshToken } =
            await createTerminalTokenPair(terminal);

        return {
            accessToken,
            refreshToken,
            terminal: { id: terminal.id, name: terminal.name },
        };
    }

    async verifyPin(
        pin: string,
        ip: string,
    ): Promise<{
        id: string;
        name: string;
        role: EmployeeRole;
    }> {
        const rateLimit = checkPinRateLimit(ip);
        if (!rateLimit.allowed) {
            throw AppError.tooManyRequests(
                "Too many PIN attempts. Try again later.",
                { retryAfter: rateLimit.retryAfter },
            );
        }

        const employees = await employeeRepository.findActiveEmployees();

        for (const emp of employees) {
            if (!emp.pin) continue;
            const match = await bcrypt.compare(pin, emp.pin);
            if (match) {
                logger.info(
                    { employeeId: emp.id, ip, route: "verify-pin" },
                    "PIN verification success",
                );
                return { id: emp.id, name: emp.name, role: emp.role };
            }
        }

        logger.warn({ ip, route: "verify-pin" }, "PIN verification failure");
        throw AppError.unauthorized("Invalid PIN");
    }

    async refresh(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
        entityType: "employee" | "terminal";
    }> {
        try {
            const payload = jwt.verify(refreshToken, config.jwtSecret) as {
                sub: string;
            };

            const tokenHash = hashToken(refreshToken);
            const storedToken =
                await refreshTokenRepository.findByHashAny(tokenHash);

            if (!storedToken) {
                throw AppError.unauthorized("Invalid refresh token");
            }

            if (storedToken.expiresAt < new Date()) {
                throw AppError.unauthorized("Refresh token expired");
            }

            // ponytail: reuse detection — a revoked token means theft
            if (storedToken.revoked) {
                await refreshTokenRepository.revokeAllForEntity(
                    storedToken.entityId,
                    storedToken.entityType,
                );
                throw AppError.unauthorized("Refresh token revoked");
            }

            // Rotation: revoke current, issue new
            await refreshTokenRepository.revoke(storedToken.id);

            if (storedToken.entityType === "terminal") {
                const terminal = await terminalRepository.findById(
                    storedToken.entityId,
                );
                if (!terminal || !terminal.isActive) {
                    throw AppError.unauthorized(
                        "Terminal not found or inactive",
                    );
                }
                const newRefreshToken = generateRefreshToken(terminal.id);
                await storeRefreshToken(
                    terminal.id,
                    "terminal",
                    newRefreshToken,
                );
                return {
                    accessToken: generateTerminalAccessToken(terminal),
                    refreshToken: newRefreshToken,
                    entityType: "terminal",
                };
            }

            const employee = await employeeRepository.findById(
                storedToken.entityId,
            );
            if (!employee || !employee.isActive) {
                throw AppError.unauthorized("Employee not found or inactive");
            }

            const newRefreshToken = generateRefreshToken(employee.id);
            await storeRefreshToken(employee.id, "employee", newRefreshToken);
            return {
                accessToken: generateAccessToken(employee),
                refreshToken: newRefreshToken,
                entityType: "employee",
            };
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

    async logout(
        entityId: string,
        entityType: "employee" | "terminal" = "employee",
    ): Promise<void> {
        await refreshTokenRepository.revokeAllForEntity(entityId, entityType);
    }
}

export const authService = new AuthService();
