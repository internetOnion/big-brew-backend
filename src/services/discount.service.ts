import {
    discountRepository,
    type Discount,
    type InsertDiscount,
    type UpdateDiscount,
} from "../repositories/discount.repository.ts";
import { AppError } from "../utils/AppError.ts";

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
            input.buyItemId !== undefined ||
            input.freeItemId !== undefined
        ) {
            this.validateDiscountFields(type, {
                value: input.value ?? existing.value,
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
        } else if (type === "fixed_amount") {
            if (fields.value === null || fields.value === undefined) {
                throw AppError.badRequest(
                    "Fixed amount discounts require a value",
                );
            }
        } else if (type === "bogo") {
            if (!fields.buyItemId) {
                throw AppError.badRequest(
                    "BOGO discounts require a buy_item_id",
                );
            }
            if (!fields.freeItemId) {
                throw AppError.badRequest(
                    "BOGO discounts require a free_item_id",
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
