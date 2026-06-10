import { modifierOptionRepository } from "../repositories/modifierOption.repository.ts";
import { AppError } from "../utils/AppError.ts";
import { formatModifierOption, type ModifierOptionResponse } from "../utils/formatModifierOption.ts";
import type { InsertModifierOption, UpdateModifierOption } from "../repositories/modifierOption.repository.ts";

export class ModifierOptionService {
    async getModifierOptionsByGroupId(modifierGroupId: string): Promise<ModifierOptionResponse[]> {
        try {
            const modifierOptions = await modifierOptionRepository.findByModifierGroupId(modifierGroupId);
            modifierOptions.sort((a, b) => a.sortOrder - b.sortOrder);
            return modifierOptions.map(formatModifierOption);
        } catch (error) {
            throw AppError.internal("Failed to fetch modifier options");
        }
    }

    async addModifierOption(input: InsertModifierOption): Promise<ModifierOptionResponse> {
        try {
            const newModifierOption = await modifierOptionRepository.insert(input);
            return formatModifierOption(newModifierOption);
        } catch (error) {
            throw AppError.internal("Failed to add modifier option");
        }
    }

    async updateModifierOption(id: string, input: UpdateModifierOption): Promise<ModifierOptionResponse> {
        try {
            const existingModifierOption = await modifierOptionRepository.findById(id);
            if (!existingModifierOption) {
                throw AppError.notFound("Modifier option not found");
            }
            const updatedModifierOption = await modifierOptionRepository.update(id, input);
            return formatModifierOption(updatedModifierOption);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw AppError.internal("Failed to update modifier option");
        }
    }

    async deleteModifierOption(id: string): Promise<void> {
        try {
            const existingModifierOption = await modifierOptionRepository.findById(id);
            if (!existingModifierOption) {
                throw AppError.notFound("Modifier option not found");
            }
            await modifierOptionRepository.delete(id);
        } catch (error) {
            throw AppError.internal("Failed to delete modifier option");
        }
    }
}

export const modifierOptionService = new ModifierOptionService();
