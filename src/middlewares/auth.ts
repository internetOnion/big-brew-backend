import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { supabaseAuth } from "../lib/supabase.ts";
import { AppError } from "../utils/AppError.ts";
import { config } from "../config/index.ts";
import { logger } from "../utils/logger.ts";
import { employeeRepository } from "../repositories/index.ts";
import type { EmployeeRole } from "../types/index.ts";

interface LocalJwtPayload {
    sub: string;
    role: EmployeeRole;
    employeeId: string;
}

const extractBearerToken = (req: Request): string => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        throw AppError.unauthorized("Missing authorization token");
    }
    return header.slice(7);
};

const resolveSupabaseUid = async (token: string): Promise<string | null> => {
    try {
        const payload = jwt.verify(token, config.jwtSecret) as LocalJwtPayload;
        return payload.sub;
    } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
            throw AppError.unauthorized("Access token expired", {
                code: "TOKEN_EXPIRED",
            });
        }
    }

    const {
        data: { user },
        error,
    } = await supabaseAuth.auth.getUser(token);

    if (!error && user) {
        return user.id;
    }

    if (
        error?.message?.toLowerCase().includes("expired") ||
        error?.message?.toLowerCase().includes("invalid token")
    ) {
        throw AppError.unauthorized("Access token expired", {
            code: "TOKEN_EXPIRED",
        });
    }

    if (error) {
        logger.error(
            { message: error.message, status: error.status },
            "Supabase getUser returned unexpected error",
        );
    }

    return null;
};

export const authenticate = async (
    req: Request,
    _res: Response,
    next: NextFunction,
) => {
    const token = extractBearerToken(req);

    const supabaseUid = await resolveSupabaseUid(token);
    if (!supabaseUid) {
        throw AppError.unauthorized("Invalid or expired token");
    }

    const employee = await employeeRepository.findBySupabaseUid(supabaseUid);
    if (!employee) {
        throw AppError.unauthorized("Employee not found");
    }
    if (!employee.isActive) {
        throw AppError.unauthorized("Employee account is inactive");
    }

    req.employee = {
        id: employee.id,
        role: employee.role,
        name: employee.name,
        supabaseUid: employee.supabaseUid,
    };

    next();
};

export const requireRole =
    (...roles: EmployeeRole[]) =>
    (req: Request, _res: Response, next: NextFunction) => {
        if (!req.employee) {
            throw AppError.unauthorized("Authentication required");
        }

        if (!roles.includes(req.employee.role)) {
            throw AppError.forbidden("Insufficient permissions");
        }

        next();
    };
