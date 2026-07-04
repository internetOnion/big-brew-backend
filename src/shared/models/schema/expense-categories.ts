import {
    pgTable,
    uuid,
    text,
    timestamp,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { isNull } from "drizzle-orm";

export const expenseCategoriesTable = pgTable(
    "expense_categories",
    {
        id: uuid().primaryKey().defaultRandom(),
        name: text().notNull(),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
        deletedAt: timestamp("deleted_at", { withTimezone: true }),
    },
    (t) => [
        uniqueIndex("expense_categories_name_unique")
            .on(t.name)
            .where(isNull(t.deletedAt)),
    ],
);
