import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: "./src/models/schema/index.ts",
    out: "./src/models/migrations",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.SUPABASE_DATABASE_URL!,
    },
});
