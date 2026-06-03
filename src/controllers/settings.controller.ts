import type { Request, Response } from "express";
import { settingsService, storageService } from "../services/index.ts";
import { AppError } from "../utils/AppError.ts";
import { logger } from "../utils/logger.ts";

export class SettingsController {
    async getSettings(_req: Request, res: Response) {
        const settings = await settingsService.getSettings();
        return res.json(settings);
    }

    async updateSettings(req: Request, res: Response) {
        const updated = await settingsService.updateSettings(req.body);
        return res.json(updated);
    }

    async deleteLogo(_req: Request, res: Response) {
        const settings = await settingsService.getSettings();
        if (!settings.logoUrl) {
            throw AppError.notFound("No logo to delete");
        }

        const path = storageService.parseStoragePath(settings.logoUrl);

        try {
            await storageService.delete(path);
        } catch (err) {
            logger.warn(
                { err, path },
                "Failed to delete logo file from storage",
            );
        }

        const updated = await settingsService.updateSettings({
            logoUrl: null,
        });
        return res.json(updated);
    }
}

export const settingsController = new SettingsController();
