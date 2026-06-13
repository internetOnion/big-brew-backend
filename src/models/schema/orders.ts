import {
    pgTable,
    uuid,
    serial,
    decimal,
    text,
    timestamp,
    index,
    check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
    orderStatusEnum,
    diningOptionEnum,
    paymentStatusEnum,
} from "./enums.ts";
import { discountsTable } from "./discounts.ts";
import { employeesTable } from "./employees.ts";

export const ordersTable = pgTable(
    "orders",
    {
        id: uuid().primaryKey().defaultRandom(),
        orderNumber: serial("order_number").unique(),
        receiptNumber: serial("receipt_number").unique(),
        status: orderStatusEnum().notNull().default("pending"),
        diningOption: diningOptionEnum("dining_option").notNull(),
        subtotal: decimal({ precision: 10, scale: 2 }).notNull(),
        discountId: uuid("discount_id").references(() => discountsTable.id),
        discountAmount: decimal("discount_amount", {
            precision: 10,
            scale: 2,
        })
            .notNull()
            .default("0"),
        total: decimal({ precision: 10, scale: 2 }).notNull(),
        paymentStatus: paymentStatusEnum("payment_status")
            .notNull()
            .default("pending"),
        createdBy: uuid("created_by")
            .notNull()
            .references(() => employeesTable.id),
        voidRequestedBy: uuid("void_requested_by").references(
            () => employeesTable.id,
        ),
        voidRequestedAt: timestamp("void_requested_at", {
            withTimezone: true,
        }),
        voidApprovedBy: uuid("void_approved_by").references(
            () => employeesTable.id,
        ),
        voidApprovedAt: timestamp("void_approved_at", {
            withTimezone: true,
        }),
        voidRejectedAt: timestamp("void_rejected_at", {
            withTimezone: true,
        }),
        voidReason: text("void_reason"),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        index("idx_orders_status").on(t.status),
        index("idx_orders_created_at").on(t.createdAt),
        index("idx_orders_order_number").on(t.orderNumber),
        index("idx_orders_created_by").on(t.createdBy),
        check("chk_subtotal_non_negative", sql`${t.subtotal} >= 0`),
        check("chk_total_non_negative", sql`${t.total} >= 0`),
        check("chk_discount_non_negative", sql`${t.discountAmount} >= 0`),
        check(
            "chk_void_approved_fields",
            sql`(
                (${t.voidApprovedBy} IS NULL AND ${t.voidApprovedAt} IS NULL) OR
                (${t.voidApprovedBy} IS NOT NULL AND ${t.voidApprovedAt} IS NOT NULL)
            )`,
        ),
    ],
);
