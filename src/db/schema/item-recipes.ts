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
import { ingredientsTable } from "./ingredients.ts";

export const itemRecipesTable = pgTable(
    "item_recipes",
    {
        id: uuid().primaryKey().defaultRandom(),
        itemId: uuid("item_id")
            .notNull()
            .references(() => menuItemsTable.id, { onDelete: "cascade" }),
        ingredientId: uuid("ingredient_id")
            .notNull()
            .references(() => ingredientsTable.id),
        quantity: decimal({ precision: 10, scale: 2 }).notNull(),
    },
    (t) => [
        unique().on(t.itemId, t.ingredientId),
        index("idx_item_recipes_item").on(t.itemId),
        index("idx_item_recipes_ingredient").on(t.ingredientId),
        check("chk_recipe_quantity_positive", sql`${t.quantity} > 0`),
    ],
);
