import { itemRecipeRepository } from "../repositories/index.ts";
import { ingredientRepository } from "../repositories/ingredient.respository.ts";
import { AppError } from "../utils/AppError.ts";
import type {
    InsertItemRecipe,
    UpdateItemRecipe,
    ItemRecipe,
} from "../repositories/index.ts";

export class MenuItemRecipeService {
    async getRecipes(menuItemId: string): Promise<ItemRecipe[]> {
        return await itemRecipeRepository.findByItemId(menuItemId);
    }

    async addRecipes(
        menuItemId: string,
        inputs: { ingredientId: string; quantity: string }[],
    ): Promise<ItemRecipe[]> {
        for (const input of inputs) {
            const ingredient = await ingredientRepository.findById(
                input.ingredientId,
            );
            if (!ingredient) {
                throw AppError.badRequest(
                    `Ingredient not found: ${input.ingredientId}`,
                );
            }
        }

        const recipes: InsertItemRecipe[] = inputs.map((input) => ({
            itemId: menuItemId,
            ingredientId: input.ingredientId,
            quantity: input.quantity,
        }));

        return await itemRecipeRepository.insertMany(recipes);
    }

    async updateRecipe(
        menuItemId: string,
        ingredientId: string,
        input: UpdateItemRecipe,
    ): Promise<ItemRecipe> {
        const recipe = await itemRecipeRepository.findByItemIdAndIngredientId(
            menuItemId,
            ingredientId,
        );
        if (!recipe || !recipe.id) {
            throw AppError.notFound(
                `Recipe not found for ingredient: ${ingredientId}`,
            );
        }

        return await itemRecipeRepository.update(recipe.id, input);
    }

    async deleteRecipe(
        menuItemId: string,
        ingredientId: string,
    ): Promise<void> {
        const recipe = await itemRecipeRepository.findByItemIdAndIngredientId(
            menuItemId,
            ingredientId,
        );
        if (!recipe || !recipe.id) {
            throw AppError.notFound(
                `Recipe not found for ingredient: ${ingredientId}`,
            );
        }

        await itemRecipeRepository.delete(recipe.id);
    }
}

export const menuItemRecipeService = new MenuItemRecipeService();
