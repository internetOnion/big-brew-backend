import app from "./app.ts";
import { logger } from "./shared/utils/logger.ts";
import { config } from "./shared/config/index.ts";
import { pool } from "./shared/models/index.ts";

const server = app.listen(config.port, () => {
    logger.info(`Server running on http://localhost:${config.port}`);
});

server.timeout = 30000;

server.on("error", (err) => {
    logger.error(err, "Server failed to start");
    process.exit(1);
});

const shutdown = (signal: string, error?: Error) => {
    if (error) {
        logger.error(error, `Shutting down due to ${signal}`);
    } else {
        logger.info(`Received ${signal}, shutting down gracefully`);
    }

    server.close(() => {
        logger.info("HTTP server closed");
        pool.end().then(() => {
            logger.info("DB pool drained");
            process.exit(error ? 1 : 0);
        });
    });

    setTimeout(() => {
        logger.error("Forced shutdown after timeout");
        process.exit(1);
    }, 10000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("uncaughtException", (err) => {
    logger.error(err, "Uncaught exception");
    shutdown("uncaughtException", err);
});

process.on("unhandledRejection", (reason) => {
    logger.error(reason as Error, "Unhandled rejection");
    shutdown(
        "unhandledRejection",
        reason instanceof Error ? reason : new Error(String(reason)),
    );
});
