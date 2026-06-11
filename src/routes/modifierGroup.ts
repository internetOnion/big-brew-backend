import { baseModifierGroupSchema } from "../models/schema/modifier-groups.ts";
import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";
import { modifierGroupController } from "../controllers/modifierGroup.controller.ts";
import {
    authenticate,
    requireRole,
    validateBody,
} from "../middlewares/index.ts";
import {
    authenticate,
    requireRole,
    validateBody,
} from "../middlewares/index.ts";

const router = Router();

export const insertModifierGroupValidationSchema = baseModifierGroupSchema
    .pick({
        name: true,
        selectionType: true,
        isRequired: true,
        defaultOptionId: true,
        sortOrder: true,
    })
    .partial({
        defaultOptionId: true,
        sortOrder: true,
    })
    .strict();

/**
 * @openapi
 * /api/modifier-groups:
 *   get:
 *     tags: [Modifier Groups]
 *     summary: List all modifier groups
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of modifier groups
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/ModifierGroup"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 */
router.get("/", authenticate, async (req: Request, res: Response) => {
    await modifierGroupController.getModifierGroups(req, res);
});

/**
 * @openapi
 * /api/modifier-groups:
 *   post:
 *     tags: [Modifier Groups]
 *     summary: Create a new modifier group
 *     security:
 *       - bearerAuth: []
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
 *                 minLength: 1
 *               selectionType:
 *                 type: string
 *                 enum: [single, multiple]
 *               isRequired:
 *                 type: boolean
 *               defaultOptionId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               sortOrder:
 *                 type: integer
 *                 minimum: 0
 *                 default: 0
 *     responses:
 *       201:
 *         description: Modifier group created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ModifierGroup"
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
    requireRole("manager", "owner"),
    validateBody(insertModifierGroupValidationSchema),
    async (req: Request, res: Response) => {
        await modifierGroupController.addModifierGroup(req, res);
    },
);

/**
 * @openapi
 * /api/modifier-groups/{id}:
 *   put:
 *     tags: [Modifier Groups]
 *     summary: Update a modifier group
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
 *               selectionType:
 *                 type: string
 *                 enum: [single, multiple]
 *               isRequired:
 *                 type: boolean
 *               defaultOptionId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               sortOrder:
 *                 type: integer
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Modifier group updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ModifierGroup"
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
    "/:id",
    authenticate,
    requireRole("manager", "owner"),
    validateBody(insertModifierGroupValidationSchema.partial()),
    async (req: Request, res: Response) => {
        await modifierGroupController.updateModifierGroup(req, res);
    },
);

/**
 * @openapi
 * /api/modifier-groups/{id}:
 *   delete:
 *     tags: [Modifier Groups]
 *     summary: Delete a modifier group
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
 *       200:
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
    "/:id",
    authenticate,
    requireRole("manager", "owner"),
    async (req: Request, res: Response) => {
        await modifierGroupController.deleteModifierGroup(req, res);
    },
);

export default router;
