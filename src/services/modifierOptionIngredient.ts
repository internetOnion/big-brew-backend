import { modifierOptionIngredientRepository } from "../repositories/modifierOptionIngredient.repository.ts";
import { AppError } from "../utils/AppError.ts";
import type {
    InsertModifierOptionIngredient,
    UpdateModifierOptionIngredient,
} from "../repositories/modifierOptionIngredient.repository.ts";

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

export const modifierOptionIngredientService =
    new ModifierOptionIngredientService();
