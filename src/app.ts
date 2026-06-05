import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";

import routes from "./routes/index.ts";
import { errorHandler, notFound } from "./middlewares/index.ts";
import { logger } from "./utils/logger.ts";
import { config } from "./config/index.ts";

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

app.use(notFound);
app.use(errorHandler);

export default app;
