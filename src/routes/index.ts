import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";

import {
    validateBody,
    authenticate,
    requireRole,
} from "../middlewares/index.ts";
import { settingsController } from "../controllers/index.ts";
import authRoutes from "./auth.ts";
import employeeRoutes from "./employees.ts";
import storageRoutes from "./storage.ts";
import ingredientRoutes from "./ingredient.ts";
import categoryRoutes from "./category.ts";
import modifierGroupRoutes from "./modifierGroup.ts";

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
    })
    .strict();

// ── Public ─────────────────────────────────────────────────

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

router.get("/settings", authenticate, (req: Request, res: Response) =>
    settingsController.getSettings(req, res),
);

router.delete(
    "/settings/logo",
    authenticate,
    requireRole("owner", "manager"),
    (req: Request, res: Response) => settingsController.deleteLogo(req, res),
);

router.patch(
    "/settings",
    authenticate,
    requireRole("owner", "manager"),
    validateBody(updateSettingsSchema),
    (req: Request, res: Response) =>
        settingsController.updateSettings(req, res),
);

router.use(
    "/ingredients",
    ingredientRoutes,
);

router.use(
    "/categories",
    categoryRoutes,
)

router.use(
    "/modifier-groups",
    modifierGroupRoutes,
)

export default router;
