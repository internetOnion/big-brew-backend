import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";

import {
    validateBody,
    validateParams,
    authenticate,
    requireRole,
} from "../middlewares/index.ts";
import { employeeController } from "../controllers/index.ts";

const router = Router();

const idParamsSchema = z.object({ id: z.uuid() });

const updateEmployeeSchema = z
    .object({
        name: z.string().min(1).max(100).optional(),
        email: z.string().email().optional(),
        pin: z
            .string()
            .length(6)
            .regex(/^\d+$/, "PIN must be numeric")
            .optional(),
        password: z
            .string()
            .regex(
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,25}$/,
                "Password must be 8-25 characters with at least one uppercase, one lowercase, and one number",
            )
            .optional(),
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided",
    });

/**
 * @openapi
 * /api/employees/{id}:
 *   get:
 *     tags: [Employees]
 *     summary: Get employee by ID
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
 *         description: Employee found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: "#/components/schemas/Employee"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         description: Employee not found
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
    (req: Request, res: Response) =>
        employeeController.getEmployeeById(req, res),
);

/**
 * @openapi
 * /api/employees/{id}:
 *   patch:
 *     tags: [Employees]
 *     summary: Update an employee
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
 *               email:
 *                 type: string
 *                 format: email
 *               pin:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *                 pattern: "^\\d{6}$"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 25
 *     responses:
 *       200:
 *         description: Employee updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: "#/components/schemas/Employee"
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
 *         description: Employee not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *       409:
 *         description: Email or PIN conflict
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
    validateBody(updateEmployeeSchema),
    (req: Request, res: Response) =>
        employeeController.updateEmployee(req, res),
);

/**
 * @openapi
 * /api/employees/{id}:
 *   delete:
 *     tags: [Employees]
 *     summary: Deactivate an employee
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
 *         description: Employee deactivated
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         description: Employee not found
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
    (req: Request, res: Response) =>
        employeeController.deleteEmployee(req, res),
);

export default router;
