import {
    itemRecipeRepository,
    type ItemRecipe,
} from "./itemRecipe.repository.ts";
import type { InsertItemRecipe } from "./itemRecipe.repository.ts";
import { AppError } from "../../../shared/utils/AppError.ts";

export class ItemRecipeService {
    async addItemRecipe(itemRecipe: InsertItemRecipe): Promise<ItemRecipe> {
        try {
            const newItemRecipe = await itemRecipeRepository.insert(itemRecipe);
            return newItemRecipe;
        } catch (error) {
            throw AppError.internal("Failed to add item recipe");
        }
    }

    async deleteItemRecipe(id: string): Promise<void> {
        try {
            await itemRecipeRepository.delete(id);
        } catch (error) {
            throw AppError.internal("Failed to delete item recipe");
        }
    }
}

export const itemRecipeService = new ItemRecipeService();
