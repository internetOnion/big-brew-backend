import { baseModifierOptionSchema } from "../models/schema/modifier-options.ts";
import { baseModifierOptionIngredientSchema } from "../models/schema/modifier-option-ingredients.ts";
import { baseMenuItemSchema } from "../models/schema/menu-items.ts";
import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";
import { menuItemController } from "../controllers/menuItem.controller.ts";
import { authenticate, requireRole, validateBody } from "../middlewares/index.ts";

export const insertModifierOptionValidationSchema = baseModifierOptionSchema.pick({
    modifierGroupId: true,
    name: true,
    price: true,
    isAvailable: true,
    sortOrder: true,
}).strict();

export const insertModifierOptionIngredientValidationSchema = baseModifierOptionIngredientSchema.pick({
    modifierOptionId: true,
    ingredientId: true,
    quantity: true,
}).strict();

export const insertMenuItemValidationSchema = baseMenuItemSchema.pick({
    categoryId: true,
    name: true,
    basePrice: true,
    isAvailable: true,
    imageUrl: true,
}).strict();

const router = Router();

router.get("/",
    authenticate,
    async (req: Request, res: Response) => {
    await menuItemController.getMenuItems(req, res);
});

router.post("/",
    authenticate,
    requireRole("manager", "owner"),
    validateBody(insertMenuItemValidationSchema),
    async (req: Request, res: Response) => {
    await menuItemController.addMenuItem(req, res);
});

router.put("/:id",
    authenticate,
    requireRole("manager", "owner"),
    validateBody(insertMenuItemValidationSchema.partial()),
    async (req: Request, res: Response) => {
    await menuItemController.updateMenuItem(req, res);
});

router.delete("/:id",
    authenticate,
    requireRole("manager", "owner"),
    async (req: Request, res: Response) => {
    await menuItemController.deleteMenuItem(req, res);
});

export default router;