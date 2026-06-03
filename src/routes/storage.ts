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

router.post("/upload", upload.single("file"), (req: Request, res: Response) =>
    storageController.upload(req, res),
);

router.delete("/", validateBody(deleteSchema), (req: Request, res: Response) =>
    storageController.delete(req, res),
);

export default router;
