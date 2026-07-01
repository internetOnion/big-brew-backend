import { z } from "zod";
import { Router } from "express";
import type { Request, Response } from "express";
import {
    authenticate,
    requireRole,
    validateBody,
    validateParams,
} from "../middlewares/index.ts";
import { menuItemModifierGroupController } from "../controllers/menuItemModifierGroup.controller.ts";
import { baseModifierGroupSchema } from "../models/schema/modifier-groups.ts";
import { baseModifierOptionSchema } from "../models/schema/modifier-options.ts";
import { baseModifierOptionIngredientSchema } from "../models/schema/modifier-option-ingredients.ts";
import { selectionTypeEnumSchema } from "../models/schema/enums.ts";

const insertGroupSchema = baseModifierGroupSchema
    .pick({
        name: true,
        selectionType: true,
        isRequired: true,
        sortOrder: true,
    })
    .extend({
        selectionType: selectionTypeEnumSchema,
    })
    .partial({
        sortOrder: true,
    })
    .strict();

const updateGroupSchema = insertGroupSchema.partial().strict();

const insertOptionSchema = baseModifierOptionSchema
    .pick({
        name: true,
        price: true,
        isAvailable: true,
        sortOrder: true,
    })
    .partial({
        isAvailable: true,
        sortOrder: true,
    })
    .strict();

const updateOptionSchema = insertOptionSchema.partial().strict();

const insertOptionIngredientSchema = baseModifierOptionIngredientSchema
    .pick({
        ingredientId: true,
        quantity: true,
    })
    .strict();

const updateOptionIngredientSchema = insertOptionIngredientSchema
    .partial()
    .strict();

const router = Router({ mergeParams: true });

const groupListParamsSchema = z.object({ menuItemId: z.uuid() });
const groupItemParamsSchema = z.object({
    menuItemId: z.uuid(),
    groupId: z.uuid(),
});
const optionListParamsSchema = z.object({
    menuItemId: z.uuid(),
    groupId: z.uuid(),
});
const optionItemParamsSchema = z.object({
    menuItemId: z.uuid(),
    groupId: z.uuid(),
    optionId: z.uuid(),
});
const ingredientListParamsSchema = z.object({
    menuItemId: z.uuid(),
    groupId: z.uuid(),
    optionId: z.uuid(),
});
const ingredientItemParamsSchema = z.object({
    menuItemId: z.uuid(),
    groupId: z.uuid(),
    optionId: z.uuid(),
    ingredientId: z.uuid(),
});

// ── Modifier Groups ─────────────────────────────────────────

/**
 * @openapi
 * /api/menu-items/{menuItemId}/modifier-groups:
 *   get:
 *     tags: [Menu Item Modifier Groups]
 *     summary: List modifier groups for a menu item
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
 *         description: List of modifier groups
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/ModifierGroup"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 */
router.get(
    "/",
    authenticate,
    validateParams(groupListParamsSchema),
    async (req: Request, res: Response) => {
        await menuItemModifierGroupController.getGroups(req, res);
    },
);

/**
 * @openapi
 * /api/menu-items/{menuItemId}/modifier-groups:
 *   post:
 *     tags: [Menu Item Modifier Groups]
 *     summary: Create a modifier group for a menu item
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
 *             type: object
 *             required: [name, selectionType, isRequired]
 *             properties:
 *               name:
 *                 type: string
 *               selectionType:
 *                 type: string
 *                 enum: [single, multiple]
 *               isRequired:
 *                 type: boolean
 *               sortOrder:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Modifier group created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: "#/components/schemas/ModifierGroup"
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
 *         description: Menu item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 */
router.post(
    "/",
    authenticate,
    requireRole("manager", "owner"),
    validateParams(groupListParamsSchema),
    validateBody(insertGroupSchema),
    async (req: Request, res: Response) => {
        await menuItemModifierGroupController.addGroup(req, res);
    },
);

/**
 * @openapi
 * /api/menu-items/{menuItemId}/modifier-groups/{groupId}:
 *   put:
 *     tags: [Menu Item Modifier Groups]
 *     summary: Update a modifier group
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
 *         name: groupId
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
 *               selectionType:
 *                 type: string
 *                 enum: [single, multiple]
 *               isRequired:
 *                 type: boolean
 *               sortOrder:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Modifier group updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: "#/components/schemas/ModifierGroup"
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
 *         description: Modifier group not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 */
router.put(
    "/:groupId",
    authenticate,
    requireRole("manager", "owner"),
    validateParams(groupItemParamsSchema),
    validateBody(updateGroupSchema),
    async (req: Request, res: Response) => {
        await menuItemModifierGroupController.updateGroup(req, res);
    },
);

/**
 * @openapi
 * /api/menu-items/{menuItemId}/modifier-groups/{groupId}:
 *   delete:
 *     tags: [Menu Item Modifier Groups]
 *     summary: Delete a modifier group and its options
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
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Modifier group deleted
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         description: Modifier group not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 */
router.delete(
    "/:groupId",
    authenticate,
    requireRole("manager", "owner"),
    validateParams(groupItemParamsSchema),
    async (req: Request, res: Response) => {
        await menuItemModifierGroupController.deleteGroup(req, res);
    },
);

// ── Modifier Options ────────────────────────────────────────

const optionsRouter = Router({ mergeParams: true });

/**
 * @openapi
 * /api/menu-items/{menuItemId}/modifier-groups/{groupId}/options:
 *   get:
 *     tags: [Menu Item Modifier Groups]
 *     summary: List modifier options for a group
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
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of modifier options
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/ModifierOption"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 */
optionsRouter.get(
    "/",
    authenticate,
    validateParams(optionListParamsSchema),
    async (req: Request, res: Response) => {
        await menuItemModifierGroupController.getOptions(req, res);
    },
);

/**
 * @openapi
 * /api/menu-items/{menuItemId}/modifier-groups/{groupId}/options:
 *   post:
 *     tags: [Menu Item Modifier Groups]
 *     summary: Add a modifier option to a group
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
 *         name: groupId
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
 *             required: [name, price]
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               isAvailable:
 *                 type: boolean
 *               sortOrder:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Modifier option created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: "#/components/schemas/ModifierOption"
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
 *         description: Modifier group not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 */
optionsRouter.post(
    "/",
    authenticate,
    requireRole("manager", "owner"),
    validateParams(optionListParamsSchema),
    validateBody(insertOptionSchema),
    async (req: Request, res: Response) => {
        await menuItemModifierGroupController.addOption(req, res);
    },
);

/**
 * @openapi
 * /api/menu-items/{menuItemId}/modifier-groups/{groupId}/options/{optionId}:
 *   put:
 *     tags: [Menu Item Modifier Groups]
 *     summary: Update a modifier option
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
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: optionId
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
 *               price:
 *                 type: number
 *               isAvailable:
 *                 type: boolean
 *               sortOrder:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Modifier option updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: "#/components/schemas/ModifierOption"
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
 *         description: Modifier option not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 */
optionsRouter.put(
    "/:optionId",
    authenticate,
    requireRole("manager", "owner"),
    validateParams(optionItemParamsSchema),
    validateBody(updateOptionSchema),
    async (req: Request, res: Response) => {
        await menuItemModifierGroupController.updateOption(req, res);
    },
);

/**
 * @openapi
 * /api/menu-items/{menuItemId}/modifier-groups/{groupId}/options/{optionId}:
 *   delete:
 *     tags: [Menu Item Modifier Groups]
 *     summary: Delete a modifier option
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
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: optionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Modifier option deleted
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         description: Modifier option not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 */
optionsRouter.delete(
    "/:optionId",
    authenticate,
    requireRole("manager", "owner"),
    validateParams(optionItemParamsSchema),
    async (req: Request, res: Response) => {
        await menuItemModifierGroupController.deleteOption(req, res);
    },
);

// ── Modifier Option Ingredients ─────────────────────────────

const ingredientsRouter = Router({ mergeParams: true });

/**
 * @openapi
 * /api/menu-items/{menuItemId}/modifier-groups/{groupId}/options/{optionId}/ingredients:
 *   get:
 *     tags: [Menu Item Modifier Groups]
 *     summary: List ingredients for a modifier option
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
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: optionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of option ingredients
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/OptionIngredient"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 */
ingredientsRouter.get(
    "/",
    authenticate,
    validateParams(ingredientListParamsSchema),
    async (req: Request, res: Response) => {
        await menuItemModifierGroupController.getOptionIngredients(req, res);
    },
);

/**
 * @openapi
 * /api/menu-items/{menuItemId}/modifier-groups/{groupId}/options/{optionId}/ingredients:
 *   post:
 *     tags: [Menu Item Modifier Groups]
 *     summary: Add an ingredient to a modifier option
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
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: optionId
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
 *             required: [ingredientId, quantity]
 *             properties:
 *               ingredientId:
 *                 type: string
 *                 format: uuid
 *               quantity:
 *                 type: number
 *     responses:
 *       201:
 *         description: Option ingredient created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: "#/components/schemas/OptionIngredient"
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
 *       404:
 *         description: Modifier option not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 */
ingredientsRouter.post(
    "/",
    authenticate,
    requireRole("manager", "owner"),
    validateParams(ingredientListParamsSchema),
    validateBody(insertOptionIngredientSchema),
    async (req: Request, res: Response) => {
        await menuItemModifierGroupController.addOptionIngredient(req, res);
    },
);

/**
 * @openapi
 * /api/menu-items/{menuItemId}/modifier-groups/{groupId}/options/{optionId}/ingredients/{ingredientId}:
 *   put:
 *     tags: [Menu Item Modifier Groups]
 *     summary: Update an option ingredient quantity
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
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: optionId
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
 *             properties:
 *               ingredientId:
 *                 type: string
 *                 format: uuid
 *               quantity:
 *                 type: number
 *     responses:
 *       200:
 *         description: Option ingredient updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: "#/components/schemas/OptionIngredient"
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
 *         description: Option ingredient not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 */
ingredientsRouter.put(
    "/:ingredientId",
    authenticate,
    requireRole("manager", "owner"),
    validateParams(ingredientItemParamsSchema),
    validateBody(updateOptionIngredientSchema),
    async (req: Request, res: Response) => {
        await menuItemModifierGroupController.updateOptionIngredient(req, res);
    },
);

/**
 * @openapi
 * /api/menu-items/{menuItemId}/modifier-groups/{groupId}/options/{optionId}/ingredients/{ingredientId}:
 *   delete:
 *     tags: [Menu Item Modifier Groups]
 *     summary: Remove an ingredient from a modifier option
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
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: optionId
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
 *         description: Option ingredient deleted
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         description: Option ingredient not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 */
ingredientsRouter.delete(
    "/:ingredientId",
    authenticate,
    requireRole("manager", "owner"),
    validateParams(ingredientItemParamsSchema),
    async (req: Request, res: Response) => {
        await menuItemModifierGroupController.deleteOptionIngredient(req, res);
    },
);

optionsRouter.use("/:optionId/ingredients", ingredientsRouter);
router.use("/:groupId/options", optionsRouter);

export default router;
