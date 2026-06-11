import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const categoriesTable = pgTable("categories", {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull().unique(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});

export const insertCategorySchema = createInsertSchema(categoriesTable, {
    name: (schema) => schema.nonempty("Name is required"),
    sortOrder: (schema) =>
        schema
            .int()
            .min(0, "Sort order must be a non-negative integer")
            .default(0),
});
