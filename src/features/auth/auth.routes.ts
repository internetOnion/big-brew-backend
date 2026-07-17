import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";

import {
    validateBody,
    authenticate,
    requireRole,
} from "../../shared/middlewares/index.ts";
import { authController } from "./auth.controller.ts";

const router = Router();

const signupSchema = z
    .object({
        email: z.email().optional(),
        password: z
            .string()
            .regex(
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,25}$/,
                "Password must be 8-25 characters with at least one uppercase, one lowercase, and one number",
            )
            .optional(),
        name: z.string().min(1).max(100),
        pin: z
            .string()
            .length(6)
            .regex(/^\d+$/, "PIN must be numeric")
            .optional(),
        role: z.enum(["barista", "manager"]).optional(),
    })
    .strict();

const loginSchema = z
    .object({
        email: z.string().email(),
        password: z
            .string()
            .regex(
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,25}$/,
                "Password must be 8-25 characters with at least one uppercase, one lowercase, and one number",
            ),
    })
    .strict();

const verifyPinSchema = z
    .object({
        pin: z.string().length(6).regex(/^\d+$/, "PIN must be numeric"),
    })
    .strict();

/**
 * @openapi
 * /api/auth/signup:
 *   post:
 *     tags: [Auth]
 *     summary: Create a new employee account
 *     description: For barista role, only name and pin are required. For manager role, email and password are also required.
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
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Required for manager role
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 25
 *                 description: Required for manager role. Must contain uppercase, lowercase, and a digit
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               pin:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *                 pattern: "^\\d{6}$"
 *               role:
 *                 type: string
 *                 enum: [barista, manager]
 *     responses:
 *       201:
 *         description: Employee created
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
 *       409:
 *         description: Email or PIN already in use
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 */
router.post(
    "/signup",
    authenticate,
    requireRole("manager"),
    validateBody(signupSchema),
    (req: Request, res: Response) => authController.signup(req, res),
);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password (employee)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 25
 *     responses:
 *       200:
 *         description: Login successful
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *             description: HttpOnly refresh token cookie (path=/api/auth)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/LoginResponse"
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 */
router.post(
    "/login",
    validateBody(loginSchema),
    (req: Request, res: Response) => authController.login(req, res),
);

/**
 * @openapi
 * /api/auth/terminal-login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password (terminal)
 *     description: Authenticates a terminal and returns an access token with terminal identity.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 25
 *     responses:
 *       200:
 *         description: Terminal login successful
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *             description: HttpOnly refresh token cookie (path=/api/auth)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     access_token:
 *                       type: string
 *                     terminal:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         name:
 *                           type: string
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 */
router.post(
    "/terminal-login",
    validateBody(loginSchema),
    (req: Request, res: Response) => authController.terminalLogin(req, res),
);

/**
 * @openapi
 * /api/auth/verify-pin:
 *   post:
 *     tags: [Auth]
 *     summary: Verify a 6-digit PIN and return barista info (no tokens issued)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pin]
 *             properties:
 *               pin:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *                 pattern: "^\\d{6}$"
 *     responses:
 *       200:
 *         description: PIN verified
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [barista, manager]
 *       401:
 *         description: Invalid PIN
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 */
router.post(
    "/verify-pin",
    authenticate,
    validateBody(verifyPinSchema),
    (req: Request, res: Response) => authController.verifyPin(req, res),
);

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token using refresh cookie
 *     responses:
 *       200:
 *         description: New access token issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     access_token:
 *                       type: string
 *                     entity_type:
 *                       type: string
 *                       enum: [employee, terminal]
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 */
router.post("/refresh", (req: Request, res: Response) =>
    authController.refresh(req, res),
);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout and invalidate refresh token
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: Logged out successfully
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 */
router.post("/logout", authenticate, (req: Request, res: Response) =>
    authController.logout(req, res),
);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current authenticated entity profile
 *     description: Returns employee or terminal profile depending on the JWT type.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 */
router.get("/me", authenticate, (req: Request, res: Response) =>
    authController.me(req, res),
);

export default router;
