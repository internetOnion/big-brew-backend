import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";

import {
    validateBody,
    authenticate,
    requireRole,
} from "../middlewares/index.ts";
import { employeeController } from "../controllers/index.ts";

const router = Router();

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

router.patch(
    "/:id",
    authenticate,
    requireRole("owner", "manager"),
    validateBody(updateEmployeeSchema),
    (req: Request, res: Response) =>
        employeeController.updateEmployee(req, res),
);

router.delete(
    "/:id",
    authenticate,
    requireRole("owner", "manager"),
    (req: Request, res: Response) =>
        employeeController.deleteEmployee(req, res),
);

export default router;
