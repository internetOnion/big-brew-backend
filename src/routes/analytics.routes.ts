import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";
import {
    validateQuery,
    authenticate,
    requireRole,
} from "../middlewares/index.ts";
import { analyticsController } from "../controllers/analytics.controller.ts";

const router = Router();

const dateRangeSchema = z
    .object({
        from: z.iso.datetime(),
        to: z.iso.datetime(),
    })
    .strict();

const revenueQuerySchema = dateRangeSchema
    .extend({
        groupBy: z.enum(["day", "week", "month", "year"]).default("day"),
    })
    .strict();

const topItemsQuerySchema = dateRangeSchema
    .extend({
        sortBy: z.enum(["quantity", "revenue"]).default("quantity"),
        limit: z.coerce.number().int().min(1).max(50).default(10),
    })
    .strict();

/**
 * @openapi
 * /api/analytics/revenue:
 *   get:
 *     tags: [Analytics]
 *     summary: Get revenue over time
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *           default: day
 *     responses:
 *       200:
 *         description: Revenue data points
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   period:
 *                     type: string
 *                   revenue:
 *                     type: string
 *                   orderCount:
 *                     type: number
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 */
router.get(
    "/revenue",
    authenticate,
    requireRole("owner", "manager"),
    validateQuery(revenueQuerySchema),
    (req: Request, res: Response) => analyticsController.getRevenue(req, res),
);

/**
 * @openapi
 * /api/analytics/top-items:
 *   get:
 *     tags: [Analytics]
 *     summary: Get top selling items
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [quantity, revenue]
 *           default: quantity
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *     responses:
 *       200:
 *         description: Top selling items
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   menuItemId:
 *                     type: string
 *                     format: uuid
 *                   name:
 *                     type: string
 *                   quantity:
 *                     type: number
 *                   revenue:
 *                     type: string
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 */
router.get(
    "/top-items",
    authenticate,
    requireRole("owner", "manager"),
    validateQuery(topItemsQuerySchema),
    (req: Request, res: Response) => analyticsController.getTopItems(req, res),
);

/**
 * @openapi
 * /api/analytics/expenses:
 *   get:
 *     tags: [Analytics]
 *     summary: Get expense breakdown by category
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Expense breakdown by category
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   category:
 *                     type: string
 *                     nullable: true
 *                   total:
 *                     type: string
 *                   count:
 *                     type: number
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 */
router.get(
    "/expenses",
    authenticate,
    requireRole("owner", "manager"),
    validateQuery(dateRangeSchema),
    (req: Request, res: Response) =>
        analyticsController.getExpenseBreakdown(req, res),
);

/**
 * @openapi
 * /api/analytics/summary:
 *   get:
 *     tags: [Analytics]
 *     summary: Get analytics summary (revenue, expenses, orders)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Analytics summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalRevenue:
 *                   type: string
 *                 totalExpenses:
 *                   type: string
 *                 netIncome:
 *                   type: string
 *                 orderCount:
 *                   type: number
 *                 averageOrderValue:
 *                   type: string
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 */
router.get(
    "/summary",
    authenticate,
    requireRole("owner", "manager"),
    validateQuery(dateRangeSchema),
    (req: Request, res: Response) => analyticsController.getSummary(req, res),
);

export default router;
