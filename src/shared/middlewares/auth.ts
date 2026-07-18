import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../utils/AppError.ts";
import { config } from "../config/index.ts";
import { employeeRepository } from "../../features/employees/employee.repository.ts";
import { terminalRepository } from "../../features/terminals/terminal.repository.ts";
import type { EmployeeRole } from "../types/index.ts";

interface EmployeeJwtPayload {
    sub: string;
    role: EmployeeRole;
    employeeId: string;
}

interface TerminalJwtPayload {
    sub: string;
    terminalId: string;
}

const extractBearerToken = (req: Request): string => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        throw AppError.unauthorized("Missing authorization token");
    }
    return header.slice(7);
};

export const authenticate = async (
    req: Request,
    _res: Response,
    next: NextFunction,
) => {
    const token = extractBearerToken(req);

    let payload: EmployeeJwtPayload | TerminalJwtPayload;
    try {
        payload = jwt.verify(token, config.jwtSecret) as
            | EmployeeJwtPayload
            | TerminalJwtPayload;
    } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
            throw AppError.unauthorized("Access token expired", {
                code: "TOKEN_EXPIRED",
            });
        }
        throw AppError.unauthorized("Invalid or expired token");
    }

    // Terminal JWT
    if ("terminalId" in payload) {
        const terminal = await terminalRepository.findById(payload.terminalId);
        if (!terminal) {
            throw AppError.unauthorized("Terminal not found");
        }
        if (!terminal.isActive) {
            throw AppError.unauthorized("Terminal is inactive");
        }
        req.terminal = {
            id: terminal.id,
            name: terminal.name,
            isActive: terminal.isActive,
        };
        return next();
    }

    // Employee JWT
    const employee = await employeeRepository.findById(payload.employeeId);
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
        clerkUserId: employee.clerkUserId,
        isActive: employee.isActive,
    };

    next();
};

// ponytail: terminals aren't employees but need POS-endpoint access.
// Pass "terminal" in the role list to allow them through.
type AllowedRole = EmployeeRole | "terminal";

export const requireRole =
    (...roles: AllowedRole[]) =>
    (req: Request, _res: Response, next: NextFunction) => {
        if (req.terminal) {
            if (roles.includes("terminal" as AllowedRole)) return next();
            throw AppError.forbidden("Insufficient permissions");
        }

        if (!req.employee) {
            throw AppError.unauthorized("Authentication required");
        }

        if (!roles.includes(req.employee.role)) {
            throw AppError.forbidden("Insufficient permissions");
        }

        next();
    };
