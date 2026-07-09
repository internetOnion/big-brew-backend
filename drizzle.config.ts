import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: "./src/shared/models/schema/index.ts",
    out: "./src/shared/models/migrations",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.NEON_DATABASE_URL!,
    },
});
