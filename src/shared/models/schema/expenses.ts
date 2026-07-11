import {
    pgTable,
    uuid,
    text,
    decimal,
    timestamp,
    index,
    check,
} from "drizzle-orm/pg-core";
import { sql, isNull } from "drizzle-orm";
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
        deletedAt: timestamp("deleted_at", { withTimezone: true }),
    },
    (t) => [
        index("idx_expenses_active_recorded")
            .on(t.recordedAt)
            .where(isNull(t.deletedAt)),
        index("idx_expenses_category_recorded").on(t.category, t.recordedAt),
        check("chk_expense_amount_positive", sql`${t.amount} > 0`),
    ],
);
