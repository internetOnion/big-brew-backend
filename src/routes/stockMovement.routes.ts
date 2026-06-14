import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";
import {
    validateQuery,
    authenticate,
    requireRole,
} from "../middlewares/index.ts";
import { stockMovementController } from "../controllers/stockMovement.controller.ts";
import { stockReasonEnum } from "../models/schema/enums.ts";

const router = Router();

const listQuerySchema = z
    .object({
        ingredientId: z.uuid().optional(),
        reason: z.enum(stockReasonEnum.enumValues).optional(),
        from: z.iso.datetime().optional(),
        to: z.iso.datetime().optional(),
    })
    .strict();

/**
 * @openapi
 * /api/stock-movements:
 *   get:
 *     tags: [Stock Movements]
 *     summary: List stock movements with optional filters
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ingredientId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: reason
 *         schema:
 *           type: string
 *           enum: [order_placed, order_voided, manual_restock, manual_deduction, manual_adjustment]
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: List of stock movements
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   ingredientId:
 *                     type: string
 *                     format: uuid
 *                   ingredientName:
 *                     type: string
 *                   ingredientUnit:
 *                     type: string
 *                   quantityChange:
 *                     type: string
 *                   reason:
 *                     type: string
 *                   referenceOrderId:
 *                     type: string
 *                     format: uuid
 *                     nullable: true
 *                   notes:
 *                     type: string
 *                     nullable: true
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 */
router.get(
    "/",
    authenticate,
    requireRole("owner", "manager"),
    validateQuery(listQuerySchema),
    (req: Request, res: Response) =>
        stockMovementController.listMovements(req, res),
);

export default router;
