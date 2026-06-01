import { AppError } from "../utils/AppError.ts";
import {
    settingsRepository,
    type Settings,
    type UpdateSettings,
} from "../repositories/index.ts";

export class SettingsService {
    async getSettings(): Promise<Settings> {
        const settings = await settingsRepository.find();
        if (!settings) {
            throw AppError.notFound("Settings not found");
        }
        return settings;
    }

    async updateSettings(data: UpdateSettings): Promise<Settings> {
        return settingsRepository.update(data);
    }
}

export const settingsService = new SettingsService();
