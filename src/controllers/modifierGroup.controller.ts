import { modifierGroupService } from "../services/modifierGroup.service";
import { AppError } from "../utils/AppError.ts";
import type { InsertModifierGroup, UpdateModifierGroup } from "../repositories/modifierGroup.repository.ts";
import { Request, Response } from "express";

export class ModifierGroupController {
    async getModifierGroups(req: Request, res: Response) {
        try {
            const modifierGroups = await modifierGroupService.getModifierGroups();
            res.json(modifierGroups);
        } catch (error) {
            throw AppError.internal("Failed to fetch modifier groups");
        }
    }

    async addModifierGroup(req: Request, res: Response) {
        const input: InsertModifierGroup = req.body as InsertModifierGroup;
        try {
            const newModifierGroup = await modifierGroupService.addModifierGroup(input);
            res.status(201).json(newModifierGroup);
        } catch (error) {
            throw AppError.internal("Failed to add modifier group");
        }
    }

    async updateModifierGroup(req: Request, res: Response) {
        const id = req.params.id as string;
        const input: UpdateModifierGroup = req.body as UpdateModifierGroup;
        try {
            const updatedModifierGroup = await modifierGroupService.updateModifierGroup(id, input);
            res.json(updatedModifierGroup);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw AppError.internal("Failed to update modifier group");
        }   
    }

    async deleteModifierGroup(req: Request, res: Response) {
        const id = req.params.id as string;
        try {
            await modifierGroupService.deleteModifierGroup(id);
            res.status(204).send();
        } catch (error) {
            throw AppError.internal("Failed to delete modifier group");
        }
    }
}

export const modifierGroupController = new ModifierGroupController();