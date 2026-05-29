import express from "express";
import cors from "cors";
import { pinoHttp } from "pino-http";

import routes from "./routes/index.ts";
import { errorHandler, notFound } from "./middlewares/index.ts";
import { logger } from "./utils/logger.ts";

const app = express();

app.use(pinoHttp({ logger }));
app.use(cors());
app.use(express.json());

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

export default app;
