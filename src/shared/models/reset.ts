import "dotenv/config";
import { sql } from "drizzle-orm";
import { db, pool } from "./index.ts";
import { clerkClient } from "../lib/clerk.ts";

const requireEnv = (name: string): string => {
    const value = process.env[name];
    if (!value) {
        console.error(`Missing required environment variable: ${name}`);
        process.exit(1);
    }
    return value;
};

const reset = async () => {
    requireEnv("NEON_DATABASE_URL");
    requireEnv("SUPABASE_URL");
    requireEnv("SUPABASE_SECRET_KEY");
    requireEnv("CLERK_SECRET_KEY");

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

    console.log("Deleting Clerk users...");
    const users = await clerkClient.users.getUserList({ limit: 500 });
    let deleted = 0;
    for (const user of users.data) {
        await clerkClient.users.deleteUser(user.id);
        deleted++;
    }
    console.log(`  Deleted ${deleted} auth users.`);

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
