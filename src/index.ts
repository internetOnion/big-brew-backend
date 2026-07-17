import app from "./app.ts";
import { logger } from "./shared/utils/logger.ts";
import { config, validateConfig } from "./shared/config/index.ts";
import { pool } from "./shared/models/index.ts";

try {
    validateConfig();
} catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
}

const server = app.listen(config.port, () => {
    logger.info(`Server running on http://localhost:${config.port}`);
});

server.timeout = 30000;
server.headersTimeout = 61000;
server.keepAliveTimeout = 65000;

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

// uncaughtException: exit immediately — process is in an undefined state
process.on("uncaughtException", (err) => {
    logger.fatal(err, "Uncaught exception — exiting immediately");
    process.exit(1);
});

// unhandledRejection: graceful shutdown — promise chains may still be resolvable
process.on("unhandledRejection", (reason) => {
    logger.error(reason as Error, "Unhandled rejection");
    shutdown(
        "unhandledRejection",
        reason instanceof Error ? reason : new Error(String(reason)),
    );
});
