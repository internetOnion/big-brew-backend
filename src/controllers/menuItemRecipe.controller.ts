import type { Request, Response } from "express";
import { menuItemRecipeService } from "../services/menuItemRecipe.service.ts";

export class MenuItemRecipeController {
    async getRecipes(req: Request, res: Response) {
        const menuItemId = req.params.menuItemId as string;
        const recipes = await menuItemRecipeService.getRecipes(menuItemId);
        res.json({ data: recipes });
    }

    async addRecipes(req: Request, res: Response) {
        const menuItemId = req.params.menuItemId as string;
        const recipes = await menuItemRecipeService.addRecipes(
            menuItemId,
            req.body,
        );
        res.status(201).json({ data: recipes });
    }

    async updateRecipe(req: Request, res: Response) {
        const menuItemId = req.params.menuItemId as string;
        const ingredientId = req.params.ingredientId as string;
        const recipe = await menuItemRecipeService.updateRecipe(
            menuItemId,
            ingredientId,
            req.body,
        );
        res.json({ data: recipe });
    }

    async deleteRecipe(req: Request, res: Response) {
        const menuItemId = req.params.menuItemId as string;
        const ingredientId = req.params.ingredientId as string;
        await menuItemRecipeService.deleteRecipe(menuItemId, ingredientId);
        res.status(204).send();
    }
}

export const menuItemRecipeController = new MenuItemRecipeController();
