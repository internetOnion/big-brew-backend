import { db } from "../models/index.ts";
import { modifierOptionIngredientsTable } from "../models/schema/index.ts";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { baseModifierOptionIngredientSchema } from "../models/schema/modifier-option-ingredients.ts";
import { insertModifierOptionIngredientValidationSchema } from "../routes/menuItem.routes.ts";
import { PgTransaction } from "drizzle-orm/pg-core";

export type ModifierOptionIngredient = z.infer<
    typeof baseModifierOptionIngredientSchema
>;
export type InsertModifierOptionIngredient = z.infer<
    typeof insertModifierOptionIngredientValidationSchema
>;
export type UpdateModifierOptionIngredient =
    Partial<InsertModifierOptionIngredient>;

export class ModifierOptionIngredientRepository {
    async findById(id: string): Promise<ModifierOptionIngredient | null> {
        const result = await db.query.modifierOptionIngredientsTable.findFirst({
            where: eq(modifierOptionIngredientsTable.id, id),
        });
        return result || null;
    }

    async findByModifierOptionIdAndIngredientId(
        modifierOptionId: string,
        ingredientId: string,
    ): Promise<ModifierOptionIngredient | null> {
        const result = await db.query.modifierOptionIngredientsTable.findFirst({
            where:
                eq(
                    modifierOptionIngredientsTable.modifierOptionId,
                    modifierOptionId,
                ) &&
                eq(modifierOptionIngredientsTable.ingredientId, ingredientId),
        });
        return result || null;
    }

    async findByModifierOptionId(
        modifierOptionId: string,
    ): Promise<ModifierOptionIngredient[]> {
        const results = await db.query.modifierOptionIngredientsTable.findMany({
            where: eq(
                modifierOptionIngredientsTable.modifierOptionId,
                modifierOptionId,
            ),
        });
        return results;
    }

    async insert(
        input: InsertModifierOptionIngredient,
        tx?: PgTransaction<any, any, any>,
    ): Promise<ModifierOptionIngredient> {
        const client = tx || db;
        const result = await client
            .insert(modifierOptionIngredientsTable)
            .values(input)
            .returning();
        return result[0];
    }

    async insertMany(
        inputs: InsertModifierOptionIngredient[],
        tx?: PgTransaction<any, any, any>,
    ): Promise<ModifierOptionIngredient[]> {
        const client = tx || db;
        const result = await client
            .insert(modifierOptionIngredientsTable)
            .values(inputs)
            .returning();
        return result;
    }

    async update(
        id: string,
        input: UpdateModifierOptionIngredient,
    ): Promise<ModifierOptionIngredient> {
        const result = await db
            .update(modifierOptionIngredientsTable)
            .set(input)
            .where(eq(modifierOptionIngredientsTable.id, id))
            .returning();
        return result[0];
    }

    async delete(id: string): Promise<void> {
        await db
            .delete(modifierOptionIngredientsTable)
            .where(eq(modifierOptionIngredientsTable.id, id));
    }
}

export const modifierOptionIngredientRepository =
    new ModifierOptionIngredientRepository();
