import { Request, Response, NextFunction } from "express";
import { ZodTypeAny } from "zod";
import { AppError } from "../util/AppError.ts";
import { logger } from "../util/logger.ts";

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

export const errorHandler = (
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction,
) => {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            error: err.message,
            ...(err.details !== undefined && { details: err.details }),
        });
    }

    logger.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
};

export const notFound = (_req: Request, res: Response) => {
    return res.status(404).json({ error: "Not Found" });
};
