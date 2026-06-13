import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";

import {
    validateBody,
    authenticate,
    requireRole,
} from "../middlewares/index.ts";
import { settingsController } from "../controllers/index.ts";
import authRoutes from "./auth.routes.ts";
import employeeRoutes from "./employees.routes.ts";
import storageRoutes from "./storage.routes.ts";
import ingredientRoutes from "./ingredient.routes.ts";
import categoryRoutes from "./category.routes.ts";
import modifierGroupRoutes from "./modifierGroup.routes.ts";
import MenuItemRoutes from "./menuItem.routes.ts";
import menuItemRecipeRoutes from "./menuItemRecipe.routes.ts";
import menuItemModifierGroupRoutes from "./menuItemModifierGroup.routes.ts";
import orderRoutes from "./order.routes.ts";
import discountRoutes from "./discount.routes.ts";

const router = Router();

const updateSettingsSchema = z
    .object({
        storeName: z.string().optional(),
        storeAddress: z.string().nullable().optional(),
        currencySymbol: z.string().optional(),
        receiptHeader: z.string().nullable().optional(),
        receiptFooter: z.string().nullable().optional(),
        taxLabel: z.string().optional(),
        logoUrl: z.string().nullable().optional(),
        qrCodeUrl: z.string().nullable().optional(),
        khrRate: z.number().int().min(0).nullable().optional(),
    })
    .strict();

// ── Public ─────────────────────────────────────────────────

/**
 * @openapi
 * /api/health:
 *   get:
 *     tags: [Health]
 *     summary: Health check
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 */
router.get("/health", (_req: Request, res: Response) => {
    return res.json({ status: "ok" });
});

router.use("/auth", authRoutes);
router.use("/employees", employeeRoutes);

// ── Protected ──────────────────────────────────────────────

router.use(
    "/storage",
    authenticate,
    requireRole("owner", "manager"),
    storageRoutes,
);

/**
 * @openapi
 * /api/settings:
 *   get:
 *     tags: [Settings]
 *     summary: Get store settings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Store settings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Settings"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 */
router.get("/settings", authenticate, (req: Request, res: Response) =>
    settingsController.getSettings(req, res),
);

/**
 * @openapi
 * /api/settings/logo:
 *   delete:
 *     tags: [Settings]
 *     summary: Delete the store logo
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logo deleted, returns updated settings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Settings"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 */
router.delete(
    "/settings/logo",
    authenticate,
    requireRole("owner", "manager"),
    (req: Request, res: Response) => settingsController.deleteLogo(req, res),
);

/**
 * @openapi
 * /api/settings:
 *   patch:
 *     tags: [Settings]
 *     summary: Update store settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               storeName:
 *                 type: string
 *               storeAddress:
 *                 type: string
 *                 nullable: true
 *               currencySymbol:
 *                 type: string
 *               receiptHeader:
 *                 type: string
 *                 nullable: true
 *               receiptFooter:
 *                 type: string
 *                 nullable: true
 *               taxLabel:
 *                 type: string
 *               logoUrl:
 *                 type: string
 *                 nullable: true
 *               qrCodeUrl:
 *                 type: string
 *                 nullable: true
 *               khrRate:
 *                 type: integer
 *                 minimum: 0
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Settings updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Settings"
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
router.patch(
    "/settings",
    authenticate,
    requireRole("owner", "manager"),
    validateBody(updateSettingsSchema),
    (req: Request, res: Response) =>
        settingsController.updateSettings(req, res),
);

router.use("/ingredients", ingredientRoutes);

router.use("/categories", categoryRoutes);

router.use("/modifier-groups", modifierGroupRoutes);

router.use("/menu-items", MenuItemRoutes);
router.use("/menu-items/:menuItemId/recipes", menuItemRecipeRoutes);
router.use(
    "/menu-items/:menuItemId/modifier-groups",
    menuItemModifierGroupRoutes,
);

router.use("/orders", orderRoutes);
router.use("/discounts", discountRoutes);

export default router;
