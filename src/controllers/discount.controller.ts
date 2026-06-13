import type { Request, Response } from "express";
import { discountService } from "../services/discount.service.ts";

export class DiscountController {
    async getActiveDiscounts(_req: Request, res: Response) {
        const discounts = await discountService.getActiveDiscounts();
        return res.json(discounts);
    }
}

export const discountController = new DiscountController();
