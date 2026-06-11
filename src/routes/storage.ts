import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import type { Request, Response } from "express";

import { validateBody } from "../middlewares/index.ts";
import { storageController } from "../controllers/index.ts";
import { AppError } from "../utils/AppError.ts";
import { config } from "../config/index.ts";

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.storageMaxFileSize },
    fileFilter: (_req, file, cb) => {
        const allowed = /^image\/(jpeg|png|gif|webp|svg\+xml|bmp|tiff)$/i;
        if (allowed.test(file.mimetype)) {
            cb(null, true);
        } else {
            cb(
                AppError.badRequest(
                    "Invalid file type. Allowed: JPEG, PNG, GIF, WebP, SVG, BMP, TIFF",
                ),
            );
        }
    },
});

const deleteSchema = z
    .object({
        path: z.string().min(1),
    })
    .strict();

/**
 * @openapi
 * /api/storage/upload:
 *   post:
 *     tags: [Storage]
 *     summary: Upload a file to storage
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Image file (JPEG, PNG, GIF, WebP, SVG, BMP, TIFF) up to 5 MB
 *     responses:
 *       200:
 *         description: File uploaded, returns public URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *       400:
 *         description: Invalid file type or size
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 */
router.post("/upload", upload.single("file"), (req: Request, res: Response) =>
    storageController.upload(req, res),
);

/**
 * @openapi
 * /api/storage:
 *   delete:
 *     tags: [Storage]
 *     summary: Delete a file from storage
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [path]
 *             properties:
 *               path:
 *                 type: string
 *                 minLength: 1
 *     responses:
 *       200:
 *         description: File deleted
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 */
router.delete("/", validateBody(deleteSchema), (req: Request, res: Response) =>
    storageController.delete(req, res),
);

export default router;
