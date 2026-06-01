import app from "./app.ts";
import { logger } from "./utils/logger.ts";
import { config } from "./config/index.ts";

app.listen(config.port, () => {
    logger.info(`Server running on http://localhost:${config.port}`);
});
