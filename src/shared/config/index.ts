import dotenv from "dotenv";
dotenv.config();

export const config = {
    port: parseInt(process.env.PORT || "3000", 10),
    nodeEnv: process.env.NODE_ENV || "development",
    databaseUrl:
        process.env.NEON_DATABASE_URL ||
        "postgresql://postgres:postgres@localhost:5432/postgres",
    corsOrigin: process.env.CORS_ORIGIN || "*",
    logLevel: process.env.LOG_LEVEL || "info",
    supabaseUrl: process.env.SUPABASE_URL || "",
    supabaseSecretKey: process.env.SUPABASE_SECRET_KEY || "",
    clerkSecretKey: process.env.CLERK_SECRET_KEY || "",
    clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY || "",
    jwtSecret: process.env.JWT_SECRET || "",
    storageBucketName: process.env.STORAGE_BUCKET_NAME || "assets",
    storageMaxFileSize: parseInt(
        process.env.STORAGE_MAX_FILE_SIZE || "5242880",
        10,
    ),
    accessTokenExpiry: "15m",
    refreshTokenExpiry: "7d",
    cookie: {
        httpOnly: true as const,
        secure: process.env.COOKIE_SECURE === "false" ? false : true,
        sameSite:
            (process.env.COOKIE_SAMESITE as "strict" | "lax" | "none") ||
            "none",
        path: "/api/auth",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    },
};
