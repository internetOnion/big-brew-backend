import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { pinoHttp } from "pino-http";

import routes from "./features/index.ts";
import { errorHandler, notFound } from "./shared/middlewares/index.ts";
import { logger } from "./shared/utils/logger.ts";
import { config } from "./shared/config/index.ts";
import { swaggerDocs } from "./shared/utils/swagger.ts";

const app = express();

const allowedOrigins = config.corsOrigin.split(",").map((s) => s.trim());

if (allowedOrigins.includes("*") && config.cookie.secure) {
    logger.warn(
        "CORS_ORIGIN is '*' with credentials enabled — browsers will reject cross-origin requests. Set a specific origin for production.",
    );
}

app.use(pinoHttp({ logger }));
app.use(helmet());
app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, origin);
            } else {
                callback(new Error("Not allowed by CORS"));
            }
        },
        credentials: true,
    }),
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later" },
});

app.use("/api/auth/login", authRateLimit);
app.use("/api/auth/terminal-login", authRateLimit);
app.use("/api/auth/verify-pin", authRateLimit);

app.use("/api", routes);

swaggerDocs(app, config.port);

app.use(notFound);
app.use(errorHandler);

export default app;
