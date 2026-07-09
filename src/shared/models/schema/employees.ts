import {
    pgTable,
    uuid,
    text,
    boolean,
    timestamp,
    index,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql, isNull } from "drizzle-orm";
import { employeeRoleEnum } from "./enums.ts";

export const employeesTable = pgTable(
    "employees",
    {
        id: uuid().primaryKey().defaultRandom(),
        role: employeeRoleEnum().notNull(),
        name: text().notNull(),
        pin: text().notNull(),
        clerkUserId: text("clerk_user_id"),
        isActive: boolean("is_active").notNull().default(true),
        deletedAt: timestamp("deleted_at", { withTimezone: true }),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        index("idx_employees_pin")
            .on(t.pin)
            .where(sql`${t.isActive} = true`),
        uniqueIndex("employees_pin_unique")
            .on(t.pin)
            .where(isNull(t.deletedAt)),
        uniqueIndex("employees_clerk_user_id_unique")
            .on(t.clerkUserId)
            .where(isNull(t.deletedAt)),
    ],
);
