import { Request, Response } from "express";
import { ingredientService } from "../services/ingredient.service";

export class IngredientController {
    async getIngredient(req: Request, res: Response) {
        const ingredients = await ingredientService.getIngredient();
        res.json(ingredients);
    }

    async addIngredient(req: Request, res: Response) {
        const { name, unit, stockQuantity, lowStockThreshold } = req.body;
        const newIngredient = await ingredientService.addIngredient({
            name,
            unit,
            stockQuantity,
            lowStockThreshold,
        });
        res.status(201).json(newIngredient);
    }

    async updateIngredient(req: Request, res: Response) {
        const id = req.params.id as string;
        const { name, unit, stockQuantity, lowStockThreshold } = req.body;
        const updatedIngredient = await ingredientService.updateIngredient(id, {
            name,
            unit,
            stockQuantity,
            lowStockThreshold,
        });
        res.json(updatedIngredient);
    }

    async deleteIngredient(req: Request, res: Response) {
        const id = req.params.id as string;
        await ingredientService.deleteIngredient(id);
        res.status(204).send();
    }

    async adjustStock(req: Request, res: Response) {
        const id = req.params.id as string;
        const { quantityChange, reason, notes } = req.body;
        const recordedBy = req.employee!.id;

        const ingredient = await ingredientService.adjustStock(
            id,
            quantityChange,
            reason,
            notes,
            recordedBy,
        );

        res.json(ingredient);
    }
}

export const ingredientController = new IngredientController();
