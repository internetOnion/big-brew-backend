import { Router } from "express";
import { z } from "zod";
import { orderController } from "../controllers/order.controller.ts";
import {
    authenticate,
    requireRole,
    validateBody,
    validateParams,
    validateQuery,
} from "../middlewares/index.ts";

const router = Router();

// Validation schemas
const idParamsSchema = z.object({ id: z.uuid() });

const createOrderSchema = z
    .object({
        dining_option: z.enum(["dine_in", "take_away"]),
        discount_id: z.uuid().optional(),
        items: z
            .array(
                z
                    .object({
                        menu_item_id: z.uuid(),
                        quantity: z.number().int().positive(),
                        unit_price: z.number().positive(),
                        modifier_option_ids: z.array(z.uuid()).default([]),
                    })
                    .strict(),
            )
            .min(1, "At least one item is required"),
        payment_method: z.enum(["cash", "qr"]).optional(),
        amount_received: z.number().positive().optional(),
    })
    .strict()
    .refine(
        (data) => {
            if (data.payment_method === "cash") {
                return data.amount_received !== undefined;
            }
            return true;
        },
        {
            message: "Amount received is required for cash payments",
            path: ["amount_received"],
        },
    );

const updateStatusSchema = z
    .object({
        status: z.enum(["pending", "completed"]),
    })
    .strict();

const processPaymentSchema = z
    .object({
        payment_method: z.enum(["cash", "qr"]),
        amount_received: z.number().positive().optional(),
        notes: z.string().optional(),
    })
    .strict()
    .refine(
        (data) => {
            if (data.payment_method === "cash") {
                return data.amount_received !== undefined;
            }
            return true;
        },
        {
            message: "Amount received is required for cash payments",
            path: ["amount_received"],
        },
    );

const requestVoidSchema = z
    .object({
        reason: z.string().min(1, "Void reason is required"),
    })
    .strict();

const listOrdersQuerySchema = z
    .object({
        status: z.string().optional(),
        created_by_id: z.uuid().optional(),
        limit: z.coerce.number().int().positive().optional(),
        offset: z.coerce.number().int().min(0).optional(),
    })
    .strict();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @openapi
 * /api/orders:
 *   post:
 *     tags: [Orders]
 *     summary: Create a new order with optional payment
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/CreateOrderRequest"
 *     responses:
 *       201:
 *         description: Order created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Order"
 *       400:
 *         description: Validation error
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       404:
 *         description: Menu item or modifier option not found
 */
router.post(
    "/",
    requireRole("barista", "manager", "owner"),
    validateBody(createOrderSchema),
    (req, res) => orderController.createOrder(req, res),
);

/**
 * @openapi
 * /api/orders:
 *   get:
 *     tags: [Orders]
 *     summary: List orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Comma-separated list of statuses to filter by
 *       - in: query
 *         name: created_by_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by employee who created the order
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Number of orders to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Number of orders to skip
 *     responses:
 *       200:
 *         description: List of orders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/Order"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 */
router.get(
    "/",
    requireRole("barista", "manager", "owner"),
    validateQuery(listOrdersQuerySchema),
    (req, res) => orderController.listOrders(req, res),
);

/**
 * @openapi
 * /api/orders/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: Get an order by ID
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
 *         description: Order details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Order"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       404:
 *         description: Order not found
 */
router.get(
    "/:id",
    requireRole("barista", "manager", "owner"),
    validateParams(idParamsSchema),
    (req, res) => orderController.getOrder(req, res),
);

/**
 * @openapi
 * /api/orders/{id}/status:
 *   patch:
 *     tags: [Orders]
 *     summary: Update order status
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
 *             $ref: "#/components/schemas/UpdateOrderStatusRequest"
 *     responses:
 *       200:
 *         description: Order status updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Order"
 *       400:
 *         description: Invalid status transition
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Order not found
 */
router.patch(
    "/:id/status",
    requireRole("barista", "manager", "owner"),
    validateParams(idParamsSchema),
    validateBody(updateStatusSchema),
    (req, res) => orderController.updateOrderStatus(req, res),
);

/**
 * @openapi
 * /api/orders/{id}/pay:
 *   post:
 *     tags: [Orders]
 *     summary: Process payment for an order
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
 *             $ref: "#/components/schemas/ProcessPaymentRequest"
 *     responses:
 *       200:
 *         description: Payment processed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Order"
 *       400:
 *         description: Invalid payment
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       404:
 *         description: Order not found
 */
router.post(
    "/:id/pay",
    requireRole("barista", "manager", "owner"),
    validateParams(idParamsSchema),
    validateBody(processPaymentSchema),
    (req, res) => orderController.processPayment(req, res),
);

/**
 * @openapi
 * /api/orders/{id}/payments:
 *   get:
 *     tags: [Orders]
 *     summary: Get payments for an order
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
 *         description: List of payments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/Payment"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       404:
 *         description: Order not found
 */
router.get(
    "/:id/payments",
    requireRole("barista", "manager", "owner"),
    validateParams(idParamsSchema),
    (req, res) => orderController.getPayments(req, res),
);

/**
 * @openapi
 * /api/orders/{id}/void-request:
 *   post:
 *     tags: [Orders]
 *     summary: Request void for an order
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
 *             $ref: "#/components/schemas/RequestVoidRequest"
 *     responses:
 *       200:
 *         description: Void requested
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Order"
 *       400:
 *         description: Invalid request
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       404:
 *         description: Order not found
 */
router.post(
    "/:id/void-request",
    requireRole("barista", "manager", "owner"),
    validateParams(idParamsSchema),
    validateBody(requestVoidSchema),
    (req, res) => orderController.requestVoid(req, res),
);

/**
 * @openapi
 * /api/orders/{id}/void-approve:
 *   post:
 *     tags: [Orders]
 *     summary: Approve void request
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
 *         description: Void approved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Order"
 *       400:
 *         description: No pending void request
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         description: Forbidden (manager/owner only)
 *       404:
 *         description: Order not found
 */
router.post(
    "/:id/void-approve",
    requireRole("manager", "owner"),
    validateParams(idParamsSchema),
    (req, res) => orderController.approveVoid(req, res),
);

/**
 * @openapi
 * /api/orders/{id}/void-reject:
 *   post:
 *     tags: [Orders]
 *     summary: Reject void request
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
 *         description: Void rejected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Order"
 *       400:
 *         description: No pending void request
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         description: Forbidden (manager/owner only)
 *       404:
 *         description: Order not found
 */
router.post(
    "/:id/void-reject",
    requireRole("manager", "owner"),
    validateParams(idParamsSchema),
    (req, res) => orderController.rejectVoid(req, res),
);

export default router;
