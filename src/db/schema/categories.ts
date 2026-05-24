import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";

export const categoriesTable = pgTable("categories", {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull().unique(),
    color: text(),
    sortOrder: integer("sort_order").notNull().unique().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
