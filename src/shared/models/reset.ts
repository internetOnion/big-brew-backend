import "dotenv/config";
import { sql } from "drizzle-orm";
import { db, pool } from "./index.ts";
import { supabaseAdmin } from "../lib/supabase.ts";

const requireEnv = (name: string): string => {
    const value = process.env[name];
    if (!value) {
        console.error(`Missing required environment variable: ${name}`);
        process.exit(1);
    }
    return value;
};

const reset = async () => {
    requireEnv("SUPABASE_DATABASE_URL");
    requireEnv("SUPABASE_URL");
    requireEnv("SUPABASE_SECRET_KEY");

    console.log("Truncating all tables...");
    await db.execute(sql`
        TRUNCATE TABLE
            order_item_modifiers,
            order_items,
            orders,
            stock_movements,
            modifier_option_ingredients,
            item_recipes,
            expenses,
            modifier_options,
            modifier_groups,
            menu_items,
            discounts,
            refresh_tokens,
            employees,
            ingredients,
            categories,
            settings
        RESTART IDENTITY CASCADE
    `);

    console.log("Deleting Supabase Auth users...");
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
    for (const user of usersData.users) {
        await supabaseAdmin.auth.admin.deleteUser(user.id);
    }
    console.log(`  Deleted ${usersData.users.length} auth users.`);

    console.log("Reset complete.");
};

reset()
    .then(() => {
        pool.end().then(() => process.exit(0));
    })
    .catch((err) => {
        console.error(err);
        pool.end().then(() => process.exit(1));
    });
