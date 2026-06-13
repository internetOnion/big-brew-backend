import { Router } from "express";
import { discountController } from "../controllers/discount.controller.ts";
import { authenticate, requireRole } from "../middlewares/index.ts";

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @openapi
 * /api/discounts:
 *   get:
 *     tags: [Discounts]
 *     summary: List active discounts
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active discounts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/Discount"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 */
router.get("/", requireRole("barista", "manager", "owner"), (req, res) =>
    discountController.getActiveDiscounts(req, res),
);

export default router;
