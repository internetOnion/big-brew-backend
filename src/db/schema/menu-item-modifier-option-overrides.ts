import {
    pgTable,
    uuid,
    decimal,
    boolean,
    index,
    unique,
} from "drizzle-orm/pg-core";
import { menuItemsTable } from "./menu-items.ts";
import { modifierOptionsTable } from "./modifier-options.ts";

export const menuItemModifierOptionOverridesTable = pgTable(
    "menu_item_modifier_option_overrides",
    {
        id: uuid().primaryKey().defaultRandom(),
        menuItemId: uuid("menu_item_id")
            .notNull()
            .references(() => menuItemsTable.id, { onDelete: "cascade" }),
        modifierOptionId: uuid("modifier_option_id")
            .notNull()
            .references(() => modifierOptionsTable.id, {
                onDelete: "cascade",
            }),
        priceOverride: decimal("price_override", {
            precision: 10,
            scale: 2,
        }),
        isAvailable: boolean("is_available"),
    },
    (t) => [
        unique().on(t.menuItemId, t.modifierOptionId),
        index("idx_mimoo_item_option").on(t.menuItemId, t.modifierOptionId),
    ],
);
