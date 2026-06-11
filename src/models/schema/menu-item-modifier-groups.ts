import { pgTable, uuid, integer, unique } from "drizzle-orm/pg-core";
import { menuItemsTable } from "./menu-items.ts";
import { modifierGroupsTable } from "./modifier-groups.ts";
import { createInsertSchema } from "drizzle-zod";

export const menuItemModifierGroupsTable = pgTable(
    "menu_item_modifier_groups",
    {
        id: uuid().primaryKey().defaultRandom(),
        menuItemId: uuid("menu_item_id")
            .notNull()
            .references(() => menuItemsTable.id, { onDelete: "cascade" }),
        modifierGroupId: uuid("modifier_group_id")
            .notNull()
            .references(() => modifierGroupsTable.id, {
                onDelete: "cascade",
            }),
        sortOrder: integer("sort_order").notNull().default(0),
    },
    (t) => [unique().on(t.menuItemId, t.modifierGroupId)],
);

export const baseMenuItemModifierGroupSchema = createInsertSchema(
    menuItemModifierGroupsTable,
    {
        id: (schema) => schema.nonempty("ID is required"),
        menuItemId: (schema) => schema.nonempty("Menu item ID is required"),
        modifierGroupId: (schema) =>
            schema.nonempty("Modifier group ID is required"),
        sortOrder: (schema) =>
            schema
                .int()
                .min(0, "Sort order must be a non-negative integer")
                .default(0),
    },
);
