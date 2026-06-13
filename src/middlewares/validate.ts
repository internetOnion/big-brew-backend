import { ZodTypeAny } from "zod";
import type { NextFunction, Request, Response } from "express";

import { AppError } from "../utils/AppError";

const createValidator = (target: "body" | "params" | "query") => {
    return (schema: ZodTypeAny) => {
        return (req: Request, res: Response, next: NextFunction) => {
            const parsed = schema.safeParse(req[target]);
            if (!parsed.success) {
                throw AppError.badRequest(
                    "Validation failed",
                    parsed.error.flatten(),
                );
            }
            Object.defineProperty(req, target, {
                value: parsed.data,
                writable: true,
                configurable: true,
                enumerable: true,
            });
            next();
        };
    };
};

export const validateBody = createValidator("body");
export const validateParams = createValidator("params");
export const validateQuery = createValidator("query");
