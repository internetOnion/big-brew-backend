import { Request, Response } from "express";
import { menuItemService } from "../services/menuItem.service";

export class MenuItemController {
    async getMenuItems(req: Request, res: Response) {
        const menuItems = await menuItemService.getMenuItems();
        res.json({ data: menuItems });
    }

    async addMenuItem(req: Request, res: Response) {
        const { categoryId, name, basePrice, isAvailable, imageUrl } = req.body;
        const newMenuItem = await menuItemService.addMenuItem({ categoryId, name, basePrice, isAvailable, imageUrl });
        res.status(201).json({data: newMenuItem});
    }

    async updateMenuItem(req: Request, res: Response) {
        const id = req.params.id as string;
        const { categoryId, name, basePrice, isAvailable, imageUrl } = req.body;
        const updatedMenuItem = await menuItemService.updateMenuItem(id, { categoryId, name, basePrice, isAvailable, imageUrl });
        res.json({ data: updatedMenuItem });
    }

    async deleteMenuItem(req: Request, res: Response) {
        const id = req.params.id as string;
        await menuItemService.deleteMenuItem(id);
        res.status(204).send();
    }
}

export const menuItemController = new MenuItemController();