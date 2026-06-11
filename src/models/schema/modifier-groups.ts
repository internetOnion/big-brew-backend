import {
    pgTable,
    uuid,
    text,
    boolean,
    integer,
    timestamp,
} from "drizzle-orm/pg-core";
import { selectionTypeEnum, selectionTypeEnumSchema } from "./enums.ts";
import { createInsertSchema } from "drizzle-zod";

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

export const baseModifierGroupSchema = createInsertSchema(modifierGroupsTable, {
    id: (schema) => schema.nonempty("ID is required"),
    name: (schema) => schema.nonempty("Name is required"),
    selectionType: selectionTypeEnumSchema,
    isRequired: (schema) => schema,
    defaultOptionId: (schema) => schema.nullable(),
    sortOrder: (schema) => schema.int().min(0, "Sort order must be a non-negative integer").default(0),
})