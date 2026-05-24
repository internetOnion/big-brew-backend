import {
    pgTable,
    uuid,
    boolean,
    integer,
    decimal,
    timestamp,
} from "drizzle-orm/pg-core";
import { employeesTable } from "./employees.ts";

export const employeePermissionsTable = pgTable("employee_permissions", {
    id: uuid().primaryKey().defaultRandom(),
    employeeId: uuid("employee_id")
        .notNull()
        .references(() => employeesTable.id, { onDelete: "cascade" })
        .unique(),
    canSell: boolean("can_sell").notNull().default(true),
    canApplyDiscount: boolean("can_apply_discount").notNull().default(true),
    canVoidRequest: boolean("can_void_request").notNull().default(true),
    canVoidApprove: boolean("can_void_approve").notNull().default(false),
    canManageMenu: boolean("can_manage_menu").notNull().default(false),
    canManageInventory: boolean("can_manage_inventory")
        .notNull()
        .default(false),
    canViewReports: boolean("can_view_reports").notNull().default(false),
    canOpenRegister: boolean("can_open_register").notNull().default(true),
    canAdjustStock: boolean("can_adjust_stock").notNull().default(false),
    canManageEmployees: boolean("can_manage_employees")
        .notNull()
        .default(false),
    maxDiscountPercent: integer("max_discount_percent").notNull().default(10),
    maxDiscountAmount: decimal("max_discount_amount", {
        precision: 10,
        scale: 2,
    })
        .notNull()
        .default("5.00"),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
