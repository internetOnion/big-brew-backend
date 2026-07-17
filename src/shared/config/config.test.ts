import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

vi.mock("dotenv", () => ({
    default: { config: vi.fn() },
    config: vi.fn(),
}));

describe("validateConfig", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.resetModules();
        process.env = { ...originalEnv };
        delete process.env.JWT_SECRET;
        delete process.env.NEON_DATABASE_URL;
        delete process.env.SUPABASE_URL;
        delete process.env.SUPABASE_SECRET_KEY;
        delete process.env.CLERK_SECRET_KEY;
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it("does not throw when all required env vars are set", async () => {
        process.env.JWT_SECRET = "test-secret";
        process.env.NEON_DATABASE_URL = "postgresql://test:test@localhost/test";
        process.env.SUPABASE_URL = "https://test.supabase.co";
        process.env.SUPABASE_SECRET_KEY = "test-key";
        process.env.CLERK_SECRET_KEY = "sk_test";

        const { validateConfig } = await import("../../shared/config/index.ts");
        expect(() => validateConfig()).not.toThrow();
    });

    it("throws MissingEnvVarError when JWT_SECRET is missing", async () => {
        process.env.NEON_DATABASE_URL = "postgresql://test:test@localhost/test";
        process.env.SUPABASE_URL = "https://test.supabase.co";
        process.env.SUPABASE_SECRET_KEY = "test-key";
        process.env.CLERK_SECRET_KEY = "sk_test";

        const { validateConfig, MissingEnvVarError } =
            await import("../../shared/config/index.ts");

        expect(() => validateConfig()).toThrow(MissingEnvVarError);
        expect(() => validateConfig()).toThrow("JWT_SECRET");
    });

    it("throws MissingEnvVarError when NEON_DATABASE_URL is missing", async () => {
        process.env.JWT_SECRET = "test-secret";
        process.env.SUPABASE_URL = "https://test.supabase.co";
        process.env.SUPABASE_SECRET_KEY = "test-key";
        process.env.CLERK_SECRET_KEY = "sk_test";

        const { validateConfig, MissingEnvVarError } =
            await import("../../shared/config/index.ts");

        expect(() => validateConfig()).toThrow(MissingEnvVarError);
        expect(() => validateConfig()).toThrow("NEON_DATABASE_URL");
    });

    it("throws MissingEnvVarError when SUPABASE_URL is missing", async () => {
        process.env.JWT_SECRET = "test-secret";
        process.env.NEON_DATABASE_URL = "postgresql://test:test@localhost/test";
        process.env.SUPABASE_SECRET_KEY = "test-key";
        process.env.CLERK_SECRET_KEY = "sk_test";

        const { validateConfig, MissingEnvVarError } =
            await import("../../shared/config/index.ts");

        expect(() => validateConfig()).toThrow(MissingEnvVarError);
        expect(() => validateConfig()).toThrow("SUPABASE_URL");
    });
});
