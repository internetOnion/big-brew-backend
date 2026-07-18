import { eq, inArray, isNull } from "drizzle-orm";
import { db } from "../../shared/models/index.ts";
import { ingredientsTable } from "../../shared/models/schema/index.ts";
import type { IngredientUnit } from "../../shared/types/index.ts";

export interface Ingredient {
    id: string;
    name: string;
    unit: IngredientUnit;
    stockQuantity: string;
    lowStockThreshold: string;
    createdAt: Date;
    updatedAt: Date;
}
export type InsertIngredient = Omit<
    Ingredient,
    "id" | "createdAt" | "updatedAt"
>;

export type UpdateIngredient = Partial<InsertIngredient>;

export class IngredientRepository {
    async findAll(): Promise<Ingredient[]> {
        const results = await db.query.ingredientsTable.findMany({
            where: isNull(ingredientsTable.deletedAt),
        });
        return results;
    }

    async findById(id: string): Promise<Ingredient | null> {
        const result = await db.query.ingredientsTable.findFirst({
            where: eq(ingredientsTable.id, id),
        });
        if (result?.deletedAt) return null;
        return result ?? null;
    }

    async findByIds(ids: string[]): Promise<Ingredient[]> {
        if (ids.length === 0) return [];
        const results = await db.query.ingredientsTable.findMany({
            where: inArray(ingredientsTable.id, ids),
        });
        return results.filter((r) => !r.deletedAt);
    }

    async insert(input: InsertIngredient): Promise<Ingredient> {
        const result = await db
            .insert(ingredientsTable)
            .values(input)
            .returning();
        return result[0];
    }

    async update(id: string, input: UpdateIngredient): Promise<Ingredient> {
        const result = await db
            .update(ingredientsTable)
            .set(input)
            .where(eq(ingredientsTable.id, id))
            .returning();
        return result[0];
    }

    async delete(id: string): Promise<void> {
        await db
            .update(ingredientsTable)
            .set({ deletedAt: new Date() })
            .where(eq(ingredientsTable.id, id));
    }
}

export const ingredientRepository = new IngredientRepository();
