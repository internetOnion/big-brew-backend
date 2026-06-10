import { db } from "../models/index.ts";
import { modifierOptionIngredientsTable } from "../models/schema/index.ts";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { baseModifierOptionIngredientSchema } from "../models/schema/modifier-option-ingredients.ts";
import { insertModifierOptionIngredientValidationSchema } from "../routes/menuItem.ts";

export type ModifierOptionIngredient = z.infer<typeof baseModifierOptionIngredientSchema>;
export type InsertModifierOptionIngredient = z.infer<typeof insertModifierOptionIngredientValidationSchema>;
export type UpdateModifierOptionIngredient = Partial<InsertModifierOptionIngredient>;

export class ModifierOptionIngredientRepository {

    async findById(id: string): Promise<ModifierOptionIngredient | null> {
        const result = await db.query.modifierOptionIngredientsTable.findFirst({
            where: eq(modifierOptionIngredientsTable.id, id),
        });
        return result || null;
    }

    async findByModifierOptionIdAndIngredientId(modifierOptionId: string, ingredientId: string): Promise<ModifierOptionIngredient | null> {
        const result = await db.query.modifierOptionIngredientsTable.findFirst({
            where: eq(modifierOptionIngredientsTable.modifierOptionId, modifierOptionId) && eq(modifierOptionIngredientsTable.ingredientId, ingredientId),
        });
        return result || null;
    }

    async insert(input: InsertModifierOptionIngredient): Promise<ModifierOptionIngredient> {
        const result = await db.insert(modifierOptionIngredientsTable).values(input).returning();
        return result[0];
    }

    async update(id: string, input: UpdateModifierOptionIngredient): Promise<ModifierOptionIngredient> {
        const result = await db.update(modifierOptionIngredientsTable).set(input).where(eq(modifierOptionIngredientsTable.id, id)).returning();
        return result[0];
    }
}

export const modifierOptionIngredientRepository = new ModifierOptionIngredientRepository();