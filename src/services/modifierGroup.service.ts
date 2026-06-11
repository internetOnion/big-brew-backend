import { modifierGroupRepository } from "../repositories/modifierGroup.repository.ts";
import { AppError } from "../utils/AppError.ts";
import {
    formatModifierGroup,
    type ModifierGroupResponse,
} from "../utils/formatModifierGroup.ts";
import type {
    InsertModifierGroup,
    UpdateModifierGroup,
} from "../repositories/modifierGroup.repository.ts";

export class ModifierGroupService {
    async getModifierGroups(): Promise<ModifierGroupResponse[]> {
        try {
            const modifierGroups = await modifierGroupRepository.findAll();
            modifierGroups.sort((a, b) => a.sortOrder - b.sortOrder);
            return modifierGroups.map(formatModifierGroup);
        } catch (error) {
            throw AppError.internal("Failed to fetch modifier groups");
        }
    }

    async addModifierGroup(
        input: InsertModifierGroup,
    ): Promise<ModifierGroupResponse> {
        try {
            const newModifierGroup =
                await modifierGroupRepository.insert(input);
            return formatModifierGroup(newModifierGroup);
        } catch (error) {
            throw AppError.internal("Failed to add modifier group");
        }
    }

    async updateModifierGroup(
        id: string,
        input: UpdateModifierGroup,
    ): Promise<ModifierGroupResponse> {
        try {
            const existingModifierGroup =
                await modifierGroupRepository.findById(id);
            if (!existingModifierGroup) {
                throw AppError.notFound("Modifier group not found");
            }
            const updatedModifierGroup = await modifierGroupRepository.update(
                id,
                input,
            );
            return formatModifierGroup(updatedModifierGroup);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw AppError.internal("Failed to update modifier group");
        }
    }

    async deleteModifierGroup(id: string): Promise<void> {
        try {
            const existingModifierGroup =
                await modifierGroupRepository.findById(id);
            if (!existingModifierGroup) {
                throw AppError.notFound("Modifier group not found");
            }
            await modifierGroupRepository.delete(id);
        } catch (error) {
            throw AppError.internal("Failed to delete modifier group");
        }
    }
}

export const modifierGroupService = new ModifierGroupService();
