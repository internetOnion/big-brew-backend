import type { Request, Response } from "express";
import { menuItemService } from "../services/menuItem.service";

export class MenuItemController {
    async getMenuItems(req: Request, res: Response) {
        const menuItems = await menuItemService.getMenuItems();
        return res.json({ data: menuItems });
    }

    async addMenuItem(req: Request, res: Response) {
        const newMenuItem = await menuItemService.addMenuItem(req.body);
        return res.status(201).json({ data: newMenuItem });
    }

    async updateMenuItem(req: Request, res: Response) {
        const id = req.params.id as string;
        const updatedMenuItem = await menuItemService.updateMenuItem(
            id,
            req.body,
        );
        return res.json({ data: updatedMenuItem });
    }

    async deleteMenuItem(req: Request, res: Response) {
        const id = req.params.id as string;
        await menuItemService.deleteMenuItem(id);
        return res.status(204).send();
    }
}

export const menuItemController = new MenuItemController();
