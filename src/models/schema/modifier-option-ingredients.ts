import {
    pgTable,
    uuid,
    decimal,
    index,
    unique,
    check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { menuItemsTable } from "./menu-items.ts";
import { modifierOptionsTable } from "./modifier-options.ts";
import { ingredientsTable } from "./ingredients.ts";

export const modifierOptionIngredientsTable = pgTable(
    "modifier_option_ingredients",
    {
        id: uuid().primaryKey().defaultRandom(),
        itemId: uuid("item_id")
            .notNull()
            .references(() => menuItemsTable.id, { onDelete: "cascade" }),
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
        unique().on(t.itemId, t.modifierOptionId, t.ingredientId),
        index("idx_moi_item_option").on(t.itemId, t.modifierOptionId),
        index("idx_moi_ingredient").on(t.ingredientId),
        check("chk_moi_quantity_positive", sql`${t.quantity} > 0`),
    ],
);
