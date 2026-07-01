import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.ts";
import { logger } from "../utils/logger.ts";

const pool = new pg.Pool({
    connectionString: process.env.SUPABASE_DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

pool.on("error", (err) => {
    logger.error(err, "Unexpected pool client error");
});

export const db = drizzle({ client: pool, schema });
export { pool };
