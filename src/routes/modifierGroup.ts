import { baseModifierGroupSchema } from "../models/schema/modifier-groups.ts";
import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";
import { modifierGroupController } from "../controllers/modifierGroup.controller.ts";
import { authenticate, requireRole, validateBody } from "../middlewares/index.ts";

const router = Router();

export const insertModifierGroupValidationSchema = baseModifierGroupSchema.pick({
    name: true,
    selectionType: true,
    isRequired: true,
    defaultOptionId: true,
    sortOrder: true,
}).strict();

router.get("/", 
    authenticate,
    async (req: Request, res: Response) => {
    await modifierGroupController.getModifierGroups(req, res);
});

router.post("/",
    authenticate,
    requireRole("manager", "owner"),
    validateBody(insertModifierGroupValidationSchema),
    async (req: Request, res: Response) => {
    await modifierGroupController.addModifierGroup(req, res);
});

router.put("/:id",
    authenticate,
    requireRole("manager", "owner"),
    validateBody(insertModifierGroupValidationSchema.partial()),
    async (req: Request, res: Response) => {
    await modifierGroupController.updateModifierGroup(req, res);
});

router.delete("/:id",
    authenticate,
    requireRole("manager", "owner"),
    async (req: Request, res: Response) => {
    await modifierGroupController.deleteModifierGroup(req, res);
});

export default router;

