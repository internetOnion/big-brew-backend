import {
    pgTable,
    uuid,
    text,
    boolean,
    timestamp,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { isNull } from "drizzle-orm";

export const terminalsTable = pgTable(
    "terminals",
    {
        id: uuid().primaryKey().defaultRandom(),
        name: text().notNull(),
        clerkUserId: text("clerk_user_id").notNull(),
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
        uniqueIndex("terminals_clerk_user_id_unique")
            .on(t.clerkUserId)
            .where(isNull(t.deletedAt)),
    ],
);
