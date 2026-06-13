import {
    pgTable,
    uuid,
    decimal,
    text,
    timestamp,
    index,
    check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { paymentMethodEnum, paymentStatusEnum } from "./enums.ts";
import { ordersTable } from "./orders.ts";
import { employeesTable } from "./employees.ts";

export const paymentsTable = pgTable(
    "payments",
    {
        id: uuid().primaryKey().defaultRandom(),
        orderId: uuid("order_id")
            .notNull()
            .references(() => ordersTable.id, { onDelete: "cascade" }),
        method: paymentMethodEnum().notNull(),
        amount: decimal({ precision: 10, scale: 2 }).notNull(),
        amountReceived: decimal("amount_received", {
            precision: 10,
            scale: 2,
        }),
        changeAmount: decimal("change_amount", {
            precision: 10,
            scale: 2,
        }),
        status: paymentStatusEnum().notNull().default("pending"),
        createdBy: uuid("created_by")
            .notNull()
            .references(() => employeesTable.id),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        index("idx_payments_order").on(t.orderId),
        index("idx_payments_created_at").on(t.createdAt),
        index("idx_payments_created_by").on(t.createdBy),
        check("chk_payment_amount_positive", sql`${t.amount} > 0`),
        check(
            "chk_cash_fields",
            sql`(
                ${t.method} != 'cash' OR
                (${t.amountReceived} IS NOT NULL AND ${t.changeAmount} IS NOT NULL)
            )`,
        ),
    ],
);
