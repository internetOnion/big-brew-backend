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
import { discountTypeEnum, discountAppliesToEnum } from "./enums.ts";
import { menuItemsTable } from "./menu-items.ts";

export const discountsTable = pgTable(
    "discounts",
    {
        id: uuid().primaryKey().defaultRandom(),
        name: text().notNull(),
        type: discountTypeEnum().notNull(),
        value: decimal({ precision: 10, scale: 2 }),
        appliesTo: discountAppliesToEnum("applies_to")
            .notNull()
            .default("order"),
        itemId: uuid("item_id").references(() => menuItemsTable.id),
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
        deletedAt: timestamp("deleted_at", { withTimezone: true }),
    },
    (t) => [
        index("idx_discounts_item").on(t.itemId),
        index("idx_discounts_buy_item").on(t.buyItemId),
        index("idx_discounts_free_item").on(t.freeItemId),
        index("idx_discounts_deleted").on(t.deletedAt),
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
        check(
            "chk_discount_bogo_items",
            sql`(
                ${t.type} != 'bogo' OR
                (${t.buyItemId} IS NOT NULL AND ${t.freeItemId} IS NOT NULL)
            )`,
        ),
        check(
            "chk_discount_applies_to",
            sql`(
                (${t.type} = 'bogo' AND ${t.appliesTo} = 'item') OR
                (${t.type} IN ('percentage', 'fixed_amount'))
            )`,
        ),
        check(
            "chk_discount_item_id",
            sql`(
                (${t.appliesTo} = 'order' AND ${t.itemId} IS NULL) OR
                (${t.appliesTo} = 'item' AND ${t.type} = 'bogo' AND ${t.itemId} IS NULL) OR
                (${t.appliesTo} = 'item' AND ${t.type} IN ('percentage', 'fixed_amount') AND ${t.itemId} IS NOT NULL)
            )`,
        ),
    ],
);
