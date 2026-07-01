import { eq, desc } from "drizzle-orm";
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

export interface InsertDiscount {
    name: string;
    type: "percentage" | "fixed_amount" | "bogo";
    value: string | null;
    buyItemId: string | null;
    freeItemId: string | null;
    isActive?: boolean;
    startsAt?: Date | null;
    endsAt?: Date | null;
}

export interface UpdateDiscount {
    name?: string;
    type?: "percentage" | "fixed_amount" | "bogo";
    value?: string | null;
    buyItemId?: string | null;
    freeItemId?: string | null;
    isActive?: boolean;
    startsAt?: Date | null;
    endsAt?: Date | null;
}

export class DiscountRepository {
    async findActive(): Promise<Discount[]> {
        const now = new Date();

        const results = await db
            .select()
            .from(discountsTable)
            .where(eq(discountsTable.isActive, true));

        return results.filter((discount) => {
            if (discount.startsAt && discount.startsAt > now) return false;
            if (discount.endsAt && discount.endsAt < now) return false;
            return true;
        });
    }

    async findAll(): Promise<Discount[]> {
        return db
            .select()
            .from(discountsTable)
            .orderBy(desc(discountsTable.createdAt));
    }

    async findById(id: string): Promise<Discount | null> {
        const result = await db
            .select()
            .from(discountsTable)
            .where(eq(discountsTable.id, id))
            .limit(1);

        return result[0] ?? null;
    }

    async insert(data: InsertDiscount): Promise<Discount> {
        const result = await db
            .insert(discountsTable)
            .values({
                name: data.name,
                type: data.type,
                value: data.value,
                buyItemId: data.buyItemId,
                freeItemId: data.freeItemId,
                ...(data.isActive !== undefined && {
                    isActive: data.isActive,
                }),
                ...(data.startsAt !== undefined && {
                    startsAt: data.startsAt,
                }),
                ...(data.endsAt !== undefined && { endsAt: data.endsAt }),
            })
            .returning();

        return result[0];
    }

    async update(id: string, data: UpdateDiscount): Promise<Discount> {
        const result = await db
            .update(discountsTable)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(discountsTable.id, id))
            .returning();

        return result[0];
    }

    async deactivate(id: string): Promise<Discount> {
        const result = await db
            .update(discountsTable)
            .set({ isActive: false, updatedAt: new Date() })
            .where(eq(discountsTable.id, id))
            .returning();

        return result[0];
    }
}

export const discountRepository = new DiscountRepository();
