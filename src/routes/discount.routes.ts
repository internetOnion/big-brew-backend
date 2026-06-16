import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";
import { discountController } from "../controllers/discount.controller.ts";
import {
    authenticate,
    requireRole,
    validateBody,
    validateParams,
} from "../middlewares/index.ts";

const router = Router();

const idParamsSchema = z.object({ id: z.uuid() });

const createDiscountSchema = z
    .object({
        name: z.string().min(1).max(100),
        type: z.enum(["percentage", "fixed_amount", "bogo"]),
        value: z.number().positive().nullable(),
        buy_item_id: z.uuid().nullable(),
        free_item_id: z.uuid().nullable(),
        is_active: z.boolean().default(true),
        starts_at: z.iso.datetime().nullable().optional(),
        ends_at: z.iso.datetime().nullable().optional(),
    })
    .strict()
    .refine(
        (data) => {
            if (data.type === "percentage" || data.type === "fixed_amount") {
                return (
                    data.value !== null &&
                    data.buy_item_id === null &&
                    data.free_item_id === null
                );
            }
            if (data.type === "bogo") {
                return (
                    data.value === null &&
                    data.buy_item_id !== null &&
                    data.free_item_id !== null
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
        buy_item_id: z.uuid().nullable().optional(),
        free_item_id: z.uuid().nullable().optional(),
        is_active: z.boolean().optional(),
        starts_at: z.iso.datetime().nullable().optional(),
        ends_at: z.iso.datetime().nullable().optional(),
    })
    .strict()
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
