import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "./index.ts";
import {
    employeesTable,
    employeePermissionsTable,
    categoriesTable,
    ingredientsTable,
    modifierGroupsTable,
    modifierOptionsTable,
    menuItemsTable,
    menuItemModifierGroupsTable,
    itemRecipesTable,
    modifierOptionIngredientsTable,
    discountsTable,
    menuItemModifierOptionOverridesTable,
} from "./schema/index.ts";

export const seed = async () => {
    console.log("Seeding database...");

    // ── Employees ──────────────────────────────────────────────
    console.log("  Employees...");
    await db
        .insert(employeesTable)
        .values([
            {
                id: "00000000-0000-0000-0000-000000000001",
                role: "owner",
                name: "Cafe Owner",
                pin: "$2a$10$EXAMPLE_HASH_OWNER",
                supabaseUid: "00000000-0000-0000-0000-0000000000aa",
                isActive: true,
            },
            {
                id: "00000000-0000-0000-0000-000000000002",
                role: "manager",
                name: "Alice (Manager)",
                pin: "$2a$10$EXAMPLE_HASH_MANAGER",
                supabaseUid: "00000000-0000-0000-0000-0000000000bb",
                isActive: true,
            },
            {
                id: "00000000-0000-0000-0000-000000000003",
                role: "barista",
                name: "Bob",
                pin: "$2a$10$EXAMPLE_HASH_BARISTA1",
                isActive: true,
            },
            {
                id: "00000000-0000-0000-0000-000000000004",
                role: "barista",
                name: "Cindy",
                pin: "$2a$10$EXAMPLE_HASH_BARISTA2",
                isActive: true,
            },
        ])
        .onConflictDoNothing();

    // ── Employee Permissions ───────────────────────────────────
    console.log("  Employee Permissions...");
    await db
        .insert(employeePermissionsTable)
        .values([
            {
                employeeId: "00000000-0000-0000-0000-000000000001",
                canSell: true,
                canApplyDiscount: true,
                canVoidRequest: true,
                canVoidApprove: true,
                canManageMenu: true,
                canManageInventory: true,
                canViewReports: true,
                canOpenRegister: true,
                canAdjustStock: true,
                canManageEmployees: true,
                maxDiscountPercent: 100,
                maxDiscountAmount: "999.99",
            },
            {
                employeeId: "00000000-0000-0000-0000-000000000002",
                canSell: true,
                canApplyDiscount: true,
                canVoidRequest: true,
                canVoidApprove: true,
                canManageMenu: true,
                canManageInventory: true,
                canViewReports: true,
                canOpenRegister: true,
                canAdjustStock: true,
                canManageEmployees: false,
                maxDiscountPercent: 100,
                maxDiscountAmount: "999.99",
            },
            {
                employeeId: "00000000-0000-0000-0000-000000000003",
                canSell: true,
                canApplyDiscount: true,
                canVoidRequest: true,
                canVoidApprove: false,
                canManageMenu: false,
                canManageInventory: false,
                canViewReports: false,
                canOpenRegister: true,
                canAdjustStock: false,
                canManageEmployees: false,
                maxDiscountPercent: 10,
                maxDiscountAmount: "5.00",
            },
            {
                employeeId: "00000000-0000-0000-0000-000000000004",
                canSell: true,
                canApplyDiscount: true,
                canVoidRequest: true,
                canVoidApprove: false,
                canManageMenu: false,
                canManageInventory: false,
                canViewReports: false,
                canOpenRegister: true,
                canAdjustStock: false,
                canManageEmployees: false,
                maxDiscountPercent: 10,
                maxDiscountAmount: "5.00",
            },
        ])
        .onConflictDoNothing();

    // ── Categories ─────────────────────────────────────────────
    console.log("  Categories...");
    await db
        .insert(categoriesTable)
        .values([
            {
                id: "10000000-0000-0000-0000-000000000001",
                name: "Coffee",
                sortOrder: 1,
            },
            {
                id: "10000000-0000-0000-0000-000000000002",
                name: "Tea",
                sortOrder: 2,
            },
            {
                id: "10000000-0000-0000-0000-000000000003",
                name: "Pastry",
                sortOrder: 3,
            },
            {
                id: "10000000-0000-0000-0000-000000000004",
                name: "Sandwich",
                sortOrder: 4,
            },
        ])
        .onConflictDoNothing();

    // ── Ingredients ────────────────────────────────────────────
    console.log("  Ingredients...");
    await db
        .insert(ingredientsTable)
        .values([
            {
                id: "20000000-0000-0000-0000-000000000001",
                name: "Coffee Beans",
                unit: "g",
                stockQuantity: "5000",
                lowStockThreshold: "500",
            },
            {
                id: "20000000-0000-0000-0000-000000000002",
                name: "Whole Milk",
                unit: "ml",
                stockQuantity: "10000",
                lowStockThreshold: "1000",
            },
            {
                id: "20000000-0000-0000-0000-000000000003",
                name: "Oat Milk",
                unit: "ml",
                stockQuantity: "3000",
                lowStockThreshold: "300",
            },
            {
                id: "20000000-0000-0000-0000-000000000004",
                name: "Caramel Syrup",
                unit: "ml",
                stockQuantity: "2000",
                lowStockThreshold: "200",
            },
            {
                id: "20000000-0000-0000-0000-000000000005",
                name: "Whipped Cream",
                unit: "ml",
                stockQuantity: "1500",
                lowStockThreshold: "150",
            },
            {
                id: "20000000-0000-0000-0000-000000000006",
                name: "Green Tea Powder",
                unit: "g",
                stockQuantity: "800",
                lowStockThreshold: "80",
            },
            {
                id: "20000000-0000-0000-0000-000000000007",
                name: "Croissant Unit",
                unit: "g",
                stockQuantity: "30",
                lowStockThreshold: "5",
            },
        ])
        .onConflictDoNothing();

    // ── Modifier Groups ───────────────────────────────────────
    console.log("  Modifier Groups...");
    await db
        .insert(modifierGroupsTable)
        .values([
            {
                id: "30000000-0000-0000-0000-000000000001",
                name: "Cup Size",
                selectionType: "single",
                isRequired: true,
                sortOrder: 1,
            },
            {
                id: "30000000-0000-0000-0000-000000000002",
                name: "Sugar Level",
                selectionType: "single",
                isRequired: true,
                sortOrder: 2,
            },
            {
                id: "30000000-0000-0000-0000-000000000003",
                name: "Milk Type",
                selectionType: "single",
                isRequired: true,
                sortOrder: 3,
            },
            {
                id: "30000000-0000-0000-0000-000000000004",
                name: "Toppings",
                selectionType: "multiple",
                isRequired: false,
                sortOrder: 4,
            },
        ])
        .onConflictDoNothing();

    // ── Modifier Options ──────────────────────────────────────
    console.log("  Modifier Options...");
    await db
        .insert(modifierOptionsTable)
        .values([
            // Cup Size
            {
                id: "40000000-0000-0000-0000-000000000001",
                modifierGroupId: "30000000-0000-0000-0000-000000000001",
                name: "Small",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "40000000-0000-0000-0000-000000000002",
                modifierGroupId: "30000000-0000-0000-0000-000000000001",
                name: "Medium",
                price: "0.50",
                sortOrder: 2,
            },
            {
                id: "40000000-0000-0000-0000-000000000003",
                modifierGroupId: "30000000-0000-0000-0000-000000000001",
                name: "Large",
                price: "1.00",
                sortOrder: 3,
            },
            // Sugar Level
            {
                id: "40000000-0000-0000-0000-000000000004",
                modifierGroupId: "30000000-0000-0000-0000-000000000002",
                name: "0%",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "40000000-0000-0000-0000-000000000005",
                modifierGroupId: "30000000-0000-0000-0000-000000000002",
                name: "25%",
                price: "0",
                sortOrder: 2,
            },
            {
                id: "40000000-0000-0000-0000-000000000006",
                modifierGroupId: "30000000-0000-0000-0000-000000000002",
                name: "50%",
                price: "0",
                sortOrder: 3,
            },
            {
                id: "40000000-0000-0000-0000-000000000007",
                modifierGroupId: "30000000-0000-0000-0000-000000000002",
                name: "75%",
                price: "0",
                sortOrder: 4,
            },
            {
                id: "40000000-0000-0000-0000-000000000008",
                modifierGroupId: "30000000-0000-0000-0000-000000000002",
                name: "100%",
                price: "0",
                sortOrder: 5,
            },
            // Milk Type
            {
                id: "40000000-0000-0000-0000-000000000009",
                modifierGroupId: "30000000-0000-0000-0000-000000000003",
                name: "Whole Milk",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "40000000-0000-0000-0000-000000000010",
                modifierGroupId: "30000000-0000-0000-0000-000000000003",
                name: "Oat Milk",
                price: "0.50",
                sortOrder: 2,
            },
            // Toppings
            {
                id: "40000000-0000-0000-0000-000000000011",
                modifierGroupId: "30000000-0000-0000-0000-000000000004",
                name: "Whipped Cream",
                price: "0.50",
                sortOrder: 1,
            },
            {
                id: "40000000-0000-0000-0000-000000000012",
                modifierGroupId: "30000000-0000-0000-0000-000000000004",
                name: "Caramel Drizzle",
                price: "0.75",
                sortOrder: 2,
            },
        ])
        .onConflictDoNothing();

    // ── Modifier Group default options ────────────────────────
    console.log("  Modifier Group defaults...");
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "40000000-0000-0000-0000-000000000002",
        })
        .where(
            eq(modifierGroupsTable.id, "30000000-0000-0000-0000-000000000001"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "40000000-0000-0000-0000-000000000004",
        })
        .where(
            eq(modifierGroupsTable.id, "30000000-0000-0000-0000-000000000002"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "40000000-0000-0000-0000-000000000009",
        })
        .where(
            eq(modifierGroupsTable.id, "30000000-0000-0000-0000-000000000003"),
        );

    // ── Menu Items ────────────────────────────────────────────
    console.log("  Menu Items...");
    await db
        .insert(menuItemsTable)
        .values([
            {
                id: "50000000-0000-0000-0000-000000000001",
                categoryId: "10000000-0000-0000-0000-000000000001",
                name: "Latte",
                basePrice: "3.50",
            },
            {
                id: "50000000-0000-0000-0000-000000000002",
                categoryId: "10000000-0000-0000-0000-000000000001",
                name: "Iced Latte",
                basePrice: "4.00",
            },
            {
                id: "50000000-0000-0000-0000-000000000003",
                categoryId: "10000000-0000-0000-0000-000000000002",
                name: "Green Tea",
                basePrice: "3.00",
            },
            {
                id: "50000000-0000-0000-0000-000000000004",
                categoryId: "10000000-0000-0000-0000-000000000003",
                name: "Croissant",
                basePrice: "3.00",
            },
        ])
        .onConflictDoNothing();

    // ── Menu Item ↔ Modifier Groups ──────────────────────────
    console.log("  Menu Item Modifier Groups...");
    await db
        .insert(menuItemModifierGroupsTable)
        .values([
            {
                menuItemId: "50000000-0000-0000-0000-000000000001",
                modifierGroupId: "30000000-0000-0000-0000-000000000001",
                sortOrder: 1,
            },
            {
                menuItemId: "50000000-0000-0000-0000-000000000001",
                modifierGroupId: "30000000-0000-0000-0000-000000000002",
                sortOrder: 2,
            },
            {
                menuItemId: "50000000-0000-0000-0000-000000000001",
                modifierGroupId: "30000000-0000-0000-0000-000000000003",
                sortOrder: 3,
            },
            {
                menuItemId: "50000000-0000-0000-0000-000000000001",
                modifierGroupId: "30000000-0000-0000-0000-000000000004",
                sortOrder: 4,
            },
            {
                menuItemId: "50000000-0000-0000-0000-000000000002",
                modifierGroupId: "30000000-0000-0000-0000-000000000001",
                sortOrder: 1,
            },
            {
                menuItemId: "50000000-0000-0000-0000-000000000002",
                modifierGroupId: "30000000-0000-0000-0000-000000000002",
                sortOrder: 2,
            },
            {
                menuItemId: "50000000-0000-0000-0000-000000000002",
                modifierGroupId: "30000000-0000-0000-0000-000000000003",
                sortOrder: 3,
            },
            {
                menuItemId: "50000000-0000-0000-0000-000000000002",
                modifierGroupId: "30000000-0000-0000-0000-000000000004",
                sortOrder: 4,
            },
            {
                menuItemId: "50000000-0000-0000-0000-000000000003",
                modifierGroupId: "30000000-0000-0000-0000-000000000001",
                sortOrder: 1,
            },
            {
                menuItemId: "50000000-0000-0000-0000-000000000003",
                modifierGroupId: "30000000-0000-0000-0000-000000000002",
                sortOrder: 2,
            },
        ])
        .onConflictDoNothing();

    // ── Modifier Option Ingredients ───────────────────────────
    console.log("  Modifier Option Ingredients...");
    await db
        .insert(modifierOptionIngredientsTable)
        .values([
            // Latte → Small
            {
                itemId: "50000000-0000-0000-0000-000000000001",
                modifierOptionId: "40000000-0000-0000-0000-000000000001",
                ingredientId: "20000000-0000-0000-0000-000000000001",
                quantity: "14",
            },
            {
                itemId: "50000000-0000-0000-0000-000000000001",
                modifierOptionId: "40000000-0000-0000-0000-000000000001",
                ingredientId: "20000000-0000-0000-0000-000000000002",
                quantity: "200",
            },
            // Latte → Medium
            {
                itemId: "50000000-0000-0000-0000-000000000001",
                modifierOptionId: "40000000-0000-0000-0000-000000000002",
                ingredientId: "20000000-0000-0000-0000-000000000001",
                quantity: "16",
            },
            {
                itemId: "50000000-0000-0000-0000-000000000001",
                modifierOptionId: "40000000-0000-0000-0000-000000000002",
                ingredientId: "20000000-0000-0000-0000-000000000002",
                quantity: "250",
            },
            // Latte → Large
            {
                itemId: "50000000-0000-0000-0000-000000000001",
                modifierOptionId: "40000000-0000-0000-0000-000000000003",
                ingredientId: "20000000-0000-0000-0000-000000000001",
                quantity: "18",
            },
            {
                itemId: "50000000-0000-0000-0000-000000000001",
                modifierOptionId: "40000000-0000-0000-0000-000000000003",
                ingredientId: "20000000-0000-0000-0000-000000000002",
                quantity: "300",
            },
            // Latte → Oat Milk
            {
                itemId: "50000000-0000-0000-0000-000000000001",
                modifierOptionId: "40000000-0000-0000-0000-000000000010",
                ingredientId: "20000000-0000-0000-0000-000000000003",
                quantity: "250",
            },
            // Latte → Whipped Cream
            {
                itemId: "50000000-0000-0000-0000-000000000001",
                modifierOptionId: "40000000-0000-0000-0000-000000000011",
                ingredientId: "20000000-0000-0000-0000-000000000005",
                quantity: "50",
            },
            // Latte → Caramel Drizzle
            {
                itemId: "50000000-0000-0000-0000-000000000001",
                modifierOptionId: "40000000-0000-0000-0000-000000000012",
                ingredientId: "20000000-0000-0000-0000-000000000004",
                quantity: "20",
            },
            // Iced Latte → Large
            {
                itemId: "50000000-0000-0000-0000-000000000002",
                modifierOptionId: "40000000-0000-0000-0000-000000000003",
                ingredientId: "20000000-0000-0000-0000-000000000001",
                quantity: "18",
            },
            {
                itemId: "50000000-0000-0000-0000-000000000002",
                modifierOptionId: "40000000-0000-0000-0000-000000000003",
                ingredientId: "20000000-0000-0000-0000-000000000002",
                quantity: "250",
            },
            // Green Tea → Large
            {
                itemId: "50000000-0000-0000-0000-000000000003",
                modifierOptionId: "40000000-0000-0000-0000-000000000003",
                ingredientId: "20000000-0000-0000-0000-000000000006",
                quantity: "12",
            },
        ])
        .onConflictDoNothing();

    // ── Item Recipes (base recipes, no modifiers) ─────────────
    console.log("  Item Recipes...");
    await db
        .insert(itemRecipesTable)
        .values([
            {
                itemId: "50000000-0000-0000-0000-000000000004",
                ingredientId: "20000000-0000-0000-0000-000000000007",
                quantity: "1",
            },
        ])
        .onConflictDoNothing();

    // ── Discounts ─────────────────────────────────────────────
    console.log("  Discounts...");
    await db
        .insert(discountsTable)
        .values([
            {
                id: "60000000-0000-0000-0000-000000000001",
                name: "Happy Hour 20% Off",
                type: "percentage",
                value: "20",
                isActive: true,
            },
            {
                id: "60000000-0000-0000-0000-000000000002",
                name: "Buy 1 Get 1 Free",
                type: "bogo",
                value: null,
                isActive: true,
            },
        ])
        .onConflictDoNothing();

    // ── Menu Item Modifier Option Overrides ───────────────────
    console.log("  Modifier Option Overrides...");
    await db
        .insert(menuItemModifierOptionOverridesTable)
        .values([
            {
                menuItemId: "50000000-0000-0000-0000-000000000003",
                modifierOptionId: "40000000-0000-0000-0000-000000000003",
                priceOverride: "0.50",
            },
            {
                menuItemId: "50000000-0000-0000-0000-000000000003",
                modifierOptionId: "40000000-0000-0000-0000-000000000001",
                isAvailable: false,
            },
            {
                menuItemId: "50000000-0000-0000-0000-000000000003",
                modifierOptionId: "40000000-0000-0000-0000-000000000010",
                isAvailable: false,
            },
            {
                menuItemId: "50000000-0000-0000-0000-000000000003",
                modifierOptionId: "40000000-0000-0000-0000-000000000012",
                isAvailable: false,
            },
        ])
        .onConflictDoNothing();

    console.log("Seed complete.");
};

import { fileURLToPath } from "url";

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
    seed()
        .catch(console.error)
        .finally(() => process.exit());
}
