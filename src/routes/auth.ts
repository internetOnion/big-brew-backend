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

// ── Schemas ────────────────────────────────────────────────

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

// ── Routes ─────────────────────────────────────────────────

router.post(
    "/signup",
    authenticate,
    requireRole("owner", "manager"),
    validateBody(signupSchema),
    (req: Request, res: Response) => authController.signup(req, res),
);

router.post(
    "/login",
    validateBody(loginSchema),
    (req: Request, res: Response) => authController.login(req, res),
);

router.post(
    "/pin-login",
    validateBody(pinLoginSchema),
    (req: Request, res: Response) => authController.pinLogin(req, res),
);

router.post("/refresh", (req: Request, res: Response) =>
    authController.refresh(req, res),
);

router.post("/logout", authenticate, (req: Request, res: Response) =>
    authController.logout(req, res),
);

router.get("/me", authenticate, (req: Request, res: Response) =>
    authController.me(req, res),
);

router.patch(
    "/employees/:id",
    authenticate,
    requireRole("owner", "manager"),
    validateBody(updateEmployeeSchema),
    (req: Request, res: Response) => authController.updateEmployee(req, res),
);

export default router;
