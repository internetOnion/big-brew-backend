import {
    pgTable,
    uuid,
    decimal,
    text,
    timestamp,
    index,
} from "drizzle-orm/pg-core";
import { stockReasonEnum } from "./enums.ts";
import { ingredientsTable } from "./ingredients.ts";
import { ordersTable } from "./orders.ts";

export const stockMovementsTable = pgTable(
    "stock_movements",
    {
        id: uuid().primaryKey().defaultRandom(),
        ingredientId: uuid("ingredient_id")
            .notNull()
            .references(() => ingredientsTable.id),
        quantityChange: decimal("quantity_change", {
            precision: 10,
            scale: 2,
        }).notNull(),
        reason: stockReasonEnum().notNull(),
        referenceOrderId: uuid("reference_order_id").references(
            () => ordersTable.id,
        ),
        notes: text(),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        index("idx_stock_movements_ingredient").on(t.ingredientId),
        index("idx_stock_movements_created").on(t.createdAt),
        index("idx_stock_movements_order").on(t.referenceOrderId),
    ],
);
