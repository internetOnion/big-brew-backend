import { baseModifierOptionSchema } from "../models/schema/modifier-options.ts";
import { baseModifierOptionIngredientSchema } from "../models/schema/modifier-option-ingredients.ts";
import { baseItemRecipeSchema } from "../models/schema/item-recipes.ts";
import { baseMenuItemSchema } from "../models/schema/menu-items.ts";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import type { Request, Response } from "express";
import { menuItemController } from "../controllers/menuItem.controller.ts";
import {
    authenticate,
    requireRole,
    validateBody,
    validateParams,
} from "../middlewares/index.ts";
import { AppError } from "../utils/AppError.ts";
import { config } from "../config/index.ts";

export const insertModifierOptionValidationSchema = baseModifierOptionSchema
    .pick({
        modifierGroupId: true,
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

export const insertModifierOptionIngredientValidationSchema =
    baseModifierOptionIngredientSchema
        .pick({
            modifierOptionId: true,
            ingredientId: true,
            quantity: true,
        })
        .strict();

export const insertItemRecipeValidationSchema = baseItemRecipeSchema
    .pick({
        itemId: true,
        ingredientId: true,
        quantity: true,
    })
    .strict();

export const insertMenuItemValidationSchema = baseMenuItemSchema
    .pick({
        categoryId: true,
        name: true,
        basePrice: true,
        isAvailable: true,
        imageUrl: true,
    })
    .strict();

export const updateMenuItemValidationSchema = insertMenuItemValidationSchema
    .partial()
    .strict();

const router = Router();

const idParamsSchema = z.object({ id: z.uuid() });

/**
 * @openapi
 * /api/menu-items:
 *   get:
 *     tags: [Menu Items]
 *     summary: List all menu items
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of menu items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/MenuItem"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 */
router.get("/", authenticate, async (req: Request, res: Response) => {
    await menuItemController.getMenuItems(req, res);
});

/**
 * @openapi
 * /api/menu-items:
 *   post:
 *     tags: [Menu Items]
 *     summary: Create a new menu item (basic info only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, basePrice, categoryId]
 *             properties:
 *               name:
 *                 type: string
 *               basePrice:
 *                 type: number
 *                 minimum: 0
 *               isAvailable:
 *                 type: boolean
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Menu item created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: "#/components/schemas/MenuItem"
 *       400:
 *         description: Validation error or invalid category
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
    validateBody(insertMenuItemValidationSchema),
    async (req: Request, res: Response) => {
        await menuItemController.addMenuItem(req, res);
    },
);

/**
 * @openapi
 * /api/menu-items/{id}:
 *   put:
 *     tags: [Menu Items]
 *     summary: Update a menu item (scalar fields only)
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
 *               basePrice:
 *                 type: number
 *                 minimum: 0
 *               isAvailable:
 *                 type: boolean
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Menu item updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: "#/components/schemas/MenuItem"
 *       400:
 *         description: Validation error or invalid category
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
router.put(
    "/:id",
    authenticate,
    requireRole("manager", "owner"),
    validateParams(idParamsSchema),
    validateBody(updateMenuItemValidationSchema),
    async (req: Request, res: Response) => {
        await menuItemController.updateMenuItem(req, res);
    },
);

/**
 * @openapi
 * /api/menu-items/{id}:
 *   delete:
 *     tags: [Menu Items]
 *     summary: Soft-delete a menu item
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
 *         description: Menu item deleted
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
router.delete(
    "/:id",
    authenticate,
    requireRole("manager", "owner"),
    validateParams(idParamsSchema),
    async (req: Request, res: Response) => {
        await menuItemController.deleteMenuItem(req, res);
    },
);

// ── Image upload ────────────────────────────────────────────

const imageUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.storageMaxFileSize },
    fileFilter: (_req, file, cb) => {
        const allowed = /^image\/(jpeg|png|gif|webp|svg\+xml|bmp|tiff)$/i;
        if (allowed.test(file.mimetype)) {
            cb(null, true);
        } else {
            cb(
                AppError.badRequest(
                    "Invalid file type. Allowed: JPEG, PNG, GIF, WebP, SVG, BMP, TIFF",
                ),
            );
        }
    },
});

/**
 * @openapi
 * /api/menu-items/{id}/image:
 *   put:
 *     tags: [Menu Items]
 *     summary: Upload or replace a menu item image
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Image uploaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     imageUrl:
 *                       type: string
 *                     imagePath:
 *                       type: string
 *       400:
 *         description: Invalid file type or size
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
router.put(
    "/:id/image",
    authenticate,
    requireRole("manager", "owner"),
    validateParams(idParamsSchema),
    imageUpload.single("file"),
    async (req: Request, res: Response) => {
        await menuItemController.uploadImage(req, res);
    },
);

/**
 * @openapi
 * /api/menu-items/{id}/image:
 *   delete:
 *     tags: [Menu Items]
 *     summary: Remove a menu item image
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
 *         description: Image deleted
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
router.delete(
    "/:id/image",
    authenticate,
    requireRole("manager", "owner"),
    validateParams(idParamsSchema),
    async (req: Request, res: Response) => {
        await menuItemController.deleteImage(req, res);
    },
);

export default router;
