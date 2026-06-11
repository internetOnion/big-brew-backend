import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";
import { ingredientController } from "../controllers/ingredient.controller";
import {
    authenticate,
    requireRole,
    validateBody,
} from "../middlewares/index.ts";
import { ingredientUnitEnumSchema } from "../models/schema/enums.ts";

const router = Router();
const addIngredientSchema = z
    .object({
        name: z.string().min(1).max(100),
        unit: ingredientUnitEnumSchema,
        stockQuantity: z.number().nonnegative(),
        lowStockThreshold: z.number().nonnegative(),
    })
    .strict();

router.get("/", authenticate, requireRole("owner", "manager"), (req, res) =>
    ingredientController.getIngredient(req, res),
);

router.post(
    "/",
    authenticate,
    requireRole("owner", "manager"),
    validateBody(addIngredientSchema),
    (req, res) => ingredientController.addIngredient(req, res),
);

router.patch(
    "/:id",
    authenticate,
    requireRole("owner", "manager"),
    validateBody(addIngredientSchema.partial()),
    (req, res) => ingredientController.updateIngredient(req, res),
);

router.delete(
    "/:id",
    authenticate,
    requireRole("owner", "manager"),
    (req, res) => ingredientController.deleteIngredient(req, res),
);

export default router;
