import { pgTable, uuid, decimal, index } from "drizzle-orm/pg-core";
import { orderItemsTable } from "./order-items.ts";
import { modifierOptionsTable } from "./modifier-options.ts";

export const orderItemModifiersTable = pgTable(
    "order_item_modifiers",
    {
        id: uuid().primaryKey().defaultRandom(),
        orderItemId: uuid("order_item_id")
            .notNull()
            .references(() => orderItemsTable.id, { onDelete: "cascade" }),
        modifierOptionId: uuid("modifier_option_id")
            .notNull()
            .references(() => modifierOptionsTable.id),
        price: decimal({ precision: 10, scale: 2 }).notNull().default("0"),
    },
    (t) => [index("idx_oim_order_item").on(t.orderItemId)],
);
