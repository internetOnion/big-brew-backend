import type { Request, Response } from "express";
import { settingsService } from "../services/index.ts";

export class SettingsController {
    async getSettings(_req: Request, res: Response) {
        const settings = await settingsService.getSettings();
        return res.json(settings);
    }

    async updateSettings(req: Request, res: Response) {
        const updated = await settingsService.updateSettings(req.body);
        return res.json(updated);
    }
}

export const settingsController = new SettingsController();
