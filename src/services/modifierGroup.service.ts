import {
    modifierGroupRepository,
    modifierOptionRepository,
    modifierOptionIngredientRepository,
} from "../repositories/index.ts";
import type {
    InsertModifierGroup,
    UpdateModifierGroup,
    InsertModifierOption,
    UpdateModifierOption,
    InsertModifierOptionIngredient,
    UpdateModifierOptionIngredient,
} from "../repositories/index.ts";
import { AppError } from "../utils/AppError.ts";
import {
    formatModifierGroup,
    type ModifierGroupResponse,
} from "../utils/formatModifierGroup.ts";
import {
    formatModifierOption,
    type ModifierOptionResponse,
} from "../utils/formatModifierOption.ts";

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

export class ModifierOptionService {
    async getModifierOptionsByGroupId(
        modifierGroupId: string,
    ): Promise<ModifierOptionResponse[]> {
        try {
            const modifierOptions =
                await modifierOptionRepository.findByModifierGroupId(
                    modifierGroupId,
                );
            modifierOptions.sort((a, b) => a.sortOrder - b.sortOrder);
            return modifierOptions.map(formatModifierOption);
        } catch (error) {
            throw AppError.internal("Failed to fetch modifier options");
        }
    }

    async addModifierOption(
        input: InsertModifierOption,
    ): Promise<ModifierOptionResponse> {
        try {
            const newModifierOption =
                await modifierOptionRepository.insert(input);
            return formatModifierOption(newModifierOption);
        } catch (error) {
            throw AppError.internal("Failed to add modifier option");
        }
    }

    async updateModifierOption(
        id: string,
        input: UpdateModifierOption,
    ): Promise<ModifierOptionResponse> {
        try {
            const existingModifierOption =
                await modifierOptionRepository.findById(id);
            if (!existingModifierOption) {
                throw AppError.notFound("Modifier option not found");
            }
            const updatedModifierOption = await modifierOptionRepository.update(
                id,
                input,
            );
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
            const existingModifierOption =
                await modifierOptionRepository.findById(id);
            if (!existingModifierOption) {
                throw AppError.notFound("Modifier option not found");
            }
            await modifierOptionRepository.delete(id);
        } catch (error) {
            throw AppError.internal("Failed to delete modifier option");
        }
    }
}

export class ModifierOptionIngredientService {
    async addModifierOptionIngredient(input: InsertModifierOptionIngredient) {
        try {
            const newModifierOptionIngredient =
                await modifierOptionIngredientRepository.insert(input);
            return newModifierOptionIngredient;
        } catch (error) {
            throw AppError.internal("Failed to add modifier option ingredient");
        }
    }

    async updateModifierOptionIngredient(
        id: string,
        input: UpdateModifierOptionIngredient,
    ) {
        try {
            const existingModifierOptionIngredient =
                await modifierOptionIngredientRepository.findById(id);
            if (!existingModifierOptionIngredient) {
                throw AppError.notFound("Modifier option ingredient not found");
            }
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw AppError.internal(
                "Failed to update modifier option ingredient",
            );
        }
        try {
            const updatedModifierOptionIngredient =
                await modifierOptionIngredientRepository.update(id, input);
            return updatedModifierOptionIngredient;
        } catch (error) {
            throw AppError.internal(
                "Failed to update modifier option ingredient",
            );
        }
    }
}

export const modifierGroupService = new ModifierGroupService();
export const modifierOptionService = new ModifierOptionService();
export const modifierOptionIngredientService =
    new ModifierOptionIngredientService();
