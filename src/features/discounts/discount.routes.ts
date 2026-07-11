import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";
import { discountController } from "./discount.controller.ts";
import {
    authenticate,
    requireRole,
    validateBody,
    validateParams,
} from "../../shared/middlewares/index.ts";

const router = Router();

const idParamsSchema = z.object({ id: z.uuid() });

const createDiscountSchema = z
    .object({
        name: z.string().min(1).max(100),
        type: z.enum(["percentage", "fixed_amount", "bogo"]),
        value: z.number().positive().nullable(),
        max_discount_amount: z.number().positive().nullable().optional(),
        applies_to: z.enum(["order", "item"]).default("order"),
        item_id: z.uuid().nullable().optional(),
        buy_item_id: z.uuid().nullable(),
        free_item_id: z.uuid().nullable(),
        is_active: z.boolean().default(true),
        starts_at: z.iso.datetime().nullable().optional(),
        ends_at: z.iso.datetime().nullable().optional(),
    })
    .strict()
    .refine(
        (data) => {
            if (data.max_discount_amount !== undefined && data.max_discount_amount !== null) {
                return data.type === "percentage";
            }
            return true;
        },
        { message: "max_discount_amount is only valid for percentage discounts" },
    )
    .refine(
        (data) => {
            if (data.type === "percentage" || data.type === "fixed_amount") {
                const validValue =
                    data.value !== null &&
                    data.buy_item_id === null &&
                    data.free_item_id === null;
                if (!validValue) return false;
                if (data.applies_to === "item") {
                    return data.item_id !== null && data.item_id !== undefined;
                }
                return data.item_id === null || data.item_id === undefined;
            }
            if (data.type === "bogo") {
                return (
                    data.value === null &&
                    data.applies_to === "item" &&
                    (data.buy_item_id !== null || data.free_item_id !== null) &&
                    (data.item_id === null || data.item_id === undefined)
                );
            }
            return false;
        },
        { message: "Invalid field combination for discount type" },
    );

const updateDiscountSchema = z
    .object({
        name: z.string().min(1).max(100).optional(),
        type: z.enum(["percentage", "fixed_amount", "bogo"]).optional(),
        value: z.number().positive().nullable().optional(),
        max_discount_amount: z.number().positive().nullable().optional(),
        applies_to: z.enum(["order", "item"]).optional(),
        item_id: z.uuid().nullable().optional(),
        buy_item_id: z.uuid().nullable().optional(),
        free_item_id: z.uuid().nullable().optional(),
        is_active: z.boolean().optional(),
        starts_at: z.iso.datetime().nullable().optional(),
        ends_at: z.iso.datetime().nullable().optional(),
    })
    .strict()
    .refine(
        (data) => {
            if (data.max_discount_amount !== undefined && data.max_discount_amount !== null) {
                return data.type === undefined || data.type === "percentage";
            }
            return true;
        },
        { message: "max_discount_amount is only valid for percentage discounts" },
    )
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided",
    });

// Apply authentication to all routes
router.use(authenticate);

/**
 * @openapi
 * /api/discounts:
 *   get:
 *     tags: [Discounts]
 *     summary: List all discounts (active and inactive)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all discounts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/Discount"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 */
router.get(
    "/",
    requireRole("owner", "manager"),
    (req: Request, res: Response) =>
        discountController.listAllDiscounts(req, res),
);

/**
 * @openapi
 * /api/discounts/active:
 *   get:
 *     tags: [Discounts]
 *     summary: List active discounts (for POS)
 *     description: Returns only currently active, date-valid discounts. Any authenticated role.
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
router.get("/active", (req: Request, res: Response) =>
    discountController.getActiveDiscounts(req, res),
);

/**
 * @openapi
 * /api/discounts/{id}:
 *   get:
 *     tags: [Discounts]
 *     summary: Get discount by ID
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
 *         description: Discount found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Discount"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         description: Discount not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 */
router.get(
    "/:id",
    requireRole("owner", "manager"),
    validateParams(idParamsSchema),
    (req: Request, res: Response) => discountController.getDiscount(req, res),
);

/**
 * @openapi
 * /api/discounts:
 *   post:
 *     tags: [Discounts]
 *     summary: Create a new discount
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, type, value, buy_item_id, free_item_id]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               type:
 *                 type: string
 *                 enum: [percentage, fixed_amount, bogo]
 *               value:
 *                 type: number
 *                 nullable: true
 *               applies_to:
 *                 type: string
 *                 enum: [order, item]
 *                 default: order
 *               item_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               buy_item_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               free_item_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               is_active:
 *                 type: boolean
 *                 default: true
 *               starts_at:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               ends_at:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Discount created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Discount"
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
    requireRole("owner", "manager"),
    validateBody(createDiscountSchema),
    (req: Request, res: Response) =>
        discountController.createDiscount(req, res),
);

/**
 * @openapi
 * /api/discounts/{id}:
 *   patch:
 *     tags: [Discounts]
 *     summary: Update a discount
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
 *             minProperties: 1
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               type:
 *                 type: string
 *                 enum: [percentage, fixed_amount, bogo]
 *               value:
 *                 type: number
 *                 nullable: true
 *               buy_item_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               free_item_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               is_active:
 *                 type: boolean
 *               starts_at:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               ends_at:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Discount updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Discount"
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
 *         description: Discount not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 */
router.patch(
    "/:id",
    requireRole("owner", "manager"),
    validateParams(idParamsSchema),
    validateBody(updateDiscountSchema),
    (req: Request, res: Response) =>
        discountController.updateDiscount(req, res),
);

/**
 * @openapi
 * /api/discounts/{id}:
 *   delete:
 *     tags: [Discounts]
 *     summary: Deactivate a discount (soft delete)
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
 *         description: Discount deactivated
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         description: Discount not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 */
router.delete(
    "/:id",
    requireRole("owner", "manager"),
    validateParams(idParamsSchema),
    (req: Request, res: Response) =>
        discountController.deleteDiscount(req, res),
);

export default router;
