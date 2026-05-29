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
import { categoriesTable } from "./categories.ts";

export const menuItemsTable = pgTable(
    "menu_items",
    {
        id: uuid().primaryKey().defaultRandom(),
        categoryId: uuid("category_id")
            .notNull()
            .references(() => categoriesTable.id),
        name: text().notNull().unique(),
        basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
        isAvailable: boolean("is_available").notNull().default(true),
        imageUrl: text("image_url"),
        deletedAt: timestamp("deleted_at", { withTimezone: true }),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        index("idx_menu_items_category").on(t.categoryId),
        index("idx_menu_items_deleted")
            .on(t.deletedAt)
            .where(sql`${t.deletedAt} IS NOT NULL`),
        check("chk_base_price_positive", sql`${t.basePrice} >= 0`),
    ],
);
