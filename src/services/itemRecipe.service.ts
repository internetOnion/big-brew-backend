import {
    itemRecipeRepository,
    type ItemRecipe,
} from "../repositories/itemRecipe.repository.ts";
import type { InsertItemRecipe } from "../repositories/itemRecipe.repository.ts";
import { AppError } from "../utils/AppError.ts";

export class ItemRecipeService {
    async addItemRecipe(itemRecipe: InsertItemRecipe): Promise<ItemRecipe> {
        try {
            const newItemRecipe = await itemRecipeRepository.insert(itemRecipe);
            return newItemRecipe;
        } catch (error) {
            throw new Error("Failed to add item recipe");
        }
    }

    async deleteItemRecipe(id: string): Promise<void> {
        try {
            await itemRecipeRepository.delete(id);
        } catch (error) {
            throw new Error("Failed to delete item recipe");
        }
    }
}

export const itemRecipeService = new ItemRecipeService();
