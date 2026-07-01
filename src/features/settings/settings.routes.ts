import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";

import {
    validateBody,
    authenticate,
    requireRole,
} from "../../shared/middlewares/index.ts";
import { settingsController } from "./settings.controller.ts";

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
router.get("/", authenticate, (req: Request, res: Response) =>
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
    "/logo",
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
    "/",
    authenticate,
    requireRole("owner", "manager"),
    validateBody(updateSettingsSchema),
    (req: Request, res: Response) =>
        settingsController.updateSettings(req, res),
);

export default router;
