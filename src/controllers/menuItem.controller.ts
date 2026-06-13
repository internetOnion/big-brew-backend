import type { Request, Response } from "express";
import { menuItemService } from "../services/menuItem.service";
import { AppError } from "../utils/AppError.ts";

export class MenuItemController {
    async getMenuItems(req: Request, res: Response) {
        const menuItems = await menuItemService.getMenuItems();
        return res.json({ data: menuItems });
    }

    async getMenuItem(req: Request, res: Response) {
        const id = req.params.id as string;
        const menuItem = await menuItemService.getMenuItem(id);
        return res.json({ data: menuItem });
    }

    async addMenuItem(req: Request, res: Response) {
        const hasNestedData = req.body.recipes || req.body.modifierGroups;

        if (hasNestedData) {
            const result = await menuItemService.addMenuItemWithRelations(
                req.body,
            );
            return res.status(201).json({ data: result });
        }

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

    async uploadImage(req: Request, res: Response) {
        if (!req.file) {
            throw AppError.badRequest("No file provided");
        }

        const id = req.params.id as string;
        const result = await menuItemService.updateImage(id, req.file);
        return res.json({ data: result });
    }

    async deleteImage(req: Request, res: Response) {
        const id = req.params.id as string;
        await menuItemService.deleteImage(id);
        return res.status(204).send();
    }
}

export const menuItemController = new MenuItemController();
