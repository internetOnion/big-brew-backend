import {
    ingredientRepository,
    type Ingredient,
} from "../repositories/ingredient.respository.ts";
import { formatIngredient } from "../utils/formatIngredient.ts";
import type {
    InsertIngredient,
    UpdateIngredient,
} from "../repositories/ingredient.respository.ts";
import { AppError } from "../utils/AppError.ts";

type IngredientResponse = Omit<Ingredient, "createdAt" | "updatedAt">;

export class IngredientService {
    async getIngredient(): Promise<IngredientResponse[]> {
        try {
            const ingredients = await ingredientRepository.findAll();
            return ingredients.map(formatIngredient);
        } catch (error) {
        } catch (error) {
            throw AppError.internal("Failed to fetch ingredients");
        }
    }

    async addIngredient(input: InsertIngredient): Promise<IngredientResponse> {
        try {
            const newIngredient = await ingredientRepository.insert(input);
            return formatIngredient(newIngredient);
        } catch (error) {
            throw AppError.internal("Failed to add ingredient");
        }
    }

    async updateIngredient(
        id: string,
        input: UpdateIngredient,
    ): Promise<IngredientResponse> {
    async updateIngredient(
        id: string,
        input: UpdateIngredient,
    ): Promise<IngredientResponse> {
        try {
            const existingIngredient = await ingredientRepository.findById(id);
            if (!existingIngredient) {
                throw AppError.notFound("Ingredient not found");
            }

            const updatedIngredient = await ingredientRepository.update(
                id,
                input,
            );
            const updatedIngredient = await ingredientRepository.update(
                id,
                input,
            );
            return formatIngredient(updatedIngredient);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw AppError.internal("Failed to update ingredient");
        }
    }

    async deleteIngredient(id: string): Promise<void> {
        try {
            const existingIngredient = await ingredientRepository.findById(id);
            if (!existingIngredient) {
                throw AppError.notFound("Ingredient not found");
            }
            await ingredientRepository.delete(id);
        } catch (error) {
            throw AppError.internal("Failed to delete ingredient");
        }
    }
}

export const ingredientService = new IngredientService();

