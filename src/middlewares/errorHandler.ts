import type { Request, Response, NextFunction } from "express";

import { AppError } from "../utils/AppError.ts";
import { logger } from "../utils/logger.ts";

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
