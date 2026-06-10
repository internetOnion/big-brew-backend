import {
    pgTable,
    uuid,
    decimal,
    index,
    unique,
    check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { modifierOptionsTable } from "./modifier-options.ts";
import { ingredientsTable } from "./ingredients.ts";
import { createInsertSchema } from "drizzle-zod";

export const modifierOptionIngredientsTable = pgTable(
    "modifier_option_ingredients",
    {
        id: uuid().primaryKey().defaultRandom(),
        modifierOptionId: uuid("modifier_option_id")
            .notNull()
            .references(() => modifierOptionsTable.id, {
                onDelete: "cascade",
            }),
        ingredientId: uuid("ingredient_id")
            .notNull()
            .references(() => ingredientsTable.id),
        quantity: decimal({ precision: 10, scale: 2 }).notNull(),
    },
    (t) => [
        unique().on(t.modifierOptionId, t.ingredientId),
        index("idx_moi_ingredient").on(t.ingredientId),
        check("chk_moi_quantity_positive", sql`${t.quantity} > 0`),
    ],
);

export const baseModifierOptionIngredientSchema = createInsertSchema(modifierOptionIngredientsTable, {
    modifierOptionId: (schema) => schema.nonempty("Modifier option ID is required"),
    ingredientId: (schema) => schema.nonempty("Ingredient ID is required"),
    quantity: (schema) => schema.min(0.01, "Quantity must be greater than 0"),
});
