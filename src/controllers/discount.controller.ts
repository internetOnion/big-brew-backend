import type { Request, Response } from "express";
import { discountService } from "../services/discount.service.ts";

export class DiscountController {
    async getActiveDiscounts(_req: Request, res: Response) {
        const discounts = await discountService.getActiveDiscounts();
        return res.json(discounts);
    }

    async listAllDiscounts(_req: Request, res: Response) {
        const discounts = await discountService.listAllDiscounts();
        return res.json(discounts);
    }

    async getDiscount(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const discount = await discountService.getDiscount(id);
        return res.json(discount);
    }

    async createDiscount(req: Request, res: Response) {
        const {
            name,
            type,
            value,
            buy_item_id,
            free_item_id,
            is_active,
            starts_at,
            ends_at,
        } = req.body;

        const discount = await discountService.createDiscount({
            name,
            type,
            value: value !== undefined && value !== null ? String(value) : null,
            buyItemId: buy_item_id ?? null,
            freeItemId: free_item_id ?? null,
            isActive: is_active,
            ...(starts_at && { startsAt: new Date(starts_at) }),
            ...(ends_at && { endsAt: new Date(ends_at) }),
        });

        return res.status(201).json(discount);
    }

    async updateDiscount(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const {
            name,
            type,
            value,
            buy_item_id,
            free_item_id,
            is_active,
            starts_at,
            ends_at,
        } = req.body;

        const input: Record<string, unknown> = {};
        if (name !== undefined) input.name = name;
        if (type !== undefined) input.type = type;
        if (value !== undefined)
            input.value = value !== null ? String(value) : null;
        if (buy_item_id !== undefined) input.buyItemId = buy_item_id;
        if (free_item_id !== undefined) input.freeItemId = free_item_id;
        if (is_active !== undefined) input.isActive = is_active;
        if (starts_at !== undefined)
            input.startsAt = starts_at ? new Date(starts_at) : null;
        if (ends_at !== undefined)
            input.endsAt = ends_at ? new Date(ends_at) : null;

        const discount = await discountService.updateDiscount(id, input);
        return res.json(discount);
    }

    async deleteDiscount(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        await discountService.deleteDiscount(id);
        return res.status(204).send();
    }
}

export const discountController = new DiscountController();
