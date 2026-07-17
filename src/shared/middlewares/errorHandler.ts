import type { Request, Response, NextFunction } from "express";

import { AppError } from "../utils/AppError.ts";
import { logger } from "../utils/logger.ts";

export const errorHandler = (
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction,
) => {
    if (res.headersSent) {
        return _next(err);
    }

    if (err instanceof AppError) {
        const details = err.details as Record<string, unknown> | undefined;
        if (err.statusCode === 429 && details?.retryAfter) {
            res.setHeader("Retry-After", String(details.retryAfter));
        }
        return res.status(err.statusCode).json({
            error: err.message,
            ...(err.details !== undefined && { details: err.details }),
        });
    }

    if (err.name === "MulterError") {
        return res.status(400).json({ error: err.message });
    }

    logger.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
};
