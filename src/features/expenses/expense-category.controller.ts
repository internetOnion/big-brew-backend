import type { Request, Response } from "express";
import { expenseCategoryService } from "./expense-category.service.ts";

export class ExpenseCategoryController {
    async listCategories(req: Request, res: Response) {
        const categories = await expenseCategoryService.listCategories();
        return res.json(categories);
    }

    async getCategory(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const category = await expenseCategoryService.getCategory(id);
        return res.json(category);
    }

    async createCategory(req: Request, res: Response) {
        const { name } = req.body;
        const category = await expenseCategoryService.createCategory(name);
        return res.status(201).json(category);
    }

    async updateCategory(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const { name } = req.body;
        const category = await expenseCategoryService.updateCategory(id, name);
        return res.json(category);
    }

    async deleteCategory(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        await expenseCategoryService.deleteCategory(id);
        return res.status(204).send();
    }
}

export const expenseCategoryController = new ExpenseCategoryController();
