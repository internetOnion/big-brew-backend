import {
    pgTable,
    uuid,
    text,
    decimal,
    timestamp,
    index,
    check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { employeesTable } from "./employees.ts";

export const expensesTable = pgTable(
    "expenses",
    {
        id: uuid().primaryKey().defaultRandom(),
        description: text().notNull(),
        amount: decimal({ precision: 10, scale: 2 }).notNull(),
        category: text(),
        recordedBy: uuid("recorded_by")
            .notNull()
            .references(() => employeesTable.id),
        recordedAt: timestamp("recorded_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        index("idx_expenses_recorded_at").on(t.recordedAt),
        index("idx_expenses_category").on(t.category),
        check("chk_expense_amount_positive", sql`${t.amount} > 0`),
    ],
);
