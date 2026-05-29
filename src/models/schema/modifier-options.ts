import {
    pgTable,
    uuid,
    text,
    decimal,
    boolean,
    integer,
    timestamp,
    index,
} from "drizzle-orm/pg-core";
import { modifierGroupsTable } from "./modifier-groups.ts";

export const modifierOptionsTable = pgTable(
    "modifier_options",
    {
        id: uuid().primaryKey().defaultRandom(),
        modifierGroupId: uuid("modifier_group_id")
            .notNull()
            .references(() => modifierGroupsTable.id, {
                onDelete: "cascade",
            }),
        name: text().notNull(),
        price: decimal({ precision: 10, scale: 2 }).notNull().default("0"),
        isAvailable: boolean("is_available").notNull().default(true),
        sortOrder: integer("sort_order").notNull().default(0),
        deletedAt: timestamp("deleted_at", { withTimezone: true }),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [index("idx_modifier_options_group").on(t.modifierGroupId)],
);
