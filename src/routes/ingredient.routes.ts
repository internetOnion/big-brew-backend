import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";
import { ingredientController } from "../controllers/ingredient.controller";
import {
    authenticate,
    requireRole,
    validateBody,
    validateParams,
} from "../middlewares/index.ts";
import { ingredientUnitEnumSchema } from "../models/schema/enums.ts";

const router = Router();
const idParamsSchema = z.object({ id: z.uuid() });
const addIngredientSchema = z
    .object({
        name: z.string().min(1).max(100),
        unit: ingredientUnitEnumSchema,
        stockQuantity: z.number().nonnegative(),
        lowStockThreshold: z.number().nonnegative(),
    })
    .strict();

/**
 * @openapi
 * /api/ingredients:
 *   get:
 *     tags: [Ingredients]
 *     summary: List all ingredients
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of ingredients
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/Ingredient"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 */
router.get("/", authenticate, requireRole("owner", "manager"), (req, res) =>
    ingredientController.getIngredient(req, res),
);

/**
 * @openapi
 * /api/ingredients:
 *   post:
 *     tags: [Ingredients]
 *     summary: Create a new ingredient
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, unit, stockQuantity, lowStockThreshold]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               unit:
 *                 type: string
 *                 enum: [g, ml]
 *               stockQuantity:
 *                 type: number
 *                 minimum: 0
 *               lowStockThreshold:
 *                 type: number
 *                 minimum: 0
 *     responses:
 *       201:
 *         description: Ingredient created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Ingredient"
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 */
router.post(
    "/",
    authenticate,
    requireRole("owner", "manager"),
    validateBody(addIngredientSchema),
    (req, res) => ingredientController.addIngredient(req, res),
);

/**
 * @openapi
 * /api/ingredients/{id}:
 *   patch:
 *     tags: [Ingredients]
 *     summary: Update an ingredient
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               unit:
 *                 type: string
 *                 enum: [g, ml]
 *               stockQuantity:
 *                 type: number
 *                 minimum: 0
 *               lowStockThreshold:
 *                 type: number
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Ingredient updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Ingredient"
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         description: Ingredient not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 */
router.patch(
    "/:id",
    authenticate,
    requireRole("owner", "manager"),
    validateParams(idParamsSchema),
    validateBody(addIngredientSchema.partial()),
    (req, res) => ingredientController.updateIngredient(req, res),
);

/**
 * @openapi
 * /api/ingredients/{id}:
 *   delete:
 *     tags: [Ingredients]
 *     summary: Delete an ingredient
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Ingredient deleted
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         description: Ingredient not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 */
router.delete(
    "/:id",
    authenticate,
    requireRole("owner", "manager"),
    validateParams(idParamsSchema),
    (req, res) => ingredientController.deleteIngredient(req, res),
);

export default router;
