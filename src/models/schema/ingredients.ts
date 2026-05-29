import {
    pgTable,
    uuid,
    text,
    decimal,
    timestamp,
    check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { ingredientUnitEnum } from "./enums.ts";

export const ingredientsTable = pgTable(
    "ingredients",
    {
        id: uuid().primaryKey().defaultRandom(),
        name: text().notNull(),
        unit: ingredientUnitEnum().notNull(),
        stockQuantity: decimal("stock_quantity", {
            precision: 10,
            scale: 2,
        })
            .notNull()
            .default("0"),
        lowStockThreshold: decimal("low_stock_threshold", {
            precision: 10,
            scale: 2,
        })
            .notNull()
            .default("0"),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [check("chk_stock_non_negative", sql`${t.stockQuantity} >= 0`)],
);
