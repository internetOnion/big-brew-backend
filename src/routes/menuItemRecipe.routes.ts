import { z } from "zod";
import { Router } from "express";
import type { Request, Response } from "express";
import {
    authenticate,
    requireRole,
    validateBody,
    validateParams,
} from "../middlewares/index.ts";
import { menuItemRecipeController } from "../controllers/menuItemRecipe.controller.ts";
import { baseItemRecipeSchema } from "../models/schema/item-recipes.ts";

const recipeSchema = z
    .array(
        baseItemRecipeSchema
            .pick({
                ingredientId: true,
                quantity: true,
            })
            .strict(),
    )
    .min(1);

const updateRecipeSchema = baseItemRecipeSchema
    .pick({
        quantity: true,
    })
    .strict();

const router = Router({ mergeParams: true });

const recipeListParamsSchema = z.object({ menuItemId: z.uuid() });
const recipeItemParamsSchema = z.object({
    menuItemId: z.uuid(),
    ingredientId: z.uuid(),
});

/**
 * @openapi
 * /api/menu-items/{menuItemId}/recipes:
 *   get:
 *     tags: [Menu Item Recipes]
 *     summary: List recipes for a menu item
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: menuItemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of item recipes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/ItemRecipe"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 */
router.get(
    "/",
    authenticate,
    validateParams(recipeListParamsSchema),
    async (req: Request, res: Response) => {
        await menuItemRecipeController.getRecipes(req, res);
    },
);

/**
 * @openapi
 * /api/menu-items/{menuItemId}/recipes:
 *   post:
 *     tags: [Menu Item Recipes]
 *     summary: Add recipes to a menu item
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: menuItemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             minItems: 1
 *             items:
 *               type: object
 *               required: [ingredientId, quantity]
 *               properties:
 *                 ingredientId:
 *                   type: string
 *                   format: uuid
 *                 quantity:
 *                   type: number
 *     responses:
 *       201:
 *         description: Recipes created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/ItemRecipe"
 *       400:
 *         description: Validation error or ingredient not found
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
    requireRole("manager", "owner"),
    validateParams(recipeListParamsSchema),
    validateBody(recipeSchema),
    async (req: Request, res: Response) => {
        await menuItemRecipeController.addRecipes(req, res);
    },
);

/**
 * @openapi
 * /api/menu-items/{menuItemId}/recipes/{ingredientId}:
 *   put:
 *     tags: [Menu Item Recipes]
 *     summary: Update a recipe quantity
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: menuItemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: ingredientId
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
 *             required: [quantity]
 *             properties:
 *               quantity:
 *                 type: number
 *     responses:
 *       200:
 *         description: Recipe updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: "#/components/schemas/ItemRecipe"
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
 *         description: Recipe not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 */
router.put(
    "/:ingredientId",
    authenticate,
    requireRole("manager", "owner"),
    validateParams(recipeItemParamsSchema),
    validateBody(updateRecipeSchema),
    async (req: Request, res: Response) => {
        await menuItemRecipeController.updateRecipe(req, res);
    },
);

/**
 * @openapi
 * /api/menu-items/{menuItemId}/recipes/{ingredientId}:
 *   delete:
 *     tags: [Menu Item Recipes]
 *     summary: Remove a recipe from a menu item
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: menuItemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: ingredientId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Recipe deleted
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         description: Recipe not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 */
router.delete(
    "/:ingredientId",
    authenticate,
    requireRole("manager", "owner"),
    validateParams(recipeItemParamsSchema),
    async (req: Request, res: Response) => {
        await menuItemRecipeController.deleteRecipe(req, res);
    },
);

export default router;
