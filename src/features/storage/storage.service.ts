import { randomUUID } from "node:crypto";
import { AppError } from "../../shared/utils/AppError.ts";
import { logger } from "../../shared/utils/logger.ts";
import { config } from "../../shared/config/index.ts";

const ALLOWED_MIME_TYPES = /^image\/(jpeg|png|gif|webp|bmp|tiff)$/i;

const storageFetch = async (
    method: string,
    path: string,
    body?: BodyInit,
    contentType?: string,
): Promise<Response> => {
    const url = `${config.supabaseUrl}/storage/v1${path}`;
    const headers: Record<string, string> = {
        Authorization: `Bearer ${config.supabaseSecretKey}`,
        apikey: config.supabaseSecretKey,
    };
    if (contentType) headers["Content-Type"] = contentType;

    let res: Response;
    try {
        res = await fetch(url, {
            method,
            headers,
            body,
            signal: AbortSignal.timeout(15000),
        });
    } catch (err: any) {
        if (err.name === "TimeoutError" || err.name === "AbortError") {
            throw AppError.gatewayTimeout("Storage request timed out");
        }
        throw AppError.internal("Storage request failed", {
            upstream: err.message,
        });
    }

    if (!res.ok && method !== "HEAD") {
        const text = await res.text().catch(() => "");
        throw AppError.internal(`Storage ${method} failed`, {
            upstream: res.status,
            message: text,
        });
    }
    return res;
};

export interface UploadResult {
    path: string;
    url: string;
}

export class StorageService {
    async upload(file: Express.Multer.File): Promise<UploadResult> {
        this.validateFile(file);

        const ext = this.mimeToExt(file.mimetype);
        const filename = `${randomUUID()}.${ext}`;
        const storagePath = `uploads/${filename}`;
        const bucket = config.storageBucketName;

        await storageFetch(
            "POST",
            `/object/${bucket}/${storagePath}`,
            new Uint8Array(file.buffer),
            file.mimetype,
        );

        const url = this.getPublicUrl(storagePath);
        return { path: storagePath, url };
    }

    async delete(path: string): Promise<void> {
        const exists = await this.fileExists(path);
        if (!exists) {
            throw AppError.notFound("File not found");
        }

        const bucket = config.storageBucketName;
        await storageFetch("DELETE", `/object/${bucket}/${path}`);
    }

    async fileExists(path: string): Promise<boolean> {
        const bucket = config.storageBucketName;
        const lastSlash = path.lastIndexOf("/");
        const folder = lastSlash === -1 ? "" : path.substring(0, lastSlash);
        const filename =
            lastSlash === -1 ? path : path.substring(lastSlash + 1);

        const res = await storageFetch(
            "POST",
            `/object/list/${bucket}`,
            JSON.stringify({ prefix: folder, limit: 1000 }),
            "application/json",
        );

        const data = await res.json().catch(() => []);
        return (Array.isArray(data) ? data : []).some(
            (f: { name: string }) => f.name === filename,
        );
    }

    parseStoragePath(url: string): string {
        const bucket = config.storageBucketName;
        const prefix = `/storage/v1/object/public/${bucket}/`;
        const index = url.indexOf(prefix);
        if (index === -1) {
            throw AppError.badRequest(
                "URL does not match the expected Supabase Storage format",
            );
        }
        const path = url.slice(index + prefix.length);
        if (!path.startsWith("uploads/") || path.includes("..")) {
            throw AppError.badRequest("Invalid storage path");
        }
        return path;
    }

    getPublicUrl(path: string): string {
        const bucket = config.storageBucketName;
        return `${config.supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
    }

    private validateFile(file: Express.Multer.File) {
        if (file.size > config.storageMaxFileSize) {
            throw AppError.badRequest("File exceeds 5MB size limit");
        }

        if (!ALLOWED_MIME_TYPES.test(file.mimetype)) {
            throw AppError.badRequest(
                "Invalid file type. Allowed: JPEG, PNG, GIF, WebP, BMP, TIFF",
            );
        }
    }

    private mimeToExt(mime: string): string {
        const map: Record<string, string> = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/gif": "gif",
            "image/webp": "webp",
            "image/bmp": "bmp",
            "image/tiff": "tiff",
        };
        return map[mime] ?? "jpg";
    }
}

export const storageService = new StorageService();
