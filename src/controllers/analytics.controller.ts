import type { Request, Response } from "express";
import { analyticsService } from "../services/analytics.service.ts";
import type { GroupBy } from "../repositories/analytics.repository.ts";

export class AnalyticsController {
    async getRevenue(req: Request, res: Response) {
        const { from, to, groupBy } = req.query;

        const data = await analyticsService.getRevenue(
            new Date(from as string),
            new Date(to as string),
            (groupBy as GroupBy) ?? "day",
        );

        return res.json(data);
    }

    async getTopItems(req: Request, res: Response) {
        const { from, to, sortBy, limit } = req.query;

        const data = await analyticsService.getTopItems(
            new Date(from as string),
            new Date(to as string),
            (sortBy as "quantity" | "revenue") ?? "quantity",
            limit ? parseInt(limit as string, 10) : 10,
        );

        return res.json(data);
    }

    async getExpenseBreakdown(req: Request, res: Response) {
        const { from, to } = req.query;

        const data = await analyticsService.getExpenseBreakdown(
            new Date(from as string),
            new Date(to as string),
        );

        return res.json(data);
    }

    async getSummary(req: Request, res: Response) {
        const { from, to } = req.query;

        const data = await analyticsService.getSummary(
            new Date(from as string),
            new Date(to as string),
        );

        return res.json(data);
    }
}

export const analyticsController = new AnalyticsController();
