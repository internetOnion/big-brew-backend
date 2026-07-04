import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";
import { expenseCategoryController } from "./expense-category.controller.ts";
import {
    authenticate,
    requireRole,
    validateBody,
    validateParams,
} from "../../shared/middlewares/index.ts";

const router = Router();

const idParamsSchema = z.object({ id: z.uuid() });

const createBodySchema = z
    .object({
        name: z.string().min(1).max(100),
    })
    .strict();

const updateBodySchema = z
    .object({
        name: z.string().min(1).max(100),
    })
    .strict();

router.use(authenticate);
router.use(requireRole("owner", "manager"));

/**
 * @openapi
 * /api/expenses/categories:
 *   get:
 *     tags: [Expenses]
 *     summary: List all expense categories
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of expense categories
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 */
router.get("/", (req: Request, res: Response) =>
    expenseCategoryController.listCategories(req, res),
);

/**
 * @openapi
 * /api/expenses/categories/{id}:
 *   get:
 *     tags: [Expenses]
 *     summary: Get expense category by ID
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
 *         description: Expense category found
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         description: Expense category not found
 */
router.get(
    "/:id",
    validateParams(idParamsSchema),
    (req: Request, res: Response) =>
        expenseCategoryController.getCategory(req, res),
);

/**
 * @openapi
 * /api/expenses/categories:
 *   post:
 *     tags: [Expenses]
 *     summary: Create a new expense category
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *     responses:
 *       201:
 *         description: Expense category created
 *       400:
 *         description: Validation error
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       409:
 *         description: Category name already exists
 */
router.post(
    "/",
    validateBody(createBodySchema),
    (req: Request, res: Response) =>
        expenseCategoryController.createCategory(req, res),
);

/**
 * @openapi
 * /api/expenses/categories/{id}:
 *   patch:
 *     tags: [Expenses]
 *     summary: Update an expense category
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
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *     responses:
 *       200:
 *         description: Expense category updated
 *       400:
 *         description: Validation error
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         description: Expense category not found
 *       409:
 *         description: Category name already exists
 */
router.patch(
    "/:id",
    validateParams(idParamsSchema),
    validateBody(updateBodySchema),
    (req: Request, res: Response) =>
        expenseCategoryController.updateCategory(req, res),
);

/**
 * @openapi
 * /api/expenses/categories/{id}:
 *   delete:
 *     tags: [Expenses]
 *     summary: Delete an expense category
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
 *         description: Expense category deleted
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         description: Expense category not found
 */
router.delete(
    "/:id",
    validateParams(idParamsSchema),
    (req: Request, res: Response) =>
        expenseCategoryController.deleteCategory(req, res),
);

export default router;
