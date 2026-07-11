import {
    discountRepository,
    type Discount,
    type InsertDiscount,
    type UpdateDiscount,
} from "./discount.repository.ts";
import { AppError } from "../../shared/utils/AppError.ts";

export class DiscountService {
    async getActiveDiscounts(): Promise<Discount[]> {
        return discountRepository.findActive();
    }

    async listAllDiscounts(): Promise<Discount[]> {
        return discountRepository.findAll();
    }

    async getDiscount(id: string): Promise<Discount> {
        const discount = await discountRepository.findById(id);
        if (!discount) {
            throw AppError.notFound("Discount not found");
        }
        return discount;
    }

    async createDiscount(input: InsertDiscount): Promise<Discount> {
        this.validateDiscountFields(input.type, input);

        return discountRepository.insert({
            ...input,
            isActive: input.isActive ?? true,
        });
    }

    async updateDiscount(id: string, input: UpdateDiscount): Promise<Discount> {
        const existing = await this.getDiscount(id);

        const type = input.type ?? existing.type;
        if (
            input.type ||
            input.value !== undefined ||
            input.maxDiscountAmount !== undefined ||
            input.appliesTo !== undefined ||
            input.itemId !== undefined ||
            input.buyItemId !== undefined ||
            input.freeItemId !== undefined
        ) {
            this.validateDiscountFields(type, {
                value: input.value ?? existing.value,
                maxDiscountAmount:
                    input.maxDiscountAmount ?? existing.maxDiscountAmount,
                appliesTo: input.appliesTo ?? existing.appliesTo,
                itemId: input.itemId ?? existing.itemId,
                buyItemId: input.buyItemId ?? existing.buyItemId,
                freeItemId: input.freeItemId ?? existing.freeItemId,
            });
        }

        return discountRepository.update(id, input);
    }

    async deleteDiscount(id: string): Promise<Discount> {
        await this.getDiscount(id);
        return discountRepository.deactivate(id);
    }

    private validateDiscountFields(
        type: string,
        fields: {
            value?: string | null;
            maxDiscountAmount?: string | null;
            appliesTo?: "order" | "item";
            itemId?: string | null;
            buyItemId?: string | null;
            freeItemId?: string | null;
        },
    ): void {
        if (type === "percentage") {
            if (fields.value === null || fields.value === undefined) {
                throw AppError.badRequest(
                    "Percentage discounts require a value",
                );
            }
            if (
                fields.maxDiscountAmount !== undefined &&
                fields.maxDiscountAmount !== null
            ) {
                const cap = parseFloat(fields.maxDiscountAmount);
                if (isNaN(cap) || cap <= 0) {
                    throw AppError.badRequest(
                        "Max discount amount must be a positive number",
                    );
                }
            }
            if (fields.appliesTo === "item" && !fields.itemId) {
                throw AppError.badRequest(
                    "Item-level percentage discounts require an item_id",
                );
            }
        } else if (type === "fixed_amount") {
            if (fields.value === null || fields.value === undefined) {
                throw AppError.badRequest(
                    "Fixed amount discounts require a value",
                );
            }
            if (
                fields.maxDiscountAmount !== undefined &&
                fields.maxDiscountAmount !== null
            ) {
                throw AppError.badRequest(
                    "max_discount_amount is only valid for percentage discounts",
                );
            }
            if (fields.appliesTo === "item" && !fields.itemId) {
                throw AppError.badRequest(
                    "Item-level fixed amount discounts require an item_id",
                );
            }
        } else if (type === "bogo") {
            if (!fields.buyItemId && !fields.freeItemId) {
                throw AppError.badRequest(
                    "BOGO discounts require at least a buy_item_id or free_item_id",
                );
            }
            if (
                fields.maxDiscountAmount !== undefined &&
                fields.maxDiscountAmount !== null
            ) {
                throw AppError.badRequest(
                    "max_discount_amount is only valid for percentage discounts",
                );
            }
            if (fields.value !== null && fields.value !== undefined) {
                throw AppError.badRequest(
                    "BOGO discounts must not have a value",
                );
            }
        }
    }
}

export const discountService = new DiscountService();
