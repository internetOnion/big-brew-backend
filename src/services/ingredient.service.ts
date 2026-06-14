import { eq } from "drizzle-orm";
import { db } from "../models/index.ts";
import {
    ingredientsTable,
    stockMovementsTable,
} from "../models/schema/index.ts";
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
import type { StockReason } from "../types/index.ts";

type IngredientResponse = Omit<Ingredient, "createdAt" | "updatedAt">;

export class IngredientService {
    async getIngredient(): Promise<IngredientResponse[]> {
        try {
            const ingredients = await ingredientRepository.findAll();
            return ingredients.map(formatIngredient);
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
        try {
            const existingIngredient = await ingredientRepository.findById(id);
            if (!existingIngredient) {
                throw AppError.notFound("Ingredient not found");
            }

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
            if (error instanceof AppError) {
                throw error;
            }
            throw AppError.internal("Failed to delete ingredient");
        }
    }

    async adjustStock(
        id: string,
        quantityChange: number,
        reason: StockReason,
        notes: string | undefined,
        recordedBy: string,
    ): Promise<IngredientResponse> {
        const existingIngredient = await ingredientRepository.findById(id);
        if (!existingIngredient) {
            throw AppError.notFound("Ingredient not found");
        }

        const currentStock = parseFloat(existingIngredient.stockQuantity);
        const newStock = currentStock + quantityChange;

        if (newStock < 0) {
            throw AppError.badRequest(
                `Insufficient stock. Current: ${currentStock}, adjustment: ${quantityChange}`,
            );
        }

        await db.transaction(async (tx) => {
            await tx.insert(stockMovementsTable).values({
                ingredientId: id,
                quantityChange: quantityChange.toFixed(2),
                reason,
                notes: notes ?? null,
            });

            await tx
                .update(ingredientsTable)
                .set({
                    stockQuantity: newStock.toFixed(2),
                    updatedAt: new Date(),
                })
                .where(eq(ingredientsTable.id, id));
        });

        const updated = await ingredientRepository.findById(id);
        return formatIngredient(updated!);
    }
}

export const ingredientService = new IngredientService();
