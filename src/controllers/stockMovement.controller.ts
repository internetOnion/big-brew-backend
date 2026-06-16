import type { Request, Response } from "express";
import { stockMovementService } from "../services/stockMovement.service.ts";
import type { StockReason } from "../types/index.ts";

export class StockMovementController {
    async listMovements(req: Request, res: Response) {
        const { ingredientId, reason, from, to } = req.query;

        const filters: {
            ingredientId?: string;
            reason?: StockReason;
            from?: Date;
            to?: Date;
        } = {};

        if (ingredientId) filters.ingredientId = ingredientId as string;
        if (reason) filters.reason = reason as StockReason;
        if (from) filters.from = new Date(from as string);
        if (to) filters.to = new Date(to as string);

        const movements = await stockMovementService.listMovements(filters);
        return res.json(movements);
    }
}

export const stockMovementController = new StockMovementController();
