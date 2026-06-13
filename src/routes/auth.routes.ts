import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";

import {
    validateBody,
    authenticate,
    requireRole,
} from "../middlewares/index.ts";
import { authController } from "../controllers/index.ts";

const router = Router();

const signupSchema = z
    .object({
        email: z.string().email(),
        password: z
            .string()
            .regex(
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,25}$/,
                "Password must be 8-25 characters with at least one uppercase, one lowercase, and one number",
            ),
        name: z.string().min(1).max(100),
        pin: z
            .string()
            .length(6)
            .regex(/^\d+$/, "PIN must be numeric")
            .optional(),
        role: z.enum(["barista", "manager", "owner"]).optional(),
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

const pinLoginSchema = z
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
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 25
 *                 description: Must contain uppercase, lowercase, and a digit
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
 *                 enum: [barista, manager, owner]
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
    requireRole("owner", "manager"),
    validateBody(signupSchema),
    (req: Request, res: Response) => authController.signup(req, res),
);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password
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
 * /api/auth/pin-login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with 6-digit PIN
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
 *         description: Invalid PIN
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 */
router.post(
    "/pin-login",
    validateBody(pinLoginSchema),
    (req: Request, res: Response) => authController.pinLogin(req, res),
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
 *               $ref: "#/components/schemas/RefreshResponse"
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
 *     summary: Get current authenticated employee profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current employee profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: "#/components/schemas/Employee"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 */
router.get("/me", authenticate, (req: Request, res: Response) =>
    authController.me(req, res),
);

export default router;
