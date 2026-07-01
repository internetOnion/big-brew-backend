import type { Request, Response } from "express";
import { menuItemModifierGroupService } from "../services/menuItemModifierGroup.service.ts";

export class MenuItemModifierGroupController {
    async getGroups(req: Request, res: Response) {
        const menuItemId = req.params.menuItemId as string;
        const groups = await menuItemModifierGroupService.getGroups(menuItemId);
        return res.json({ data: groups });
    }

    async addGroup(req: Request, res: Response) {
        const menuItemId = req.params.menuItemId as string;
        const group = await menuItemModifierGroupService.addGroup(
            menuItemId,
            req.body,
        );
        return res.status(201).json({ data: group });
    }

    async updateGroup(req: Request, res: Response) {
        const menuItemId = req.params.menuItemId as string;
        const groupId = req.params.groupId as string;
        const group = await menuItemModifierGroupService.updateGroup(
            menuItemId,
            groupId,
            req.body,
        );
        return res.json({ data: group });
    }

    async deleteGroup(req: Request, res: Response) {
        const menuItemId = req.params.menuItemId as string;
        const groupId = req.params.groupId as string;
        await menuItemModifierGroupService.deleteGroup(menuItemId, groupId);
        return res.status(204).send();
    }

    async getOptions(req: Request, res: Response) {
        const groupId = req.params.groupId as string;
        const options = await menuItemModifierGroupService.getOptions(groupId);
        return res.json({ data: options });
    }

    async addOption(req: Request, res: Response) {
        const menuItemId = req.params.menuItemId as string;
        const groupId = req.params.groupId as string;
        const option = await menuItemModifierGroupService.addOption(
            menuItemId,
            groupId,
            req.body,
        );
        return res.status(201).json({ data: option });
    }

    async updateOption(req: Request, res: Response) {
        const menuItemId = req.params.menuItemId as string;
        const groupId = req.params.groupId as string;
        const optionId = req.params.optionId as string;
        const option = await menuItemModifierGroupService.updateOption(
            menuItemId,
            groupId,
            optionId,
            req.body,
        );
        return res.json({ data: option });
    }

    async deleteOption(req: Request, res: Response) {
        const menuItemId = req.params.menuItemId as string;
        const groupId = req.params.groupId as string;
        const optionId = req.params.optionId as string;
        await menuItemModifierGroupService.deleteOption(
            menuItemId,
            groupId,
            optionId,
        );
        return res.status(204).send();
    }

    async getOptionIngredients(req: Request, res: Response) {
        const optionId = req.params.optionId as string;
        const ingredients =
            await menuItemModifierGroupService.getOptionIngredients(optionId);
        return res.json({ data: ingredients });
    }

    async addOptionIngredient(req: Request, res: Response) {
        const menuItemId = req.params.menuItemId as string;
        const groupId = req.params.groupId as string;
        const optionId = req.params.optionId as string;
        const ingredient =
            await menuItemModifierGroupService.addOptionIngredient(
                menuItemId,
                groupId,
                optionId,
                req.body,
            );
        return res.status(201).json({ data: ingredient });
    }

    async updateOptionIngredient(req: Request, res: Response) {
        const menuItemId = req.params.menuItemId as string;
        const groupId = req.params.groupId as string;
        const optionId = req.params.optionId as string;
        const ingredientId = req.params.ingredientId as string;
        const ingredient =
            await menuItemModifierGroupService.updateOptionIngredient(
                menuItemId,
                groupId,
                optionId,
                ingredientId,
                req.body,
            );
        return res.json({ data: ingredient });
    }

    async deleteOptionIngredient(req: Request, res: Response) {
        const menuItemId = req.params.menuItemId as string;
        const groupId = req.params.groupId as string;
        const optionId = req.params.optionId as string;
        const ingredientId = req.params.ingredientId as string;
        await menuItemModifierGroupService.deleteOptionIngredient(
            menuItemId,
            groupId,
            optionId,
            ingredientId,
        );
        return res.status(204).send();
    }
}

export const menuItemModifierGroupController =
    new MenuItemModifierGroupController();
