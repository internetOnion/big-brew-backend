import { insertItemRecipeValidationSchema } from "../routes/menuItem.routes.ts";
import { baseItemRecipeSchema } from "../models/schema/item-recipes.ts";
import { db } from "../models/index.ts";
import { itemRecipesTable } from "../models/schema/index.ts";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { PgTransaction } from "drizzle-orm/pg-core";

export type ItemRecipe = z.infer<typeof baseItemRecipeSchema>;
export type InsertItemRecipe = z.infer<typeof insertItemRecipeValidationSchema>;
export type UpdateItemRecipe = Partial<InsertItemRecipe>;

export class ItemRecipeRepository {
    async findById(id: string): Promise<ItemRecipe | null> {
        const result = await db.query.itemRecipesTable.findFirst({
            where: eq(itemRecipesTable.id, id),
        });
        return result || null;
    }

    async findByItemId(itemId: string): Promise<ItemRecipe[]> {
        const results = await db.query.itemRecipesTable.findMany({
            where: eq(itemRecipesTable.itemId, itemId),
        });
        return results;
    }

    async findByItemIdAndIngredientId(
        itemId: string,
        ingredientId: string,
    ): Promise<ItemRecipe | null> {
        const result = await db.query.itemRecipesTable.findFirst({
            where: (itemRecipes, { and, eq }) =>
                and(
                    eq(itemRecipes.itemId, itemId),
                    eq(itemRecipes.ingredientId, ingredientId),
                ),
        });
        return result || null;
    }

    async insert(input: InsertItemRecipe): Promise<ItemRecipe> {
        const result = await db
            .insert(itemRecipesTable)
            .values(input)
            .returning();
        return result[0];
    }

    async insertMany(
        inputs: InsertItemRecipe[],
        tx?: PgTransaction<any, any, any>,
    ): Promise<ItemRecipe[]> {
        const client = tx || db;
        const result = await client
            .insert(itemRecipesTable)
            .values(inputs)
            .returning();
        return result;
    }

    async update(id: string, input: UpdateItemRecipe): Promise<ItemRecipe> {
        const result = await db
            .update(itemRecipesTable)
            .set(input)
            .where(eq(itemRecipesTable.id, id))
            .returning();
        return result[0];
    }

    async delete(id: string): Promise<void> {
        await db.delete(itemRecipesTable).where(eq(itemRecipesTable.id, id));
    }
}

export const itemRecipeRepository = new ItemRecipeRepository();
