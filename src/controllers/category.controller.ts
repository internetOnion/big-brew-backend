import { categoryService } from "../services/category.service";
import { Request, Response } from "express";

export class CategoryController {
    async getCategory(req: Request, res: Response) {
        const categories = await categoryService.getCategories();
        return res.json(categories);
    }

    async addCategory(req: Request, res: Response) {
        const { name, sortOrder } = req.body;
        const newCategory = await categoryService.addCategory({
            name,
            sortOrder,
        });
        return res.status(201).json(newCategory);
    }

    async updateCategory(req: Request, res: Response) {
        const id = req.params.id as string;
        const { name, sortOrder } = req.body;
        const updatedCategory = await categoryService.updateCategory(id, {
            name,
            sortOrder,
        });
        return res.json(updatedCategory);
    }

    async deleteCategory(req: Request, res: Response) {
        const id = req.params.id as string;
        await categoryService.deleteCategory(id);
        return res.status(204).send();
    }
}

export const categoryController = new CategoryController();

