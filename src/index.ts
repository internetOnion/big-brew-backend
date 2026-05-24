import "dotenv/config";
import express from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import routes from "./routes/index.ts";
import { errorHandler, notFound } from "./middleware/index.ts";
import { logger } from "./util/logger.ts";

const app = express();
const port = process.env.PORT ?? 3000;

app.use(pinoHttp({ logger }));
app.use(cors());
app.use(express.json());

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

app.listen(port, () => {
    logger.info(`Server running on http://localhost:${port}`);
});
