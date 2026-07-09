import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../utils/AppError.ts";
import { config } from "../config/index.ts";
import { employeeRepository } from "../../features/employees/employee.repository.ts";
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

export const authenticate = async (
    req: Request,
    _res: Response,
    next: NextFunction,
) => {
    const token = extractBearerToken(req);

    let payload: LocalJwtPayload;
    try {
        payload = jwt.verify(token, config.jwtSecret) as LocalJwtPayload;
    } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
            throw AppError.unauthorized("Access token expired", {
                code: "TOKEN_EXPIRED",
            });
        }
        throw AppError.unauthorized("Invalid or expired token");
    }

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
