import {
    pgTable,
    uuid,
    decimal,
    integer,
    timestamp,
    index,
    check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { ordersTable } from "./orders.ts";
import { menuItemsTable } from "./menu-items.ts";

export const orderItemsTable = pgTable(
    "order_items",
    {
        id: uuid().primaryKey().defaultRandom(),
        orderId: uuid("order_id")
            .notNull()
            .references(() => ordersTable.id, { onDelete: "cascade" }),
        menuItemId: uuid("menu_item_id")
            .notNull()
            .references(() => menuItemsTable.id),
        unitPrice: decimal("unit_price", {
            precision: 10,
            scale: 2,
        }).notNull(),
        quantity: integer().notNull().default(1),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        index("idx_order_items_order").on(t.orderId),
        check("chk_unit_price_positive", sql`${t.unitPrice} > 0`),
        check("chk_quantity_positive", sql`${t.quantity} > 0`),
    ],
);
