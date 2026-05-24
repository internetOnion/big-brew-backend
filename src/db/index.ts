import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.ts";

const pool = new pg.Pool({
    connectionString: process.env.SUPABASE_DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

export const db = drizzle({ client: pool, schema });
export { pool };
