import "dotenv/config";
import { sql } from "drizzle-orm";
import { db, pool } from "./index.ts";

const reset = async () => {
    console.log("Truncating all tables...");

    await db.execute(sql`
        TRUNCATE TABLE
            order_item_modifiers,
            order_items,
            orders,
            stock_movements,
            modifier_option_ingredients,
            item_recipes,
            menu_item_modifier_option_overrides,
            menu_item_modifier_groups,
            expenses,
            employee_permissions,
            modifier_options,
            menu_items,
            discounts,
            employees,
            modifier_groups,
            ingredients,
            categories,
            settings
        RESTART IDENTITY CASCADE
    `);

    console.log("Reset complete.");
};

reset()
    .catch(console.error)
    .finally(() => {
        pool.end();
        process.exit();
    });
