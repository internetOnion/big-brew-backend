import {
    pgTable,
    uuid,
    text,
    boolean,
    integer,
    timestamp,
} from "drizzle-orm/pg-core";
import { selectionTypeEnum } from "./enums.ts";

export const modifierGroupsTable = pgTable("modifier_groups", {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    selectionType: selectionTypeEnum("selection_type").notNull(),
    isRequired: boolean("is_required").notNull().default(false),
    defaultOptionId: uuid("default_option_id"),
    sortOrder: integer("sort_order").notNull().default(0),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
