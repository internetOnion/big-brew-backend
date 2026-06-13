import {
    discountRepository,
    type Discount,
} from "../repositories/discount.repository.ts";

export class DiscountService {
    async getActiveDiscounts(): Promise<Discount[]> {
        return discountRepository.findActive();
    }
}

export const discountService = new DiscountService();
