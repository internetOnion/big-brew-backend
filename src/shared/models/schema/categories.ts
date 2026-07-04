import {
    pgTable,
    uuid,
    text,
    integer,
    timestamp,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { isNull } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";

export const categoriesTable = pgTable(
    "categories",
    {
        id: uuid().primaryKey().defaultRandom(),
        name: text().notNull(),
        sortOrder: integer("sort_order").notNull().default(0),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
        deletedAt: timestamp("deleted_at", { withTimezone: true }),
    },
    (t) => [
        uniqueIndex("categories_name_unique")
            .on(t.name)
            .where(isNull(t.deletedAt)),
    ],
);

export const insertCategorySchema = createInsertSchema(categoriesTable, {
    name: (schema) => schema.nonempty("Name is required"),
    sortOrder: (schema) =>
        schema
            .int()
            .min(0, "Sort order must be a non-negative integer")
            .default(0),
});
