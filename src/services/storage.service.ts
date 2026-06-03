import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "../lib/supabase.ts";
import { AppError } from "../utils/AppError.ts";
import { logger } from "../utils/logger.ts";
import { config } from "../config/index.ts";

const ALLOWED_MIME_TYPES = /^image\/(jpeg|png|gif|webp|svg\+xml|bmp|tiff)$/i;

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

        const { error } = await supabaseAdmin.storage
            .from(config.storageBucketName)
            .upload(storagePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false,
            });

        if (error) {
            logger.error(
                { error, filename },
                "Failed to upload file to Supabase Storage",
            );
            throw AppError.internal("Failed to upload file");
        }

        const {
            data: { publicUrl },
        } = supabaseAdmin.storage
            .from(config.storageBucketName)
            .getPublicUrl(storagePath);

        return { path: storagePath, url: publicUrl };
    }

    async delete(path: string): Promise<void> {
        const exists = await this.fileExists(path);
        if (!exists) {
            throw AppError.notFound("File not found");
        }

        const { error } = await supabaseAdmin.storage
            .from(config.storageBucketName)
            .remove([path]);

        if (error) {
            logger.error(
                { error, path },
                "Failed to delete file from Supabase Storage",
            );
            throw AppError.internal("Failed to delete file");
        }
    }

    async fileExists(path: string): Promise<boolean> {
        const lastSlash = path.lastIndexOf("/");
        const folder = lastSlash === -1 ? "" : path.substring(0, lastSlash);
        const filename =
            lastSlash === -1 ? path : path.substring(lastSlash + 1);

        const { data } = await supabaseAdmin.storage
            .from(config.storageBucketName)
            .list(folder);

        return (data ?? []).some((f) => f.name === filename);
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
        return url.slice(index + prefix.length);
    }

    getPublicUrl(path: string): string {
        const {
            data: { publicUrl },
        } = supabaseAdmin.storage
            .from(config.storageBucketName)
            .getPublicUrl(path);

        return publicUrl;
    }

    private validateFile(file: Express.Multer.File) {
        if (file.size > config.storageMaxFileSize) {
            throw AppError.badRequest("File exceeds 5MB size limit");
        }

        if (!ALLOWED_MIME_TYPES.test(file.mimetype)) {
            throw AppError.badRequest(
                "Invalid file type. Allowed: JPEG, PNG, GIF, WebP, SVG, BMP, TIFF",
            );
        }
    }

    private mimeToExt(mime: string): string {
        const map: Record<string, string> = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/gif": "gif",
            "image/webp": "webp",
            "image/svg+xml": "svg",
            "image/bmp": "bmp",
            "image/tiff": "tiff",
        };
        return map[mime] ?? "jpg";
    }
}

export const storageService = new StorageService();
