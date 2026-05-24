import {
    pgTable,
    uuid,
    text,
    boolean,
    timestamp,
    index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { employeeRoleEnum } from "./enums.ts";

export const employeesTable = pgTable(
    "employees",
    {
        id: uuid().primaryKey().defaultRandom(),
        role: employeeRoleEnum().notNull(),
        name: text().notNull(),
        pin: text().notNull(),
        supabaseUid: uuid("supabase_uid").unique(),
        isActive: boolean("is_active").notNull().default(true),
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
    ],
);
