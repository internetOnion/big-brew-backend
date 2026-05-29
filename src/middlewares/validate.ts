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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (req as any)[target] = parsed.data;
            next();
        };
    };
};

export const validateBody = createValidator("body");
export const validateParams = createValidator("params");
export const validateQuery = createValidator("query");
