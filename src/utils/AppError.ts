export class AppError extends Error {
    readonly statusCode: number;
    readonly details?: unknown;

    private constructor(
        statusCode: number,
        message: string,
        details?: unknown,
    ) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        Object.setPrototypeOf(this, AppError.prototype);
    }

    static badRequest(message = "Bad Request", details?: unknown): AppError {
        return new AppError(400, message, details);
    }

    static unauthorized(message = "Unauthorized", details?: unknown): AppError {
        return new AppError(401, message, details);
    }

    static forbidden(message = "Forbidden", details?: unknown): AppError {
        return new AppError(403, message, details);
    }

    static notFound(message = "Not Found", details?: unknown): AppError {
        return new AppError(404, message, details);
    }

    static conflict(message = "Conflict", details?: unknown): AppError {
        return new AppError(409, message, details);
    }

    static unprocessable(
        message = "Unprocessable Entity",
        details?: unknown,
    ): AppError {
        return new AppError(422, message, details);
    }

    static internal(
        message = "Internal Server Error",
        details?: unknown,
    ): AppError {
        return new AppError(500, message, details);
    }
}
