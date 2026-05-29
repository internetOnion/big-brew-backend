import {
    pgTable,
    uuid,
    text,
    decimal,
    boolean,
    timestamp,
    index,
    check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { discountTypeEnum } from "./enums.ts";
import { menuItemsTable } from "./menu-items.ts";

export const discountsTable = pgTable(
    "discounts",
    {
        id: uuid().primaryKey().defaultRandom(),
        name: text().notNull(),
        type: discountTypeEnum().notNull(),
        value: decimal({ precision: 10, scale: 2 }),
        buyItemId: uuid("buy_item_id").references(() => menuItemsTable.id),
        freeItemId: uuid("free_item_id").references(() => menuItemsTable.id),
        isActive: boolean("is_active").notNull().default(true),
        startsAt: timestamp("starts_at", { withTimezone: true }),
        endsAt: timestamp("ends_at", { withTimezone: true }),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        index("idx_discounts_buy_item").on(t.buyItemId),
        index("idx_discounts_free_item").on(t.freeItemId),
        check(
            "chk_discount_value",
            sql`(
                (${t.type} = 'bogo' AND ${t.value} IS NULL) OR
                (${t.type} = 'percentage' AND ${t.value} > 0 AND ${t.value} <= 100) OR
                (${t.type} = 'fixed_amount' AND ${t.value} > 0)
            )`,
        ),
        check(
            "chk_discount_dates",
            sql`(
                ${t.endsAt} IS NULL OR
                ${t.startsAt} IS NULL OR
                ${t.endsAt} > ${t.startsAt}
            )`,
        ),
    ],
);
