import "dotenv/config";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db } from "./index.ts";
import { supabaseAdmin } from "../lib/supabase.ts";
import {
    employeesTable,
    categoriesTable,
    ingredientsTable,
    modifierGroupsTable,
    modifierOptionsTable,
    menuItemsTable,
    itemRecipesTable,
    modifierOptionIngredientsTable,
    discountsTable,
} from "./schema/index.ts";

interface SeedEmployee {
    id: string;
    name: string;
    role: "barista" | "manager" | "owner";
    email: string;
    password: string;
    pin: string;
}

const DEV_EMPLOYEES: SeedEmployee[] = [
    {
        id: "dc194edc-71fe-49e5-a710-482680f8436a",
        name: "Dev Team",
        role: "owner",
        email: "dev@bigbrew.local",
        password: "DevPass123",
        pin: "000000",
    },
    {
        id: "1d04ed7f-e00a-450e-9397-d87ded11c5c6",
        name: "Cafe Owner",
        role: "owner",
        email: "owner@bigbrew.local",
        password: "OwnerPass123",
        pin: "111111",
    },
    {
        id: "3a7af35d-daca-4a0f-bc74-e5d3815861e9",
        name: "Alice (Manager)",
        role: "manager",
        email: "alice@bigbrew.local",
        password: "AlicePass123",
        pin: "222222",
    },
    {
        id: "f74bca7b-fbbb-4ad3-b084-dc77eff04d3b",
        name: "Bob",
        role: "barista",
        email: "bob@bigbrew.local",
        password: "BobPass123",
        pin: "333333",
    },
    {
        id: "265a9de3-aaf0-4a98-9143-d12ab3b67478",
        name: "Cindy",
        role: "barista",
        email: "cindy@bigbrew.local",
        password: "CindyPass123",
        pin: "444444",
    },
];

const getSeedEmployees = (): SeedEmployee[] => {
    if (process.env.SEED_EMPLOYEES) {
        return JSON.parse(process.env.SEED_EMPLOYEES);
    }
    return DEV_EMPLOYEES;
};

const getOrCreateAuthUser = async (
    email: string,
    password: string,
): Promise<string> => {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
    });

    if (!error) {
        return data.user.id;
    }

    if (error.status === 422) {
        const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
        const existing = usersData.users.find(
            (u: { email?: string }) => u.email === email,
        );
        if (existing) return existing.id;
    }

    throw new Error(`Failed to create/find auth user for ${email}`);
};

const SALT_ROUNDS = 10;

const requireEnv = (name: string): string => {
    const value = process.env[name];
    if (!value) {
        console.error(`Missing required environment variable: ${name}`);
        process.exit(1);
    }
    return value;
};

export const seed = async () => {
    requireEnv("SUPABASE_DATABASE_URL");
    requireEnv("SUPABASE_URL");
    requireEnv("SUPABASE_SECRET_KEY");

    console.log("Seeding database... (idempotent — safe to re-run)");

    console.log("  Employees...");
    const seedEmployees = getSeedEmployees();

    for (const emp of seedEmployees) {
        const supabaseUid = await getOrCreateAuthUser(emp.email, emp.password);
        const pinHash = await bcrypt.hash(emp.pin, SALT_ROUNDS);

        await db
            .insert(employeesTable)
            .values({
                id: emp.id,
                role: emp.role,
                name: emp.name,
                pin: pinHash,
                supabaseUid,
                isActive: true,
            })
            .onConflictDoNothing();

        console.log(`    ${emp.name} (${emp.email})`);
    }

    console.log("  Categories...");
    await db
        .insert(categoriesTable)
        .values([
            {
                id: "760229b2-0fbb-4fae-9dee-20dabba50ce2",
                name: "Coffee",
                sortOrder: 1,
            },
            {
                id: "fb85494f-5e8a-4c38-a3cb-a5ed01700d11",
                name: "Tea",
                sortOrder: 2,
            },
            {
                id: "333fbaf8-92eb-4c73-9e22-cee8ad7be62f",
                name: "Pastry",
                sortOrder: 3,
            },
            {
                id: "eb9118be-f702-4ba9-ba0f-97c4de9cf305",
                name: "Sandwich",
                sortOrder: 4,
            },
        ])
        .onConflictDoNothing();

    console.log("  Ingredients...");
    await db
        .insert(ingredientsTable)
        .values([
            {
                id: "d65097ac-3171-4d47-9fbd-b881b470711b",
                name: "Coffee Beans",
                unit: "g",
                stockQuantity: "5000",
                lowStockThreshold: "500",
            },
            {
                id: "b7e779c7-e70c-4e12-859c-60b1e920794a",
                name: "Whole Milk",
                unit: "ml",
                stockQuantity: "10000",
                lowStockThreshold: "1000",
            },
            {
                id: "5ab280ae-4f0e-4db9-b01e-619fd2c9ecae",
                name: "Oat Milk",
                unit: "ml",
                stockQuantity: "3000",
                lowStockThreshold: "300",
            },
            {
                id: "9b47a12f-e5c1-491d-86c0-ebea47cfc7e5",
                name: "Caramel Syrup",
                unit: "ml",
                stockQuantity: "2000",
                lowStockThreshold: "200",
            },
            {
                id: "c017b2fc-db5f-4b6c-b759-15c69a4af5d5",
                name: "Whipped Cream",
                unit: "ml",
                stockQuantity: "1500",
                lowStockThreshold: "150",
            },
            {
                id: "5c91a9ce-a730-47aa-84c1-b76bae51770a",
                name: "Green Tea Powder",
                unit: "g",
                stockQuantity: "800",
                lowStockThreshold: "80",
            },
            {
                id: "60340e44-5a8e-456b-b254-f62336da788e",
                name: "Croissant Unit",
                unit: "g",
                stockQuantity: "30",
                lowStockThreshold: "5",
            },
        ])
        .onConflictDoNothing();

    console.log("  Menu Items...");
    await db
        .insert(menuItemsTable)
        .values([
            {
                id: "257f7064-9fd9-466f-afb0-7218e514f67f",
                categoryId: "760229b2-0fbb-4fae-9dee-20dabba50ce2",
                name: "Latte",
                basePrice: "3.50",
            },
            {
                id: "edf35213-cdf7-4979-963b-6806bb4f8933",
                categoryId: "760229b2-0fbb-4fae-9dee-20dabba50ce2",
                name: "Iced Latte",
                basePrice: "4.00",
            },
            {
                id: "1997b5d2-6563-43f5-a45d-d7fa9910adb4",
                categoryId: "fb85494f-5e8a-4c38-a3cb-a5ed01700d11",
                name: "Green Tea",
                basePrice: "3.00",
            },
            {
                id: "cd297893-a429-4f86-a240-b99e01ab0d50",
                categoryId: "333fbaf8-92eb-4c73-9e22-cee8ad7be62f",
                name: "Croissant",
                basePrice: "3.00",
            },
        ])
        .onConflictDoNothing();

    console.log("  Modifier Groups...");
    await db
        .insert(modifierGroupsTable)
        .values([
            {
                id: "7c38084f-ce4c-4c5c-9587-ec203d8eeb99",
                menuItemId: "257f7064-9fd9-466f-afb0-7218e514f67f",
                name: "Cup Size",
                selectionType: "single",
                isRequired: true,
                sortOrder: 1,
            },
            {
                id: "14fc7e10-5027-40ea-8eba-1419f8984acd",
                menuItemId: "257f7064-9fd9-466f-afb0-7218e514f67f",
                name: "Sugar Level",
                selectionType: "single",
                isRequired: true,
                sortOrder: 2,
            },
            {
                id: "128d1d51-f5d4-4132-8f54-3e2c823fc6b5",
                menuItemId: "257f7064-9fd9-466f-afb0-7218e514f67f",
                name: "Milk Type",
                selectionType: "single",
                isRequired: true,
                sortOrder: 3,
            },
            {
                id: "d369535d-9be4-43af-aa94-0a543943f81f",
                menuItemId: "edf35213-cdf7-4979-963b-6806bb4f8933",
                name: "Toppings",
                selectionType: "multiple",
                isRequired: false,
                sortOrder: 4,
            },
        ])
        .onConflictDoNothing();

    console.log("  Modifier Options...");
    await db
        .insert(modifierOptionsTable)
        .values([
            // Cup Size
            {
                id: "31fd6ad0-6301-465d-95d4-32accff8278c",
                modifierGroupId: "7c38084f-ce4c-4c5c-9587-ec203d8eeb99",
                name: "Small",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "8b916a91-8626-4256-9621-c80f6c91bf85",
                modifierGroupId: "7c38084f-ce4c-4c5c-9587-ec203d8eeb99",
                name: "Medium",
                price: "0.50",
                sortOrder: 2,
            },
            {
                id: "83caebeb-6a37-4ea6-be4f-77040d69429e",
                modifierGroupId: "7c38084f-ce4c-4c5c-9587-ec203d8eeb99",
                name: "Large",
                price: "1.00",
                sortOrder: 3,
            },
            // Sugar Level
            {
                id: "b1a0f56a-3cb6-4f28-803f-cca5f21e5380",
                modifierGroupId: "14fc7e10-5027-40ea-8eba-1419f8984acd",
                name: "0%",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "48199e89-7074-41d2-987f-cc726c4da1a4",
                modifierGroupId: "14fc7e10-5027-40ea-8eba-1419f8984acd",
                name: "25%",
                price: "0",
                sortOrder: 2,
            },
            {
                id: "8d3b639c-a7ef-4022-91c8-934ff4cdee10",
                modifierGroupId: "14fc7e10-5027-40ea-8eba-1419f8984acd",
                name: "50%",
                price: "0",
                sortOrder: 3,
            },
            {
                id: "57494bce-4c9c-455f-93b0-89967b0e9630",
                modifierGroupId: "14fc7e10-5027-40ea-8eba-1419f8984acd",
                name: "75%",
                price: "0",
                sortOrder: 4,
            },
            {
                id: "0a26ea1c-2e29-4849-89dc-8cd23b8b127b",
                modifierGroupId: "14fc7e10-5027-40ea-8eba-1419f8984acd",
                name: "100%",
                price: "0",
                sortOrder: 5,
            },
            // Milk Type
            {
                id: "d677ff95-041b-42b6-b763-c066091b2c16",
                modifierGroupId: "128d1d51-f5d4-4132-8f54-3e2c823fc6b5",
                name: "Whole Milk",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "7d5a3c32-bc79-416c-b231-fc03d1fc623a",
                modifierGroupId: "128d1d51-f5d4-4132-8f54-3e2c823fc6b5",
                name: "Oat Milk",
                price: "0.50",
                sortOrder: 2,
            },
            // Toppings
            {
                id: "a7d3f3bd-d8cb-450f-86d4-c1115add5940",
                modifierGroupId: "d369535d-9be4-43af-aa94-0a543943f81f",
                name: "Whipped Cream",
                price: "0.50",
                sortOrder: 1,
            },
            {
                id: "603291de-c298-41d4-968a-8b41392d18ba",
                modifierGroupId: "d369535d-9be4-43af-aa94-0a543943f81f",
                name: "Caramel Drizzle",
                price: "0.75",
                sortOrder: 2,
            },
        ])
        .onConflictDoNothing();

    console.log("  Modifier Group defaults...");
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "8b916a91-8626-4256-9621-c80f6c91bf85",
        })
        .where(
            eq(modifierGroupsTable.id, "7c38084f-ce4c-4c5c-9587-ec203d8eeb99"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "b1a0f56a-3cb6-4f28-803f-cca5f21e5380",
        })
        .where(
            eq(modifierGroupsTable.id, "14fc7e10-5027-40ea-8eba-1419f8984acd"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "d677ff95-041b-42b6-b763-c066091b2c16",
        })
        .where(
            eq(modifierGroupsTable.id, "128d1d51-f5d4-4132-8f54-3e2c823fc6b5"),
        );
    console.log("  Modifier Option Ingredients...");
    await db
        .insert(modifierOptionIngredientsTable)
        .values([
            // Latte → Small
            {
                modifierOptionId: "31fd6ad0-6301-465d-95d4-32accff8278c",
                ingredientId: "d65097ac-3171-4d47-9fbd-b881b470711b",
                quantity: "14",
            },
            {
                modifierOptionId: "31fd6ad0-6301-465d-95d4-32accff8278c",
                ingredientId: "b7e779c7-e70c-4e12-859c-60b1e920794a",
                quantity: "200",
            },
            // Latte → Medium
            {
                modifierOptionId: "8b916a91-8626-4256-9621-c80f6c91bf85",
                ingredientId: "d65097ac-3171-4d47-9fbd-b881b470711b",
                quantity: "16",
            },
            {
                modifierOptionId: "8b916a91-8626-4256-9621-c80f6c91bf85",
                ingredientId: "b7e779c7-e70c-4e12-859c-60b1e920794a",
                quantity: "250",
            },
            // Latte → Large
            {
                modifierOptionId: "83caebeb-6a37-4ea6-be4f-77040d69429e",
                ingredientId: "d65097ac-3171-4d47-9fbd-b881b470711b",
                quantity: "18",
            },
            {
                modifierOptionId: "83caebeb-6a37-4ea6-be4f-77040d69429e",
                ingredientId: "b7e779c7-e70c-4e12-859c-60b1e920794a",
                quantity: "300",
            },
            // Latte → Oat Milk
            {
                modifierOptionId: "7d5a3c32-bc79-416c-b231-fc03d1fc623a",
                ingredientId: "5ab280ae-4f0e-4db9-b01e-619fd2c9ecae",
                quantity: "250",
            },
            // Latte → Whipped Cream
            {
                modifierOptionId: "a7d3f3bd-d8cb-450f-86d4-c1115add5940",
                ingredientId: "c017b2fc-db5f-4b6c-b759-15c69a4af5d5",
                quantity: "50",
            },
            // Latte → Caramel Drizzle
            {
                modifierOptionId: "603291de-c298-41d4-968a-8b41392d18ba",
                ingredientId: "9b47a12f-e5c1-491d-86c0-ebea47cfc7e5",
                quantity: "20",
            },
            // Iced Latte → Large
            {
                modifierOptionId: "83caebeb-6a37-4ea6-be4f-77040d69429e",
                ingredientId: "d65097ac-3171-4d47-9fbd-b881b470711b",
                quantity: "18",
            },
            {
                modifierOptionId: "83caebeb-6a37-4ea6-be4f-77040d69429e",
                ingredientId: "b7e779c7-e70c-4e12-859c-60b1e920794a",
                quantity: "250",
            },
            // Green Tea → Large
            {
                modifierOptionId: "83caebeb-6a37-4ea6-be4f-77040d69429e",
                ingredientId: "5c91a9ce-a730-47aa-84c1-b76bae51770a",
                quantity: "12",
            },
        ])
        .onConflictDoNothing();

    console.log("  Item Recipes...");
    await db
        .insert(itemRecipesTable)
        .values([
            {
                itemId: "cd297893-a429-4f86-a240-b99e01ab0d50",
                ingredientId: "60340e44-5a8e-456b-b254-f62336da788e",
                quantity: "1",
            },
        ])
        .onConflictDoNothing();

    console.log("  Discounts...");
    await db
        .insert(discountsTable)
        .values([
            {
                id: "6718af54-aaad-4fa4-8ace-41033f58a9bf",
                name: "Happy Hour 20% Off",
                type: "percentage",
                value: "20",
                isActive: true,
            },
            {
                id: "d1b8ad76-d082-4460-975b-4d38ebe0fd2d",
                name: "Buy 1 Get 1 Free",
                type: "bogo",
                value: null,
                isActive: true,
            },
        ])
        .onConflictDoNothing();

    console.log("Seed complete.");
};

import { fileURLToPath } from "url";

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
    seed()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
}
