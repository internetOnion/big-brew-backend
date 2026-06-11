import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";
import { categoryController } from "../controllers/category.controller";
import { insertCategorySchema } from "../models/schema/categories.ts";
import {
    authenticate,
    requireRole,
    validateBody,
    validateParams,
} from "../middlewares/index.ts";

const router = Router();

router.use(authenticate);
router.use(requireRole("owner", "manager"));

const insertCategoryValidationSchema = insertCategorySchema
    .pick({
        name: true,
        sortOrder: true,
    })
    .strict();

const categoryIdParamSchema = z
    .object({
        id: z.string().uuid(),
    })
    .strict();

router.get("/", (req: Request, res: Response) =>
    categoryController.getCategory(req, res),
);

router.post(
    "/",
    validateBody(insertCategoryValidationSchema),
    (req: Request, res: Response) => categoryController.addCategory(req, res),
);

router.patch(
    "/:id",
    validateParams(categoryIdParamSchema),
    validateBody(insertCategoryValidationSchema.partial()),
    (req: Request, res: Response) =>
        categoryController.updateCategory(req, res),
);

router.delete(
    "/:id",
    validateParams(categoryIdParamSchema),
    (req: Request, res: Response) =>
        categoryController.deleteCategory(req, res),
);

export default router;
