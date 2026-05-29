import { Router } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import type { Request, Response } from "express";

import { db } from "../models/index.ts";
import { settingsTable } from "../models/schema/index.ts";
import { AppError } from "../utils/AppError.ts";
import { validateBody } from "../middlewares/index.ts";

const router = Router();

const updateSettingsSchema = z
    .object({
        storeName: z.string().optional(),
        storeAddress: z.string().nullable().optional(),
        currencySymbol: z.string().optional(),
        receiptHeader: z.string().nullable().optional(),
        receiptFooter: z.string().nullable().optional(),
        taxLabel: z.string().optional(),
        logoUrl: z.string().nullable().optional(),
    })
    .strict();

router.get("/health", (_req: Request, res: Response) => {
    return res.json({ status: "ok" });
});

router.get("/settings", async (_req: Request, res: Response) => {
    const result = await db
        .select()
        .from(settingsTable)
        .where(eq(settingsTable.id, 1));
    const data = result[0];
    if (!data) {
        throw AppError.notFound("Settings not found");
    }
    return res.json(data);
});

router.patch(
    "/settings",
    validateBody(updateSettingsSchema),
    async (req: Request, res: Response) => {
        const updated = await db
            .update(settingsTable)
            .set({ ...req.body, updatedAt: new Date() })
            .where(eq(settingsTable.id, 1))
            .returning();

        return res.json(updated[0]);
    },
);

export default router;
