import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";
import { categoryController } from "../controllers/category.controller";
import { insertCategorySchema } from "../models/schema/categories.ts";
import { authenticate, requireRole, validateBody } from "../middlewares/index.ts";

const router = Router();

router.use(authenticate);
router.use(requireRole("owner", "manager"));

export const insertCategoryValidationSchema = insertCategorySchema.pick({
    name: true,
    sortOrder: true,
}).strict();

router.get("/",
    (req, res) => categoryController.getCategory(req, res));

router.post("/",
    validateBody(insertCategoryValidationSchema),
    (req, res) => categoryController.addCategory(req, res));

router.patch("/:id",
    validateBody(insertCategoryValidationSchema.partial()),
    (req, res) => categoryController.updateCategory(req, res));

router.delete("/:id",
    (req, res) => categoryController.deleteCategory(req, res));

export default router;