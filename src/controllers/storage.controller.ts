import type { Request, Response } from "express";
import { storageService } from "../services/index.ts";
import { AppError } from "../utils/AppError.ts";

export class StorageController {
    async upload(req: Request, res: Response) {
        if (!req.file) {
            throw AppError.badRequest("No file provided");
        }

        const result = await storageService.upload(req.file);

        return res.json(result);
    }

    async delete(req: Request, res: Response) {
        await storageService.delete(req.body.path);
        return res.status(204).send();
    }
}

export const storageController = new StorageController();
