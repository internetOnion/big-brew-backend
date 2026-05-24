import { pgTable, uuid, integer, unique } from "drizzle-orm/pg-core";
import { menuItemsTable } from "./menu-items.ts";
import { modifierGroupsTable } from "./modifier-groups.ts";

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
