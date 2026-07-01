import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";

import routes from "./features/index.ts";
import { errorHandler, notFound } from "./shared/middlewares/index.ts";
import { logger } from "./shared/utils/logger.ts";
import { config } from "./shared/config/index.ts";
import { swaggerDocs } from "./shared/utils/swagger.ts";

const app = express();

const allowedOrigins = config.corsOrigin.split(",").map((s) => s.trim());

app.use(pinoHttp({ logger }));
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
app.use(express.json());
app.use(cookieParser());

app.use("/api", routes);

swaggerDocs(app, config.port);

app.use(notFound);
app.use(errorHandler);

export default app;
