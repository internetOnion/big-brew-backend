import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("../../shared/config/index.ts", () => ({
    config: {
        supabaseUrl: "https://test.supabase.co",
        supabaseSecretKey: "test-key",
        storageBucketName: "assets",
        storageMaxFileSize: 5242880,
    },
}));

import { storageService } from "./storage.service.ts";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const makeFile = (
    overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File => ({
    fieldname: "file",
    originalname: "test.jpg",
    encoding: "7bit",
    mimetype: "image/jpeg",
    size: 1024,
    buffer: Buffer.from("fake-image-data"),
    destination: "",
    filename: "",
    path: "",
    stream: null as any,
    ...overrides,
});

describe("StorageService", () => {
    beforeEach(() => vi.resetAllMocks());

    describe("upload", () => {
        it("uploads file and returns url and path", async () => {
            mockFetch.mockResolvedValue({ ok: true });

            const result = await storageService.upload(makeFile());

            expect(result.url).toContain(
                "https://test.supabase.co/storage/v1/object/public/assets/uploads/",
            );
            expect(result.path).toMatch(/^uploads\/.+\.jpg$/);
        });

        it("throws badRequest for invalid mime type", async () => {
            await expect(
                storageService.upload(
                    makeFile({ mimetype: "application/pdf" }),
                ),
            ).rejects.toThrow("Invalid file type");
        });

        it("throws badRequest for svg files (XSS surface)", async () => {
            await expect(
                storageService.upload(makeFile({ mimetype: "image/svg+xml" })),
            ).rejects.toThrow("Invalid file type");
        });

        it("throws badRequest for oversized file", async () => {
            await expect(
                storageService.upload(makeFile({ size: 10 * 1024 * 1024 })),
            ).rejects.toThrow("File exceeds 5MB size limit");
        });

        it("uses correct extension for png", async () => {
            mockFetch.mockResolvedValue({ ok: true });

            const result = await storageService.upload(
                makeFile({ mimetype: "image/png" }),
            );

            expect(result.path).toMatch(/\.png$/);
        });
    });

    describe("delete", () => {
        it("deletes file when it exists", async () => {
            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve([{ name: "test.jpg" }]),
                })
                .mockResolvedValueOnce({ ok: true });

            await storageService.delete("uploads/test.jpg");

            expect(mockFetch).toHaveBeenCalledTimes(2);
        });

        it("throws notFound when file does not exist", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([]),
            });

            await expect(
                storageService.delete("uploads/missing.jpg"),
            ).rejects.toThrow("File not found");
        });
    });

    describe("fileExists", () => {
        it("returns true when file found", async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve([
                        { name: "test.jpg" },
                        { name: "other.jpg" },
                    ]),
            });

            const result = await storageService.fileExists("uploads/test.jpg");

            expect(result).toBe(true);
        });

        it("returns false when file not found", async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve([{ name: "other.jpg" }]),
            });

            const result = await storageService.fileExists(
                "uploads/missing.jpg",
            );

            expect(result).toBe(false);
        });
    });

    describe("parseStoragePath", () => {
        it("extracts path from valid URL", () => {
            const url =
                "https://test.supabase.co/storage/v1/object/public/assets/uploads/test.jpg";

            const result = storageService.parseStoragePath(url);

            expect(result).toBe("uploads/test.jpg");
        });

        it("throws badRequest for invalid URL", () => {
            expect(() =>
                storageService.parseStoragePath("https://other.com/foo"),
            ).toThrow(
                "URL does not match the expected Supabase Storage format",
            );
        });

        it("throws badRequest for path not starting with uploads/", () => {
            const url =
                "https://test.supabase.co/storage/v1/object/public/assets/other/test.jpg";

            expect(() => storageService.parseStoragePath(url)).toThrow(
                "Invalid storage path",
            );
        });

        it("throws badRequest for path containing ..", () => {
            const url =
                "https://test.supabase.co/storage/v1/object/public/assets/uploads/../etc/passwd";

            expect(() => storageService.parseStoragePath(url)).toThrow(
                "Invalid storage path",
            );
        });
    });

    describe("getPublicUrl", () => {
        it("constructs correct URL", () => {
            const result = storageService.getPublicUrl("uploads/test.jpg");

            expect(result).toBe(
                "https://test.supabase.co/storage/v1/object/public/assets/uploads/test.jpg",
            );
        });
    });
});
