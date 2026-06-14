import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";
import {
    validateBody,
    validateParams,
    validateQuery,
    authenticate,
    requireRole,
} from "../middlewares/index.ts";
import { expenseController } from "../controllers/expense.controller.ts";

const router = Router();

const EXPENSE_CATEGORIES = [
    "Supplies",
    "Utilities",
    "Rent",
    "Maintenance",
    "Ingredients",
    "Equipment",
    "Marketing",
    "Other",
] as const;

const idParamsSchema = z.object({ id: z.uuid() });

const createExpenseSchema = z
    .object({
        description: z.string().min(1).max(255),
        amount: z.number().positive(),
        category: z.enum(EXPENSE_CATEGORIES),
        recordedAt: z.iso.datetime().optional(),
    })
    .strict();

const updateExpenseSchema = z
    .object({
        description: z.string().min(1).max(255).optional(),
        amount: z.number().positive().optional(),
        category: z.enum(EXPENSE_CATEGORIES).optional(),
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided",
    });

const listQuerySchema = z
    .object({
        from: z.iso.datetime().optional(),
        to: z.iso.datetime().optional(),
        category: z.enum(EXPENSE_CATEGORIES).optional(),
    })
    .strict();

const summaryQuerySchema = z
    .object({
        from: z.iso.datetime(),
        to: z.iso.datetime(),
    })
    .strict();

/**
 * @openapi
 * /api/expenses:
 *   get:
 *     tags: [Expenses]
 *     summary: List expenses with optional filters
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [Supplies, Utilities, Rent, Maintenance, Ingredients, Equipment, Marketing, Other]
 *     responses:
 *       200:
 *         description: List of expenses
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/Expense"
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
    (req: Request, res: Response) => expenseController.listExpenses(req, res),
);

/**
 * @openapi
 * /api/expenses/summary:
 *   get:
 *     tags: [Expenses]
 *     summary: Get expense summary grouped by categoryy
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
 *         description: Expense summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: string
 *                 byCategory:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       category:
 *                         type: string
 *                         nullable: true
 *                       total:
 *                         type: string
 *                       count:
 *                         type: number
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 */
router.get(
    "/summary",
    authenticate,
    requireRole("owner", "manager"),
    validateQuery(summaryQuerySchema),
    (req: Request, res: Response) => expenseController.getSummary(req, res),
);

/**
 * @openapi
 * /api/expenses/{id}:
 *   get:
 *     tags: [Expenses]
 *     summary: Get expense by ID
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
 *         description: Expense found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Expense"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         description: Expense not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 */
router.get(
    "/:id",
    authenticate,
    requireRole("owner", "manager"),
    validateParams(idParamsSchema),
    (req: Request, res: Response) => expenseController.getExpense(req, res),
);

/**
 * @openapi
 * /api/expenses:
 *   post:
 *     tags: [Expenses]
 *     summary: Create a new expense
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [description, amount, category]
 *             properties:
 *               description:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *               amount:
 *                 type: number
 *                 exclusiveMinimum: 0
 *               category:
 *                 type: string
 *                 enum: [Supplies, Utilities, Rent, Maintenance, Ingredients, Equipment, Marketing, Other]
 *               recordedAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Expense created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Expense"
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
    authenticate,
    requireRole("owner", "manager"),
    validateBody(createExpenseSchema),
    (req: Request, res: Response) => expenseController.createExpense(req, res),
);

/**
 * @openapi
 * /api/expenses/{id}:
 *   patch:
 *     tags: [Expenses]
 *     summary: Update an expense
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
 *               description:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *               amount:
 *                 type: number
 *                 exclusiveMinimum: 0
 *               category:
 *                 type: string
 *                 enum: [Supplies, Utilities, Rent, Maintenance, Ingredients, Equipment, Marketing, Other]
 *     responses:
 *       200:
 *         description: Expense updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Expense"
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
 *         description: Expense not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 */
router.patch(
    "/:id",
    authenticate,
    requireRole("owner", "manager"),
    validateParams(idParamsSchema),
    validateBody(updateExpenseSchema),
    (req: Request, res: Response) => expenseController.updateExpense(req, res),
);

/**
 * @openapi
 * /api/expenses/{id}:
 *   delete:
 *     tags: [Expenses]
 *     summary: Delete an expense
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
 *         description: Expense deleted
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         description: Expense not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 */
router.delete(
    "/:id",
    authenticate,
    requireRole("owner", "manager"),
    validateParams(idParamsSchema),
    (req: Request, res: Response) => expenseController.deleteExpense(req, res),
);

export default router;
