import { eq } from "drizzle-orm";
import { db } from "../models/index.ts";
import { ingredientsTable } from "../models/schema/index.ts";
import type { IngredientUnit } from "../types/index.ts";

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
export type InsertIngredient = Omit<
    Ingredient,
    "id" | "createdAt" | "updatedAt"
>;
export type UpdateIngredient = Partial<InsertIngredient>;

export class IngredientRepository {
    async findAll(): Promise<Ingredient[]> {
        const results = await db.query.ingredientsTable.findMany();
        return results;
    }

    async findById(id: string): Promise<Ingredient | null> {
        const result = await db.query.ingredientsTable.findFirst({
            where: eq(ingredientsTable.id, id),
        });
        return result ?? null;
    }

    async insert(input: InsertIngredient): Promise<Ingredient> {
        const result = await db
            .insert(ingredientsTable)
            .values(input)
            .returning();
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
        const result = await db
            .update(ingredientsTable)
            .set(input)
            .where(eq(ingredientsTable.id, id))
            .returning();
        return result[0];
    }

    async delete(id: string): Promise<void> {
        await db.delete(ingredientsTable).where(eq(ingredientsTable.id, id));
    }
}

export const ingredientRepository = new IngredientRepository();

