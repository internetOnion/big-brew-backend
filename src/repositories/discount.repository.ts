import { eq, and } from "drizzle-orm";
import { db } from "../models/index.ts";
import { discountsTable } from "../models/schema/index.ts";

export interface Discount {
    id: string;
    name: string;
    type: "percentage" | "fixed_amount" | "bogo";
    value: string | null;
    buyItemId: string | null;
    freeItemId: string | null;
    isActive: boolean;
    startsAt: Date | null;
    endsAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export class DiscountRepository {
    async findActive(): Promise<Discount[]> {
        const now = new Date();

        const results = await db
            .select()
            .from(discountsTable)
            .where(
                and(
                    eq(discountsTable.isActive, true),
                    // Check date range if set
                    // starts_at is null OR starts_at <= now
                    // ends_at is null OR ends_at >= now
                ),
            );

        // Filter by date range in application code
        return results.filter((discount) => {
            if (discount.startsAt && discount.startsAt > now) return false;
            if (discount.endsAt && discount.endsAt < now) return false;
            return true;
        });
    }

    async findById(id: string): Promise<Discount | null> {
        const result = await db
            .select()
            .from(discountsTable)
            .where(eq(discountsTable.id, id))
            .limit(1);

        return result[0] ?? null;
    }
}

export const discountRepository = new DiscountRepository();
