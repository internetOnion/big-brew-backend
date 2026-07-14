import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";

import {
    validateBody,
    validateParams,
    authenticate,
    requireRole,
} from "../../shared/middlewares/index.ts";
import { terminalController } from "./terminal.controller.ts";

const router = Router();

const idParamsSchema = z.object({ id: z.uuid() });

const createTerminalSchema = z
    .object({
        name: z.string().min(1).max(100),
        email: z.string().email(),
        password: z
            .string()
            .regex(
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,25}$/,
                "Password must be 8-25 characters with at least one uppercase, one lowercase, and one number",
            ),
    })
    .strict();

const updateTerminalSchema = z
    .object({
        name: z.string().min(1).max(100).optional(),
        password: z
            .string()
            .regex(
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,25}$/,
                "Password must be 8-25 characters with at least one uppercase, one lowercase, and one number",
            )
            .optional(),
        isActive: z.boolean().optional(),
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided",
    });

/**
 * @openapi
 * /api/terminals:
 *   get:
 *     tags: [Terminals]
 *     summary: List all terminals
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of terminals
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/Terminal"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 */
router.get(
    "/",
    authenticate,
    requireRole("manager"),
    (req: Request, res: Response) => terminalController.listTerminals(req, res),
);

/**
 * @openapi
 * /api/terminals/{id}:
 *   get:
 *     tags: [Terminals]
 *     summary: Get terminal by ID
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
 *         description: Terminal found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: "#/components/schemas/Terminal"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         description: Terminal not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 */
router.get(
    "/:id",
    authenticate,
    requireRole("manager"),
    validateParams(idParamsSchema),
    (req: Request, res: Response) =>
        terminalController.getTerminalById(req, res),
);

/**
 * @openapi
 * /api/terminals:
 *   post:
 *     tags: [Terminals]
 *     summary: Create a new terminal
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 25
 *                 description: Must contain uppercase, lowercase, and a digit
 *     responses:
 *       201:
 *         description: Terminal created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: "#/components/schemas/Terminal"
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
 *       409:
 *         description: Email already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 */
router.post(
    "/",
    authenticate,
    requireRole("manager"),
    validateBody(createTerminalSchema),
    (req: Request, res: Response) =>
        terminalController.createTerminal(req, res),
);

/**
 * @openapi
 * /api/terminals/{id}:
 *   patch:
 *     tags: [Terminals]
 *     summary: Update a terminal
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
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 25
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Terminal updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: "#/components/schemas/Terminal"
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
 *         description: Terminal not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 */
router.patch(
    "/:id",
    authenticate,
    requireRole("manager"),
    validateParams(idParamsSchema),
    validateBody(updateTerminalSchema),
    (req: Request, res: Response) =>
        terminalController.updateTerminal(req, res),
);

/**
 * @openapi
 * /api/terminals/{id}:
 *   delete:
 *     tags: [Terminals]
 *     summary: Delete a terminal
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
 *         description: Terminal deleted
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         description: Terminal not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 */
router.delete(
    "/:id",
    authenticate,
    requireRole("manager"),
    validateParams(idParamsSchema),
    (req: Request, res: Response) =>
        terminalController.deleteTerminal(req, res),
);

export default router;
