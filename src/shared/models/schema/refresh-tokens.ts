import {
    pgTable,
    uuid,
    text,
    timestamp,
    boolean,
    index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { employeesTable } from "./employees.ts";

export const refreshTokensTable = pgTable(
    "refresh_tokens",
    {
        id: uuid().primaryKey().defaultRandom(),
        employeeId: uuid("employee_id")
            .notNull()
            .references(() => employeesTable.id, { onDelete: "cascade" }),
        tokenHash: text("token_hash").notNull().unique(),
        expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
        revoked: boolean("revoked").default(false).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        index("idx_refresh_tokens_employee").on(t.employeeId),
        index("idx_refresh_tokens_hash")
            .on(t.tokenHash)
            .where(sql`${t.revoked} = false`),
    ],
);
