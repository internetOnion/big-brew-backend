import { Router } from "express";
import type { Request, Response } from "express";

import { authenticate, requireRole } from "../shared/middlewares/index.ts";
import authRoutes from "./auth/auth.routes.ts";
import employeeRoutes from "./employees/employees.routes.ts";
import storageRoutes from "./storage/storage.routes.ts";
import settingsRoutes from "./settings/settings.routes.ts";
import ingredientRoutes from "./ingredients/ingredient.routes.ts";
import categoryRoutes from "./categories/category.routes.ts";
import modifierGroupRoutes from "./menu/modifiers/modifierGroup.routes.ts";
import MenuItemRoutes from "./menu/items/menuItem.routes.ts";
import menuItemRecipeRoutes from "./menu/items/menuItemRecipe.routes.ts";
import menuItemModifierGroupRoutes from "./menu/items/menuItemModifierGroup.routes.ts";
import orderRoutes from "./orders/order.routes.ts";
import discountRoutes from "./discounts/discount.routes.ts";
import expenseRoutes from "./expenses/expense.routes.ts";
import stockMovementRoutes from "./stock/stockMovement.routes.ts";
import analyticsRoutes from "./analytics/analytics.routes.ts";

const router = Router();

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

router.use("/settings", settingsRoutes);

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
router.use("/expenses", expenseRoutes);
router.use("/stock-movements", stockMovementRoutes);
router.use("/analytics", analyticsRoutes);

export default router;
