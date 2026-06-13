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
            {
                id: "4555b44c-8150-4562-a91a-d90a16ed43fa",
                name: "Almond Milk",
                unit: "ml",
                stockQuantity: "3000",
                lowStockThreshold: "300",
            },
            {
                id: "d5592016-85e4-42bf-8b65-803b12cb5e30",
                name: "Soy Milk",
                unit: "ml",
                stockQuantity: "3000",
                lowStockThreshold: "300",
            },
            {
                id: "2db3f327-36b0-49d0-bec6-e1777c17ceff",
                name: "Tea Leaves",
                unit: "g",
                stockQuantity: "600",
                lowStockThreshold: "60",
            },
            {
                id: "6ea63b6a-acaa-458a-9c99-623c430d53df",
                name: "Chai Concentrate",
                unit: "ml",
                stockQuantity: "2000",
                lowStockThreshold: "200",
            },
            {
                id: "7a0a8b17-92a6-469c-a120-33e9e4264284",
                name: "Matcha Powder",
                unit: "g",
                stockQuantity: "500",
                lowStockThreshold: "50",
            },
            {
                id: "445e452c-14a6-44a8-a185-56234926b07a",
                name: "Chocolate Sauce",
                unit: "ml",
                stockQuantity: "1500",
                lowStockThreshold: "150",
            },
            {
                id: "5937761d-2806-4962-8aa4-ecd66ddca3bb",
                name: "Cream Base",
                unit: "ml",
                stockQuantity: "3000",
                lowStockThreshold: "300",
            },
            {
                id: "97ab5de8-7d51-4150-96a4-a20bed70df71",
                name: "Ice Cube",
                unit: "g",
                stockQuantity: "10000",
                lowStockThreshold: "1000",
            },
            {
                id: "36f31b16-2435-4471-8b2b-2dc8a7ccdaa9",
                name: "Muffin Unit",
                unit: "g",
                stockQuantity: "25",
                lowStockThreshold: "5",
            },
            {
                id: "82d1098d-9674-40a3-a706-9315a9402056",
                name: "Cookie Unit",
                unit: "g",
                stockQuantity: "40",
                lowStockThreshold: "8",
            },
            {
                id: "f655d517-c708-4f31-a375-62262c3fab17",
                name: "Cinnamon Roll Unit",
                unit: "g",
                stockQuantity: "20",
                lowStockThreshold: "4",
            },
            {
                id: "5eca42e5-d1a6-4b1d-8bab-2e4594e4176f",
                name: "Ham",
                unit: "g",
                stockQuantity: "2000",
                lowStockThreshold: "200",
            },
            {
                id: "55cb7dae-0fe6-4bc0-ba77-096f0b81d224",
                name: "Cheese Slice",
                unit: "g",
                stockQuantity: "30",
                lowStockThreshold: "5",
            },
            {
                id: "b883c31d-219e-48b5-ba84-d5d439513480",
                name: "Chicken",
                unit: "g",
                stockQuantity: "3000",
                lowStockThreshold: "300",
            },
            {
                id: "62835de4-5ddc-450f-9fa5-4ea3807edfcd",
                name: "Caesar Dressing",
                unit: "ml",
                stockQuantity: "1500",
                lowStockThreshold: "150",
            },
            {
                id: "6c158039-0aa4-4baa-9555-a619387af12d",
                name: "Tortilla Wrap",
                unit: "g",
                stockQuantity: "25",
                lowStockThreshold: "5",
            },
            {
                id: "9dcc2862-58ef-4261-ac56-c1498412257b",
                name: "Bread Roll",
                unit: "g",
                stockQuantity: "20",
                lowStockThreshold: "4",
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
            {
                id: "20bec654-ef01-4606-8eb5-31e7c6e88112",
                categoryId: "760229b2-0fbb-4fae-9dee-20dabba50ce2",
                name: "Espresso",
                basePrice: "2.50",
            },
            {
                id: "0f04732b-2db5-4166-a1c4-c6676de14e22",
                categoryId: "760229b2-0fbb-4fae-9dee-20dabba50ce2",
                name: "Americano",
                basePrice: "3.00",
            },
            {
                id: "6d68e9f3-9cfb-44dd-9d41-e5505685ce53",
                categoryId: "760229b2-0fbb-4fae-9dee-20dabba50ce2",
                name: "Cappuccino",
                basePrice: "3.50",
            },
            {
                id: "31106854-4c60-440c-9c31-fa1130c155f8",
                categoryId: "760229b2-0fbb-4fae-9dee-20dabba50ce2",
                name: "Flat White",
                basePrice: "3.75",
            },
            {
                id: "c6144bdf-f15b-4a8d-b594-cbe122140d4e",
                categoryId: "760229b2-0fbb-4fae-9dee-20dabba50ce2",
                name: "Mocha",
                basePrice: "4.25",
            },
            {
                id: "5d537708-a892-49ea-9886-64b1809b9406",
                categoryId: "760229b2-0fbb-4fae-9dee-20dabba50ce2",
                name: "Iced Americano",
                basePrice: "3.50",
            },
            {
                id: "43ba26be-4e84-45af-83b3-d99a4417585c",
                categoryId: "760229b2-0fbb-4fae-9dee-20dabba50ce2",
                name: "Cold Brew",
                basePrice: "4.50",
            },
            {
                id: "048bd930-5aa5-4049-826f-6de4c88ced8c",
                categoryId: "760229b2-0fbb-4fae-9dee-20dabba50ce2",
                name: "Frappuccino",
                basePrice: "5.00",
            },
            {
                id: "27ec4974-adbc-4543-a174-d9787b3e6666",
                categoryId: "fb85494f-5e8a-4c38-a3cb-a5ed01700d11",
                name: "Earl Grey Tea",
                basePrice: "3.00",
            },
            {
                id: "2ff30749-4498-4945-8af1-4e022335db36",
                categoryId: "fb85494f-5e8a-4c38-a3cb-a5ed01700d11",
                name: "Chai Latte",
                basePrice: "4.00",
            },
            {
                id: "f8d79186-76fe-431d-9224-4ff44ae95623",
                categoryId: "fb85494f-5e8a-4c38-a3cb-a5ed01700d11",
                name: "Matcha Latte",
                basePrice: "4.50",
            },
            {
                id: "e20feb5b-5980-4e03-901a-c6c7a3fc4766",
                categoryId: "333fbaf8-92eb-4c73-9e22-cee8ad7be62f",
                name: "Blueberry Muffin",
                basePrice: "3.50",
            },
            {
                id: "8240a5b6-072c-4fb7-9345-8075489611cf",
                categoryId: "333fbaf8-92eb-4c73-9e22-cee8ad7be62f",
                name: "Chocolate Chip Cookie",
                basePrice: "2.50",
            },
            {
                id: "58f0375c-3367-44d6-a3d2-905e174d7598",
                categoryId: "333fbaf8-92eb-4c73-9e22-cee8ad7be62f",
                name: "Cinnamon Roll",
                basePrice: "4.00",
            },
            {
                id: "14cbc963-c2f3-44f0-9c45-56b62ac5b97b",
                categoryId: "eb9118be-f702-4ba9-ba0f-97c4de9cf305",
                name: "Ham & Cheese Sandwich",
                basePrice: "5.50",
            },
            {
                id: "3cad9c4a-de73-45a8-a669-c0a5ca7dd2a2",
                categoryId: "eb9118be-f702-4ba9-ba0f-97c4de9cf305",
                name: "Chicken Caesar Wrap",
                basePrice: "6.00",
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
            {
                id: "b7f08b19-3aab-4bf7-b61c-115ed485aecc",
                menuItemId: "20bec654-ef01-4606-8eb5-31e7c6e88112",
                name: "Cup Size",
                selectionType: "single",
                isRequired: true,
                sortOrder: 1,
            },
            {
                id: "9100b3b6-0691-4182-ab08-4eff151bb417",
                menuItemId: "20bec654-ef01-4606-8eb5-31e7c6e88112",
                name: "Sugar Level",
                selectionType: "single",
                isRequired: true,
                sortOrder: 2,
            },
            {
                id: "de2e1a51-1b6f-4c85-a178-bad0e67a4604",
                menuItemId: "20bec654-ef01-4606-8eb5-31e7c6e88112",
                name: "Extra Shot",
                selectionType: "single",
                isRequired: false,
                sortOrder: 3,
            },
            {
                id: "f5c8f0ea-5905-4cfb-a4fa-7f8272a98f74",
                menuItemId: "0f04732b-2db5-4166-a1c4-c6676de14e22",
                name: "Cup Size",
                selectionType: "single",
                isRequired: true,
                sortOrder: 1,
            },
            {
                id: "a93c1d1f-178d-49c2-a2eb-aa43e0a1ba6e",
                menuItemId: "0f04732b-2db5-4166-a1c4-c6676de14e22",
                name: "Sugar Level",
                selectionType: "single",
                isRequired: true,
                sortOrder: 2,
            },
            {
                id: "a2b46de9-6eb8-4990-a412-12f52fa66e29",
                menuItemId: "0f04732b-2db5-4166-a1c4-c6676de14e22",
                name: "Milk Option",
                selectionType: "single",
                isRequired: false,
                sortOrder: 3,
            },
            {
                id: "bd0ebe4c-5145-4053-ad14-c389ef96e78d",
                menuItemId: "257f7064-9fd9-466f-afb0-7218e514f67f",
                name: "Extra Shot",
                selectionType: "single",
                isRequired: false,
                sortOrder: 4,
            },
            {
                id: "0fc57c7a-8194-4d4d-a92c-db071cf0614c",
                menuItemId: "6d68e9f3-9cfb-44dd-9d41-e5505685ce53",
                name: "Cup Size",
                selectionType: "single",
                isRequired: true,
                sortOrder: 1,
            },
            {
                id: "05e07662-afb0-4f53-bb04-96e5d534ce75",
                menuItemId: "6d68e9f3-9cfb-44dd-9d41-e5505685ce53",
                name: "Sugar Level",
                selectionType: "single",
                isRequired: true,
                sortOrder: 2,
            },
            {
                id: "49013759-2a8a-44d7-bbf5-ffdcc08121e9",
                menuItemId: "6d68e9f3-9cfb-44dd-9d41-e5505685ce53",
                name: "Milk Type",
                selectionType: "single",
                isRequired: true,
                sortOrder: 3,
            },
            {
                id: "d292ea49-33f7-4f7b-bcd8-cb991b711dda",
                menuItemId: "6d68e9f3-9cfb-44dd-9d41-e5505685ce53",
                name: "Extra Shot",
                selectionType: "single",
                isRequired: false,
                sortOrder: 4,
            },
            {
                id: "60befca9-289e-4797-8d55-f864047f2733",
                menuItemId: "31106854-4c60-440c-9c31-fa1130c155f8",
                name: "Cup Size",
                selectionType: "single",
                isRequired: true,
                sortOrder: 1,
            },
            {
                id: "16b4da2b-018e-4a77-91ee-bff1a8936ec7",
                menuItemId: "31106854-4c60-440c-9c31-fa1130c155f8",
                name: "Sugar Level",
                selectionType: "single",
                isRequired: true,
                sortOrder: 2,
            },
            {
                id: "aac10392-60d0-4048-817c-1e14620ac161",
                menuItemId: "31106854-4c60-440c-9c31-fa1130c155f8",
                name: "Milk Type",
                selectionType: "single",
                isRequired: true,
                sortOrder: 3,
            },
            {
                id: "e00819cf-1488-4978-9bca-0c1115f2d6ae",
                menuItemId: "c6144bdf-f15b-4a8d-b594-cbe122140d4e",
                name: "Cup Size",
                selectionType: "single",
                isRequired: true,
                sortOrder: 1,
            },
            {
                id: "75d2fac7-2464-4dcf-aad4-262cd78ad4e3",
                menuItemId: "c6144bdf-f15b-4a8d-b594-cbe122140d4e",
                name: "Sugar Level",
                selectionType: "single",
                isRequired: true,
                sortOrder: 2,
            },
            {
                id: "ef07baf3-7e8d-49e1-b574-5e5bb1141979",
                menuItemId: "c6144bdf-f15b-4a8d-b594-cbe122140d4e",
                name: "Milk Type",
                selectionType: "single",
                isRequired: true,
                sortOrder: 3,
            },
            {
                id: "0cf2dbe8-a25f-4132-b78b-893c5945542b",
                menuItemId: "c6144bdf-f15b-4a8d-b594-cbe122140d4e",
                name: "Extra Shot",
                selectionType: "single",
                isRequired: false,
                sortOrder: 4,
            },
            {
                id: "ecf2a330-36c1-4a29-9583-903fe48e5388",
                menuItemId: "edf35213-cdf7-4979-963b-6806bb4f8933",
                name: "Cup Size",
                selectionType: "single",
                isRequired: true,
                sortOrder: 1,
            },
            {
                id: "c87fa5fd-0551-4fe6-b865-6894bbe2ed86",
                menuItemId: "edf35213-cdf7-4979-963b-6806bb4f8933",
                name: "Sugar Level",
                selectionType: "single",
                isRequired: true,
                sortOrder: 2,
            },
            {
                id: "4b3667b8-43fc-4f89-8cae-352511e2accb",
                menuItemId: "edf35213-cdf7-4979-963b-6806bb4f8933",
                name: "Milk Option",
                selectionType: "single",
                isRequired: false,
                sortOrder: 3,
            },
            {
                id: "405ed4ad-6bf2-4aff-a9bd-cf89f80b1fa0",
                menuItemId: "edf35213-cdf7-4979-963b-6806bb4f8933",
                name: "Ice Level",
                selectionType: "single",
                isRequired: true,
                sortOrder: 5,
            },
            {
                id: "59d33b4b-f23e-4bd1-9a09-45f4f0df45d1",
                menuItemId: "5d537708-a892-49ea-9886-64b1809b9406",
                name: "Cup Size",
                selectionType: "single",
                isRequired: true,
                sortOrder: 1,
            },
            {
                id: "60deb156-275f-4cf6-9f19-33b4a8319a05",
                menuItemId: "5d537708-a892-49ea-9886-64b1809b9406",
                name: "Sugar Level",
                selectionType: "single",
                isRequired: true,
                sortOrder: 2,
            },
            {
                id: "0ed04a37-3f76-46fb-b062-1c7257ca1f7d",
                menuItemId: "5d537708-a892-49ea-9886-64b1809b9406",
                name: "Milk Option",
                selectionType: "single",
                isRequired: false,
                sortOrder: 3,
            },
            {
                id: "83f0900f-55dd-43d4-b31a-8fd9ae6239a6",
                menuItemId: "5d537708-a892-49ea-9886-64b1809b9406",
                name: "Ice Level",
                selectionType: "single",
                isRequired: true,
                sortOrder: 4,
            },
            {
                id: "8a558da3-82c2-487a-9dd5-f037eaea1ad2",
                menuItemId: "43ba26be-4e84-45af-83b3-d99a4417585c",
                name: "Cup Size",
                selectionType: "single",
                isRequired: true,
                sortOrder: 1,
            },
            {
                id: "29850737-b313-45dd-868f-b025d173c458",
                menuItemId: "43ba26be-4e84-45af-83b3-d99a4417585c",
                name: "Sugar Level",
                selectionType: "single",
                isRequired: true,
                sortOrder: 2,
            },
            {
                id: "4aad97c0-7fbb-41bd-b2de-48e7b7aedd26",
                menuItemId: "43ba26be-4e84-45af-83b3-d99a4417585c",
                name: "Ice Level",
                selectionType: "single",
                isRequired: true,
                sortOrder: 3,
            },
            {
                id: "aea2a2b9-3183-4157-91f9-04edabcc0f5a",
                menuItemId: "048bd930-5aa5-4049-826f-6de4c88ced8c",
                name: "Cup Size",
                selectionType: "single",
                isRequired: true,
                sortOrder: 1,
            },
            {
                id: "da087462-0709-43be-a691-8cb243a87bd5",
                menuItemId: "048bd930-5aa5-4049-826f-6de4c88ced8c",
                name: "Toppings",
                selectionType: "multiple",
                isRequired: false,
                sortOrder: 2,
            },
            {
                id: "1930e57b-84a3-438d-a604-d36d3316789e",
                menuItemId: "048bd930-5aa5-4049-826f-6de4c88ced8c",
                name: "Cream Base",
                selectionType: "single",
                isRequired: true,
                sortOrder: 3,
            },
            {
                id: "03da6daa-ef4c-4d6a-8614-87ba0d2f6175",
                menuItemId: "1997b5d2-6563-43f5-a45d-d7fa9910adb4",
                name: "Cup Size",
                selectionType: "single",
                isRequired: true,
                sortOrder: 1,
            },
            {
                id: "10f7172a-071e-4e45-b4b9-e4afcd24e174",
                menuItemId: "1997b5d2-6563-43f5-a45d-d7fa9910adb4",
                name: "Sugar Level",
                selectionType: "single",
                isRequired: true,
                sortOrder: 2,
            },
            {
                id: "d2c85d46-b507-4f16-8384-223ba2f62e91",
                menuItemId: "1997b5d2-6563-43f5-a45d-d7fa9910adb4",
                name: "Milk Option",
                selectionType: "single",
                isRequired: false,
                sortOrder: 3,
            },
            {
                id: "61fd0336-00ef-4ca8-ac7d-1515a2561848",
                menuItemId: "27ec4974-adbc-4543-a174-d9787b3e6666",
                name: "Cup Size",
                selectionType: "single",
                isRequired: true,
                sortOrder: 1,
            },
            {
                id: "09029d8b-d566-4bca-979d-7414cdd89194",
                menuItemId: "27ec4974-adbc-4543-a174-d9787b3e6666",
                name: "Sugar Level",
                selectionType: "single",
                isRequired: true,
                sortOrder: 2,
            },
            {
                id: "f1ebbd2b-6d90-42a0-8051-f4697c44a18d",
                menuItemId: "27ec4974-adbc-4543-a174-d9787b3e6666",
                name: "Milk Option",
                selectionType: "single",
                isRequired: false,
                sortOrder: 3,
            },
            {
                id: "07f476eb-014e-4892-8d2b-8acbb5e5e1fe",
                menuItemId: "2ff30749-4498-4945-8af1-4e022335db36",
                name: "Cup Size",
                selectionType: "single",
                isRequired: true,
                sortOrder: 1,
            },
            {
                id: "ba5daedb-8a4d-4e70-b8d6-e6f2bdd526ad",
                menuItemId: "2ff30749-4498-4945-8af1-4e022335db36",
                name: "Sugar Level",
                selectionType: "single",
                isRequired: true,
                sortOrder: 2,
            },
            {
                id: "de04dd9b-a785-4570-bfb4-ea6b83437cad",
                menuItemId: "2ff30749-4498-4945-8af1-4e022335db36",
                name: "Milk Type",
                selectionType: "single",
                isRequired: true,
                sortOrder: 3,
            },
            {
                id: "071ea9e1-6077-494f-9626-5e94eb38deda",
                menuItemId: "f8d79186-76fe-431d-9224-4ff44ae95623",
                name: "Cup Size",
                selectionType: "single",
                isRequired: true,
                sortOrder: 1,
            },
            {
                id: "22817a4d-a43d-4bee-b449-b834da57b511",
                menuItemId: "f8d79186-76fe-431d-9224-4ff44ae95623",
                name: "Sugar Level",
                selectionType: "single",
                isRequired: true,
                sortOrder: 2,
            },
            {
                id: "ed26965f-d429-4cdb-a559-775d6a0defe1",
                menuItemId: "f8d79186-76fe-431d-9224-4ff44ae95623",
                name: "Milk Type",
                selectionType: "single",
                isRequired: true,
                sortOrder: 3,
            },
            {
                id: "23db2081-6e59-4f06-b8dd-4274e7ace923",
                menuItemId: "cd297893-a429-4f86-a240-b99e01ab0d50",
                name: "Warmed",
                selectionType: "single",
                isRequired: true,
                sortOrder: 1,
            },
            {
                id: "913fd563-3899-40fc-a978-f46df7b833da",
                menuItemId: "e20feb5b-5980-4e03-901a-c6c7a3fc4766",
                name: "Warmed",
                selectionType: "single",
                isRequired: true,
                sortOrder: 1,
            },
            {
                id: "f71b9378-6da1-414b-96af-606d3dcbb5a9",
                menuItemId: "8240a5b6-072c-4fb7-9345-8075489611cf",
                name: "Warmed",
                selectionType: "single",
                isRequired: true,
                sortOrder: 1,
            },
            {
                id: "c9ebb4c9-bd04-4f6a-a441-810b423ada0d",
                menuItemId: "58f0375c-3367-44d6-a3d2-905e174d7598",
                name: "Warmed",
                selectionType: "single",
                isRequired: true,
                sortOrder: 1,
            },
            {
                id: "511b414e-9e7d-403d-a460-27dbf689ebce",
                menuItemId: "14cbc963-c2f3-44f0-9c45-56b62ac5b97b",
                name: "Bread",
                selectionType: "single",
                isRequired: true,
                sortOrder: 1,
            },
            {
                id: "372e2e25-02e8-467e-900b-7abe9848f583",
                menuItemId: "3cad9c4a-de73-45a8-a669-c0a5ca7dd2a2",
                name: "Bread",
                selectionType: "single",
                isRequired: true,
                sortOrder: 1,
            },
        ])
        .onConflictDoNothing();

    console.log("  Modifier Options...");
    await db
        .insert(modifierOptionsTable)
        .values([
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
            {
                id: "59f2fc2c-da36-4138-a532-68ea34ba9e34",
                modifierGroupId: "128d1d51-f5d4-4132-8f54-3e2c823fc6b5",
                name: "Almond Milk",
                price: "0.50",
                sortOrder: 3,
            },
            {
                id: "1e47d41d-4e1f-4c29-9fc9-10b54a6201f3",
                modifierGroupId: "128d1d51-f5d4-4132-8f54-3e2c823fc6b5",
                name: "Soy Milk",
                price: "0.50",
                sortOrder: 4,
            },
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
            {
                id: "f074a226-f425-4b84-a061-6d5bddaf6673",
                modifierGroupId: "b7f08b19-3aab-4bf7-b61c-115ed485aecc",
                name: "Small",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "2fe4ec61-f51c-4347-ac05-1ae193c7a47b",
                modifierGroupId: "b7f08b19-3aab-4bf7-b61c-115ed485aecc",
                name: "Medium",
                price: "0.50",
                sortOrder: 2,
            },
            {
                id: "3cc6b14e-9dd5-4448-9bbb-66165cf85496",
                modifierGroupId: "b7f08b19-3aab-4bf7-b61c-115ed485aecc",
                name: "Large",
                price: "1.00",
                sortOrder: 3,
            },
            {
                id: "2f70ab9d-8f4a-4f88-a0c5-13bae7579aac",
                modifierGroupId: "9100b3b6-0691-4182-ab08-4eff151bb417",
                name: "0%",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "2c0bdda8-a53a-4614-a668-31deb3438c3f",
                modifierGroupId: "9100b3b6-0691-4182-ab08-4eff151bb417",
                name: "25%",
                price: "0",
                sortOrder: 2,
            },
            {
                id: "8c9394ed-243b-4ed2-983a-bdfa6780a20e",
                modifierGroupId: "9100b3b6-0691-4182-ab08-4eff151bb417",
                name: "50%",
                price: "0",
                sortOrder: 3,
            },
            {
                id: "bf0e5101-0a0e-4e3a-aecc-c6b6635abced",
                modifierGroupId: "9100b3b6-0691-4182-ab08-4eff151bb417",
                name: "75%",
                price: "0",
                sortOrder: 4,
            },
            {
                id: "d8f166fd-353a-407f-9753-ba80a88b7996",
                modifierGroupId: "9100b3b6-0691-4182-ab08-4eff151bb417",
                name: "100%",
                price: "0",
                sortOrder: 5,
            },
            {
                id: "4382443c-e336-44fb-82e0-9f84c747d3bf",
                modifierGroupId: "de2e1a51-1b6f-4c85-a178-bad0e67a4604",
                name: "No",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "424a2f9d-8393-43d5-a227-612312398fca",
                modifierGroupId: "de2e1a51-1b6f-4c85-a178-bad0e67a4604",
                name: "1 Extra",
                price: "1.00",
                sortOrder: 2,
            },
            {
                id: "70888213-6c6d-4d58-b34b-c7ff152d233d",
                modifierGroupId: "de2e1a51-1b6f-4c85-a178-bad0e67a4604",
                name: "2 Extra",
                price: "2.00",
                sortOrder: 3,
            },
            {
                id: "1c5d0786-acaf-42ba-916f-e0e8fc19dfa6",
                modifierGroupId: "f5c8f0ea-5905-4cfb-a4fa-7f8272a98f74",
                name: "Small",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "2d951989-0535-4877-9204-d4b7bb70dd1e",
                modifierGroupId: "f5c8f0ea-5905-4cfb-a4fa-7f8272a98f74",
                name: "Medium",
                price: "0.50",
                sortOrder: 2,
            },
            {
                id: "1cbf6eb9-e6a1-4c0b-8012-9f2391449ce4",
                modifierGroupId: "f5c8f0ea-5905-4cfb-a4fa-7f8272a98f74",
                name: "Large",
                price: "1.00",
                sortOrder: 3,
            },
            {
                id: "4a5e8421-a60f-4900-a359-1bd9163de3fb",
                modifierGroupId: "a93c1d1f-178d-49c2-a2eb-aa43e0a1ba6e",
                name: "0%",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "09d5ae3f-e08f-4a84-a131-fec4b50bf2a8",
                modifierGroupId: "a93c1d1f-178d-49c2-a2eb-aa43e0a1ba6e",
                name: "25%",
                price: "0",
                sortOrder: 2,
            },
            {
                id: "1f90f985-9c77-4331-9d8b-7ffc1c8d9bff",
                modifierGroupId: "a93c1d1f-178d-49c2-a2eb-aa43e0a1ba6e",
                name: "50%",
                price: "0",
                sortOrder: 3,
            },
            {
                id: "90e18680-f9c1-465e-98cc-c3fe439b489c",
                modifierGroupId: "a93c1d1f-178d-49c2-a2eb-aa43e0a1ba6e",
                name: "75%",
                price: "0",
                sortOrder: 4,
            },
            {
                id: "aa29b63d-e7be-4edb-8200-19549c8320ca",
                modifierGroupId: "a93c1d1f-178d-49c2-a2eb-aa43e0a1ba6e",
                name: "100%",
                price: "0",
                sortOrder: 5,
            },
            {
                id: "fb4ad6e4-857f-4615-b9a0-67e654c9d934",
                modifierGroupId: "a2b46de9-6eb8-4990-a412-12f52fa66e29",
                name: "No Milk",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "c684f4d4-b6f7-4f77-a87e-aef2896ceada",
                modifierGroupId: "a2b46de9-6eb8-4990-a412-12f52fa66e29",
                name: "Whole Milk",
                price: "0",
                sortOrder: 2,
            },
            {
                id: "df90ef89-b8df-475f-9d79-b5a70ad10ae3",
                modifierGroupId: "a2b46de9-6eb8-4990-a412-12f52fa66e29",
                name: "Oat Milk",
                price: "0.50",
                sortOrder: 3,
            },
            {
                id: "c77f953f-4a1b-4d37-a12a-f4d14bddc9a1",
                modifierGroupId: "a2b46de9-6eb8-4990-a412-12f52fa66e29",
                name: "Almond Milk",
                price: "0.50",
                sortOrder: 4,
            },
            {
                id: "6771e233-9a71-49c9-94cc-1585ad7abfdd",
                modifierGroupId: "a2b46de9-6eb8-4990-a412-12f52fa66e29",
                name: "Soy Milk",
                price: "0.50",
                sortOrder: 5,
            },
            {
                id: "e30a7fc9-e24e-40df-a2d6-a8a554d5ce96",
                modifierGroupId: "bd0ebe4c-5145-4053-ad14-c389ef96e78d",
                name: "No",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "70acc393-1ec4-400c-93b2-a40dd678186a",
                modifierGroupId: "bd0ebe4c-5145-4053-ad14-c389ef96e78d",
                name: "1 Extra",
                price: "1.00",
                sortOrder: 2,
            },
            {
                id: "87e19f73-cc10-4bcc-9e05-1b43382947ac",
                modifierGroupId: "bd0ebe4c-5145-4053-ad14-c389ef96e78d",
                name: "2 Extra",
                price: "2.00",
                sortOrder: 3,
            },
            {
                id: "de6767ca-9387-4701-af61-b3b2304cc693",
                modifierGroupId: "0fc57c7a-8194-4d4d-a92c-db071cf0614c",
                name: "Small",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "74d47b6f-52f8-4182-aabe-7e75dc9abe35",
                modifierGroupId: "0fc57c7a-8194-4d4d-a92c-db071cf0614c",
                name: "Medium",
                price: "0.50",
                sortOrder: 2,
            },
            {
                id: "c775a107-b8cd-4059-a712-63759553d647",
                modifierGroupId: "0fc57c7a-8194-4d4d-a92c-db071cf0614c",
                name: "Large",
                price: "1.00",
                sortOrder: 3,
            },
            {
                id: "a23d2ebb-a9a5-4039-8f4e-a8b50bffdd37",
                modifierGroupId: "05e07662-afb0-4f53-bb04-96e5d534ce75",
                name: "0%",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "8f1a83c6-0155-4c0b-9f1e-83b441918dc4",
                modifierGroupId: "05e07662-afb0-4f53-bb04-96e5d534ce75",
                name: "25%",
                price: "0",
                sortOrder: 2,
            },
            {
                id: "1974d714-beb9-4bcf-943f-3f544a6411b7",
                modifierGroupId: "05e07662-afb0-4f53-bb04-96e5d534ce75",
                name: "50%",
                price: "0",
                sortOrder: 3,
            },
            {
                id: "2bc0bd9d-51cc-4796-a283-26214ca2b8b3",
                modifierGroupId: "05e07662-afb0-4f53-bb04-96e5d534ce75",
                name: "75%",
                price: "0",
                sortOrder: 4,
            },
            {
                id: "c38bd709-651d-4dcf-98c7-3478bd7c7001",
                modifierGroupId: "05e07662-afb0-4f53-bb04-96e5d534ce75",
                name: "100%",
                price: "0",
                sortOrder: 5,
            },
            {
                id: "ba4b3521-3790-46ea-8f70-0ecc77f5e471",
                modifierGroupId: "49013759-2a8a-44d7-bbf5-ffdcc08121e9",
                name: "Whole Milk",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "ed8c343d-8fcf-4166-8e94-fbac2bc44533",
                modifierGroupId: "49013759-2a8a-44d7-bbf5-ffdcc08121e9",
                name: "Oat Milk",
                price: "0.50",
                sortOrder: 2,
            },
            {
                id: "c4c734d0-3c52-42cb-b073-ff3ef397a790",
                modifierGroupId: "49013759-2a8a-44d7-bbf5-ffdcc08121e9",
                name: "Almond Milk",
                price: "0.50",
                sortOrder: 3,
            },
            {
                id: "9816d1ab-e95b-4b70-9f22-97e969bab14e",
                modifierGroupId: "49013759-2a8a-44d7-bbf5-ffdcc08121e9",
                name: "Soy Milk",
                price: "0.50",
                sortOrder: 4,
            },
            {
                id: "d18cc6d3-39f1-472d-aca5-b37c2569054a",
                modifierGroupId: "d292ea49-33f7-4f7b-bcd8-cb991b711dda",
                name: "No",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "297c26c2-71d8-4adc-b939-1d6d69239a5c",
                modifierGroupId: "d292ea49-33f7-4f7b-bcd8-cb991b711dda",
                name: "1 Extra",
                price: "1.00",
                sortOrder: 2,
            },
            {
                id: "babe07ae-284c-48bb-bda0-c40313e0fcf6",
                modifierGroupId: "d292ea49-33f7-4f7b-bcd8-cb991b711dda",
                name: "2 Extra",
                price: "2.00",
                sortOrder: 3,
            },
            {
                id: "f5418640-eaaf-4f9e-94db-01b9ceef8ddd",
                modifierGroupId: "60befca9-289e-4797-8d55-f864047f2733",
                name: "Small",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "07139703-7816-4ac6-bf2d-0bf9289fff30",
                modifierGroupId: "60befca9-289e-4797-8d55-f864047f2733",
                name: "Medium",
                price: "0.50",
                sortOrder: 2,
            },
            {
                id: "0e540db5-a81b-4878-b5b4-e917f8d86a10",
                modifierGroupId: "60befca9-289e-4797-8d55-f864047f2733",
                name: "Large",
                price: "1.00",
                sortOrder: 3,
            },
            {
                id: "d5d750c0-d084-410e-b189-fa772274806c",
                modifierGroupId: "16b4da2b-018e-4a77-91ee-bff1a8936ec7",
                name: "0%",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "b15ea72d-33d6-4233-9336-4713050e7d7a",
                modifierGroupId: "16b4da2b-018e-4a77-91ee-bff1a8936ec7",
                name: "25%",
                price: "0",
                sortOrder: 2,
            },
            {
                id: "11046aee-3410-4c75-bd8c-6d877e3fefc9",
                modifierGroupId: "16b4da2b-018e-4a77-91ee-bff1a8936ec7",
                name: "50%",
                price: "0",
                sortOrder: 3,
            },
            {
                id: "8e009b4d-bd0b-43c8-a220-be50bada15c1",
                modifierGroupId: "16b4da2b-018e-4a77-91ee-bff1a8936ec7",
                name: "75%",
                price: "0",
                sortOrder: 4,
            },
            {
                id: "c70bd050-a75b-40b9-b63a-ffff690b52fb",
                modifierGroupId: "16b4da2b-018e-4a77-91ee-bff1a8936ec7",
                name: "100%",
                price: "0",
                sortOrder: 5,
            },
            {
                id: "5d3c6981-4368-499a-be81-751e17477a9c",
                modifierGroupId: "aac10392-60d0-4048-817c-1e14620ac161",
                name: "Whole Milk",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "c300afe9-bc5b-4ce5-ab7c-412c3243e12f",
                modifierGroupId: "aac10392-60d0-4048-817c-1e14620ac161",
                name: "Oat Milk",
                price: "0.50",
                sortOrder: 2,
            },
            {
                id: "29463634-034b-4a37-8854-3634335c6115",
                modifierGroupId: "aac10392-60d0-4048-817c-1e14620ac161",
                name: "Almond Milk",
                price: "0.50",
                sortOrder: 3,
            },
            {
                id: "8264d378-53c5-47a0-9dfc-77cbec1e5bd6",
                modifierGroupId: "aac10392-60d0-4048-817c-1e14620ac161",
                name: "Soy Milk",
                price: "0.50",
                sortOrder: 4,
            },
            {
                id: "8a33acda-bb52-40df-b4fc-9fe0a0a4f296",
                modifierGroupId: "e00819cf-1488-4978-9bca-0c1115f2d6ae",
                name: "Small",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "7ed8c7ab-697e-45fa-a09a-3543203cbb76",
                modifierGroupId: "e00819cf-1488-4978-9bca-0c1115f2d6ae",
                name: "Medium",
                price: "0.50",
                sortOrder: 2,
            },
            {
                id: "f944ff16-002d-40bf-9457-ffc07e7d198f",
                modifierGroupId: "e00819cf-1488-4978-9bca-0c1115f2d6ae",
                name: "Large",
                price: "1.00",
                sortOrder: 3,
            },
            {
                id: "c6f36176-db1a-4bd6-83e6-fa104ef73ad6",
                modifierGroupId: "75d2fac7-2464-4dcf-aad4-262cd78ad4e3",
                name: "0%",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "d0690569-1668-4406-a7c8-627569d3e2c3",
                modifierGroupId: "75d2fac7-2464-4dcf-aad4-262cd78ad4e3",
                name: "25%",
                price: "0",
                sortOrder: 2,
            },
            {
                id: "4c063b28-a55f-4aca-9e18-73daa96b07a8",
                modifierGroupId: "75d2fac7-2464-4dcf-aad4-262cd78ad4e3",
                name: "50%",
                price: "0",
                sortOrder: 3,
            },
            {
                id: "4b36ec88-f304-48ab-b5e8-5bb63b7970a0",
                modifierGroupId: "75d2fac7-2464-4dcf-aad4-262cd78ad4e3",
                name: "75%",
                price: "0",
                sortOrder: 4,
            },
            {
                id: "86f2ecef-e20c-4f0b-81e5-93ba568d8025",
                modifierGroupId: "75d2fac7-2464-4dcf-aad4-262cd78ad4e3",
                name: "100%",
                price: "0",
                sortOrder: 5,
            },
            {
                id: "67dbe02a-c0d9-449f-ba73-70cdeeeb0a4c",
                modifierGroupId: "ef07baf3-7e8d-49e1-b574-5e5bb1141979",
                name: "Whole Milk",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "bd42498f-054c-4ae2-aaa0-b33a3bdbd46b",
                modifierGroupId: "ef07baf3-7e8d-49e1-b574-5e5bb1141979",
                name: "Oat Milk",
                price: "0.50",
                sortOrder: 2,
            },
            {
                id: "a4ceebe4-32d0-4e0e-9013-d0f8bbe98374",
                modifierGroupId: "ef07baf3-7e8d-49e1-b574-5e5bb1141979",
                name: "Almond Milk",
                price: "0.50",
                sortOrder: 3,
            },
            {
                id: "ac58fecb-4000-4abc-9bce-2dfbaaaf7a34",
                modifierGroupId: "ef07baf3-7e8d-49e1-b574-5e5bb1141979",
                name: "Soy Milk",
                price: "0.50",
                sortOrder: 4,
            },
            {
                id: "a4159f8a-cac8-4b89-b865-7d7e6173075b",
                modifierGroupId: "0cf2dbe8-a25f-4132-b78b-893c5945542b",
                name: "No",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "95bb10ab-96e2-4615-86e9-8a3a810300a2",
                modifierGroupId: "0cf2dbe8-a25f-4132-b78b-893c5945542b",
                name: "1 Extra",
                price: "1.00",
                sortOrder: 2,
            },
            {
                id: "80054ef8-e727-4bac-8330-1f7b563c761f",
                modifierGroupId: "0cf2dbe8-a25f-4132-b78b-893c5945542b",
                name: "2 Extra",
                price: "2.00",
                sortOrder: 3,
            },
            {
                id: "3f37ae28-4e37-4057-bfd5-f0748bb61ec2",
                modifierGroupId: "ecf2a330-36c1-4a29-9583-903fe48e5388",
                name: "Medium",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "10fb5717-0470-4ce0-b15c-14f1517917f2",
                modifierGroupId: "ecf2a330-36c1-4a29-9583-903fe48e5388",
                name: "Large",
                price: "1.00",
                sortOrder: 2,
            },
            {
                id: "901448fa-11e9-41f7-bd32-11934a8b62d5",
                modifierGroupId: "c87fa5fd-0551-4fe6-b865-6894bbe2ed86",
                name: "0%",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "f028fe02-8db5-4e71-a574-33024a44395b",
                modifierGroupId: "c87fa5fd-0551-4fe6-b865-6894bbe2ed86",
                name: "25%",
                price: "0",
                sortOrder: 2,
            },
            {
                id: "9fb5001a-d482-4184-979d-79c67175bfc8",
                modifierGroupId: "c87fa5fd-0551-4fe6-b865-6894bbe2ed86",
                name: "50%",
                price: "0",
                sortOrder: 3,
            },
            {
                id: "e5022435-9bf8-4b58-938c-2057ee888dd2",
                modifierGroupId: "c87fa5fd-0551-4fe6-b865-6894bbe2ed86",
                name: "75%",
                price: "0",
                sortOrder: 4,
            },
            {
                id: "d65c327f-d589-4e0b-b0bc-9bc050e71659",
                modifierGroupId: "c87fa5fd-0551-4fe6-b865-6894bbe2ed86",
                name: "100%",
                price: "0",
                sortOrder: 5,
            },
            {
                id: "1dac21b2-5b8b-47c9-b440-1217bcf75a5c",
                modifierGroupId: "4b3667b8-43fc-4f89-8cae-352511e2accb",
                name: "No Milk",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "9b714eb0-1933-4074-8f1a-aa2e7eb7d07d",
                modifierGroupId: "4b3667b8-43fc-4f89-8cae-352511e2accb",
                name: "Whole Milk",
                price: "0",
                sortOrder: 2,
            },
            {
                id: "61c8a059-21bd-46d1-8692-b13ea1346b40",
                modifierGroupId: "4b3667b8-43fc-4f89-8cae-352511e2accb",
                name: "Oat Milk",
                price: "0.50",
                sortOrder: 3,
            },
            {
                id: "c9285b30-fad1-4369-99b8-8c9fc75edbb7",
                modifierGroupId: "4b3667b8-43fc-4f89-8cae-352511e2accb",
                name: "Almond Milk",
                price: "0.50",
                sortOrder: 4,
            },
            {
                id: "a33aeb6d-9ef1-4c82-a529-08160abc48b3",
                modifierGroupId: "4b3667b8-43fc-4f89-8cae-352511e2accb",
                name: "Soy Milk",
                price: "0.50",
                sortOrder: 5,
            },
            {
                id: "030077bc-eb59-4d8d-a7de-dd6e7116365a",
                modifierGroupId: "405ed4ad-6bf2-4aff-a9bd-cf89f80b1fa0",
                name: "Regular Ice",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "9d4b09c6-2f13-4181-9479-76d057f228cc",
                modifierGroupId: "405ed4ad-6bf2-4aff-a9bd-cf89f80b1fa0",
                name: "Light Ice",
                price: "0",
                sortOrder: 2,
            },
            {
                id: "061cfb6a-60f6-41ac-ab0e-aaaff25b1ca5",
                modifierGroupId: "405ed4ad-6bf2-4aff-a9bd-cf89f80b1fa0",
                name: "Extra Ice",
                price: "0",
                sortOrder: 3,
            },
            {
                id: "4453109d-7ce1-49ac-b907-84a417a3de0a",
                modifierGroupId: "59d33b4b-f23e-4bd1-9a09-45f4f0df45d1",
                name: "Medium",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "e4ead042-c561-4d0e-862b-77d52ff83cf4",
                modifierGroupId: "59d33b4b-f23e-4bd1-9a09-45f4f0df45d1",
                name: "Large",
                price: "1.00",
                sortOrder: 2,
            },
            {
                id: "89332f48-4ba3-474f-8fe0-d6fc80d2ac71",
                modifierGroupId: "60deb156-275f-4cf6-9f19-33b4a8319a05",
                name: "0%",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "7f499c2d-dc91-40a7-8bca-34d0880690bd",
                modifierGroupId: "60deb156-275f-4cf6-9f19-33b4a8319a05",
                name: "25%",
                price: "0",
                sortOrder: 2,
            },
            {
                id: "9958983e-0a5b-458b-9f86-5474257f558b",
                modifierGroupId: "60deb156-275f-4cf6-9f19-33b4a8319a05",
                name: "50%",
                price: "0",
                sortOrder: 3,
            },
            {
                id: "0ee8dae6-eb62-4b21-8991-537eebe5f62b",
                modifierGroupId: "60deb156-275f-4cf6-9f19-33b4a8319a05",
                name: "75%",
                price: "0",
                sortOrder: 4,
            },
            {
                id: "f454f313-c36e-47f2-afc8-4b6d65928007",
                modifierGroupId: "60deb156-275f-4cf6-9f19-33b4a8319a05",
                name: "100%",
                price: "0",
                sortOrder: 5,
            },
            {
                id: "02134cfb-36a0-4249-bcf5-e54e14fd706f",
                modifierGroupId: "0ed04a37-3f76-46fb-b062-1c7257ca1f7d",
                name: "No Milk",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "c4685578-1537-43a3-aa74-3571461f18f6",
                modifierGroupId: "0ed04a37-3f76-46fb-b062-1c7257ca1f7d",
                name: "Whole Milk",
                price: "0",
                sortOrder: 2,
            },
            {
                id: "936275a5-67a6-4a5b-80c9-65e763224162",
                modifierGroupId: "0ed04a37-3f76-46fb-b062-1c7257ca1f7d",
                name: "Oat Milk",
                price: "0.50",
                sortOrder: 3,
            },
            {
                id: "b8f6b286-5779-44b8-bf13-45a00b7566f4",
                modifierGroupId: "0ed04a37-3f76-46fb-b062-1c7257ca1f7d",
                name: "Almond Milk",
                price: "0.50",
                sortOrder: 4,
            },
            {
                id: "734fc5f1-bb0b-4ac7-bb69-bd33552399da",
                modifierGroupId: "0ed04a37-3f76-46fb-b062-1c7257ca1f7d",
                name: "Soy Milk",
                price: "0.50",
                sortOrder: 5,
            },
            {
                id: "4d6a5692-acd9-4e3c-b258-572b132f8eba",
                modifierGroupId: "83f0900f-55dd-43d4-b31a-8fd9ae6239a6",
                name: "Regular Ice",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "3931a01d-ca4c-44ad-b9ee-fbe4d9f434db",
                modifierGroupId: "83f0900f-55dd-43d4-b31a-8fd9ae6239a6",
                name: "Light Ice",
                price: "0",
                sortOrder: 2,
            },
            {
                id: "e0e4e5a9-8ef6-4250-9ba7-b34b1a370359",
                modifierGroupId: "83f0900f-55dd-43d4-b31a-8fd9ae6239a6",
                name: "Extra Ice",
                price: "0",
                sortOrder: 3,
            },
            {
                id: "e963ff2c-e16d-4b66-a4d9-113379a25bd2",
                modifierGroupId: "8a558da3-82c2-487a-9dd5-f037eaea1ad2",
                name: "Medium",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "bbc008f9-0c45-4e68-863d-14cf13a65f61",
                modifierGroupId: "8a558da3-82c2-487a-9dd5-f037eaea1ad2",
                name: "Large",
                price: "1.00",
                sortOrder: 2,
            },
            {
                id: "7cb58bbe-25dd-43d7-954f-f82d1c3e0e27",
                modifierGroupId: "29850737-b313-45dd-868f-b025d173c458",
                name: "0%",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "670ead10-ce09-48cb-89e3-337798b1c06f",
                modifierGroupId: "29850737-b313-45dd-868f-b025d173c458",
                name: "25%",
                price: "0",
                sortOrder: 2,
            },
            {
                id: "6fb43e41-8b4b-4fc1-b155-652296340c93",
                modifierGroupId: "29850737-b313-45dd-868f-b025d173c458",
                name: "50%",
                price: "0",
                sortOrder: 3,
            },
            {
                id: "f9118cce-b169-4c65-b574-a471b6408fe5",
                modifierGroupId: "29850737-b313-45dd-868f-b025d173c458",
                name: "75%",
                price: "0",
                sortOrder: 4,
            },
            {
                id: "75a56afa-c92b-41aa-8ab0-1a465cde8ce7",
                modifierGroupId: "29850737-b313-45dd-868f-b025d173c458",
                name: "100%",
                price: "0",
                sortOrder: 5,
            },
            {
                id: "48020399-aca2-447a-b676-b88e6b64ba66",
                modifierGroupId: "4aad97c0-7fbb-41bd-b2de-48e7b7aedd26",
                name: "Regular Ice",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "493cf157-6eb1-4d8c-b89b-531d9b35a8a3",
                modifierGroupId: "4aad97c0-7fbb-41bd-b2de-48e7b7aedd26",
                name: "Light Ice",
                price: "0",
                sortOrder: 2,
            },
            {
                id: "4c2cabc8-0c15-47a5-8db0-571ac7f794c2",
                modifierGroupId: "4aad97c0-7fbb-41bd-b2de-48e7b7aedd26",
                name: "Extra Ice",
                price: "0",
                sortOrder: 3,
            },
            {
                id: "71ae34c1-9317-4346-b7ea-045e05251801",
                modifierGroupId: "aea2a2b9-3183-4157-91f9-04edabcc0f5a",
                name: "Medium",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "6c09573c-810f-49c4-a5c3-d282a28a2337",
                modifierGroupId: "aea2a2b9-3183-4157-91f9-04edabcc0f5a",
                name: "Large",
                price: "1.00",
                sortOrder: 2,
            },
            {
                id: "fcbd47c5-5761-4e6a-8ec9-dbd1d210886e",
                modifierGroupId: "da087462-0709-43be-a691-8cb243a87bd5",
                name: "Whipped Cream",
                price: "0.50",
                sortOrder: 1,
            },
            {
                id: "b4663fd0-f60b-4bea-8c4b-cd61b011794f",
                modifierGroupId: "da087462-0709-43be-a691-8cb243a87bd5",
                name: "Caramel Drizzle",
                price: "0.75",
                sortOrder: 2,
            },
            {
                id: "686f6fed-71a9-44c3-a149-22e1d6a083c6",
                modifierGroupId: "da087462-0709-43be-a691-8cb243a87bd5",
                name: "Chocolate Sauce",
                price: "0.75",
                sortOrder: 3,
            },
            {
                id: "7d7cf81b-51ba-4d64-885a-3a3f7c57f88f",
                modifierGroupId: "da087462-0709-43be-a691-8cb243a87bd5",
                name: "Cookie Crumble",
                price: "0.50",
                sortOrder: 4,
            },
            {
                id: "7bf3a333-11d7-416b-8eca-468a5b4478f0",
                modifierGroupId: "1930e57b-84a3-438d-a604-d36d3316789e",
                name: "Dairy",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "ac30ea55-c8a2-4d78-b1e9-0becbc79fa02",
                modifierGroupId: "1930e57b-84a3-438d-a604-d36d3316789e",
                name: "Non-Dairy",
                price: "0",
                sortOrder: 2,
            },
            {
                id: "57df93d0-5702-482c-8c52-1eed3c774110",
                modifierGroupId: "03da6daa-ef4c-4d6a-8614-87ba0d2f6175",
                name: "Small",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "c6637989-4e4f-48fa-a464-77af64ccb8cc",
                modifierGroupId: "03da6daa-ef4c-4d6a-8614-87ba0d2f6175",
                name: "Medium",
                price: "0.50",
                sortOrder: 2,
            },
            {
                id: "91b46408-22eb-4b17-836b-cf882b700000",
                modifierGroupId: "03da6daa-ef4c-4d6a-8614-87ba0d2f6175",
                name: "Large",
                price: "1.00",
                sortOrder: 3,
            },
            {
                id: "659a614d-0f4f-4fd0-8d4b-dc0a64be2d15",
                modifierGroupId: "10f7172a-071e-4e45-b4b9-e4afcd24e174",
                name: "0%",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "414a93b4-a52d-429e-a000-43af047a2a47",
                modifierGroupId: "10f7172a-071e-4e45-b4b9-e4afcd24e174",
                name: "25%",
                price: "0",
                sortOrder: 2,
            },
            {
                id: "806430d7-463c-4abf-94db-463e5d40f118",
                modifierGroupId: "10f7172a-071e-4e45-b4b9-e4afcd24e174",
                name: "50%",
                price: "0",
                sortOrder: 3,
            },
            {
                id: "46e13bde-8b01-4c3b-9540-6131080ed6c2",
                modifierGroupId: "10f7172a-071e-4e45-b4b9-e4afcd24e174",
                name: "75%",
                price: "0",
                sortOrder: 4,
            },
            {
                id: "7894920a-b4bf-44ff-b573-ae545888c96f",
                modifierGroupId: "10f7172a-071e-4e45-b4b9-e4afcd24e174",
                name: "100%",
                price: "0",
                sortOrder: 5,
            },
            {
                id: "8a51c5ad-b028-49d6-85a8-7274c0c3bac0",
                modifierGroupId: "d2c85d46-b507-4f16-8384-223ba2f62e91",
                name: "No Milk",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "6d12d196-2989-4cdb-abcf-51ddbf720692",
                modifierGroupId: "d2c85d46-b507-4f16-8384-223ba2f62e91",
                name: "Whole Milk",
                price: "0",
                sortOrder: 2,
            },
            {
                id: "b82a0cc0-1796-4d87-b323-fe168aaa7eed",
                modifierGroupId: "d2c85d46-b507-4f16-8384-223ba2f62e91",
                name: "Oat Milk",
                price: "0.50",
                sortOrder: 3,
            },
            {
                id: "d1fd9f2d-f912-4943-917c-601e6a681b18",
                modifierGroupId: "d2c85d46-b507-4f16-8384-223ba2f62e91",
                name: "Almond Milk",
                price: "0.50",
                sortOrder: 4,
            },
            {
                id: "ad092e0e-0a92-439b-ad5c-1dcaac12a836",
                modifierGroupId: "d2c85d46-b507-4f16-8384-223ba2f62e91",
                name: "Soy Milk",
                price: "0.50",
                sortOrder: 5,
            },
            {
                id: "38715507-0310-4b31-b6d1-16da2deaff25",
                modifierGroupId: "61fd0336-00ef-4ca8-ac7d-1515a2561848",
                name: "Small",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "fe516d1e-2e60-4ffa-8fb8-2d924994cf8d",
                modifierGroupId: "61fd0336-00ef-4ca8-ac7d-1515a2561848",
                name: "Medium",
                price: "0.50",
                sortOrder: 2,
            },
            {
                id: "8781fa08-6709-46ad-ac63-88c98f69160d",
                modifierGroupId: "61fd0336-00ef-4ca8-ac7d-1515a2561848",
                name: "Large",
                price: "1.00",
                sortOrder: 3,
            },
            {
                id: "ac2a5c62-76a6-4412-b37b-b43500b28156",
                modifierGroupId: "09029d8b-d566-4bca-979d-7414cdd89194",
                name: "0%",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "4b93436d-31b7-4c02-a9cf-325ee3e1f729",
                modifierGroupId: "09029d8b-d566-4bca-979d-7414cdd89194",
                name: "25%",
                price: "0",
                sortOrder: 2,
            },
            {
                id: "72b547d7-a9ae-4157-9b3d-79ca5f5cc022",
                modifierGroupId: "09029d8b-d566-4bca-979d-7414cdd89194",
                name: "50%",
                price: "0",
                sortOrder: 3,
            },
            {
                id: "63d74e9a-9a56-47d0-9066-9687bb14dca1",
                modifierGroupId: "09029d8b-d566-4bca-979d-7414cdd89194",
                name: "75%",
                price: "0",
                sortOrder: 4,
            },
            {
                id: "5370adbc-d398-4626-bfbf-f00fd40c6bde",
                modifierGroupId: "09029d8b-d566-4bca-979d-7414cdd89194",
                name: "100%",
                price: "0",
                sortOrder: 5,
            },
            {
                id: "c02c97d4-d130-40ef-99f3-407e1339c51b",
                modifierGroupId: "f1ebbd2b-6d90-42a0-8051-f4697c44a18d",
                name: "No Milk",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "e5ebe8f1-325d-4b47-ab3c-1729b3344aa5",
                modifierGroupId: "f1ebbd2b-6d90-42a0-8051-f4697c44a18d",
                name: "Whole Milk",
                price: "0",
                sortOrder: 2,
            },
            {
                id: "fce4d7bd-2bb3-4059-8dcf-3c525e95c7b7",
                modifierGroupId: "f1ebbd2b-6d90-42a0-8051-f4697c44a18d",
                name: "Oat Milk",
                price: "0.50",
                sortOrder: 3,
            },
            {
                id: "8a6dc0d7-fdd4-4a4f-b12e-1d16064c155d",
                modifierGroupId: "f1ebbd2b-6d90-42a0-8051-f4697c44a18d",
                name: "Almond Milk",
                price: "0.50",
                sortOrder: 4,
            },
            {
                id: "69dc58c2-52e7-4179-9055-126a2499c96d",
                modifierGroupId: "f1ebbd2b-6d90-42a0-8051-f4697c44a18d",
                name: "Soy Milk",
                price: "0.50",
                sortOrder: 5,
            },
            {
                id: "77bb4e0f-1e09-4408-8621-eb9ad34d5d81",
                modifierGroupId: "07f476eb-014e-4892-8d2b-8acbb5e5e1fe",
                name: "Small",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "277c1946-9bde-4e75-b71c-2417cb6cd512",
                modifierGroupId: "07f476eb-014e-4892-8d2b-8acbb5e5e1fe",
                name: "Medium",
                price: "0.50",
                sortOrder: 2,
            },
            {
                id: "ab289954-e053-47cf-b418-84fab3e388c4",
                modifierGroupId: "07f476eb-014e-4892-8d2b-8acbb5e5e1fe",
                name: "Large",
                price: "1.00",
                sortOrder: 3,
            },
            {
                id: "ac151913-6dc3-4d89-8d60-23590ebb031b",
                modifierGroupId: "ba5daedb-8a4d-4e70-b8d6-e6f2bdd526ad",
                name: "0%",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "4875ea5b-71d6-46a0-ae73-ce3d9df52131",
                modifierGroupId: "ba5daedb-8a4d-4e70-b8d6-e6f2bdd526ad",
                name: "25%",
                price: "0",
                sortOrder: 2,
            },
            {
                id: "d31786d8-0ba2-4bc4-9709-abd018a07e61",
                modifierGroupId: "ba5daedb-8a4d-4e70-b8d6-e6f2bdd526ad",
                name: "50%",
                price: "0",
                sortOrder: 3,
            },
            {
                id: "0fb27a8d-9e8f-4bc7-b6fc-23fcf434dda0",
                modifierGroupId: "ba5daedb-8a4d-4e70-b8d6-e6f2bdd526ad",
                name: "75%",
                price: "0",
                sortOrder: 4,
            },
            {
                id: "f9563442-d16f-456c-841c-623a23713ec5",
                modifierGroupId: "ba5daedb-8a4d-4e70-b8d6-e6f2bdd526ad",
                name: "100%",
                price: "0",
                sortOrder: 5,
            },
            {
                id: "f65f4736-9d92-4768-b1ca-22750c2d6ead",
                modifierGroupId: "de04dd9b-a785-4570-bfb4-ea6b83437cad",
                name: "Whole Milk",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "943ba5f5-c5de-448a-82b9-75f3eb94ae96",
                modifierGroupId: "de04dd9b-a785-4570-bfb4-ea6b83437cad",
                name: "Oat Milk",
                price: "0.50",
                sortOrder: 2,
            },
            {
                id: "db87dfc4-c1a3-4e47-ac1e-cc574f426de2",
                modifierGroupId: "de04dd9b-a785-4570-bfb4-ea6b83437cad",
                name: "Almond Milk",
                price: "0.50",
                sortOrder: 3,
            },
            {
                id: "65ce6173-17fb-41f3-8cad-aebf57c97ea3",
                modifierGroupId: "de04dd9b-a785-4570-bfb4-ea6b83437cad",
                name: "Soy Milk",
                price: "0.50",
                sortOrder: 4,
            },
            {
                id: "e59e4359-ee47-4944-a503-a63b50a33b43",
                modifierGroupId: "071ea9e1-6077-494f-9626-5e94eb38deda",
                name: "Small",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "702dd08c-0c4d-4333-85e3-10a48f420996",
                modifierGroupId: "071ea9e1-6077-494f-9626-5e94eb38deda",
                name: "Medium",
                price: "0.50",
                sortOrder: 2,
            },
            {
                id: "17bddc5a-fd25-42f8-af62-0dcd771e7dab",
                modifierGroupId: "071ea9e1-6077-494f-9626-5e94eb38deda",
                name: "Large",
                price: "1.00",
                sortOrder: 3,
            },
            {
                id: "1c7b70ae-85af-49ca-be82-7e57b2689216",
                modifierGroupId: "22817a4d-a43d-4bee-b449-b834da57b511",
                name: "0%",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "2d657489-1612-41c2-8c6c-be2b2570eaec",
                modifierGroupId: "22817a4d-a43d-4bee-b449-b834da57b511",
                name: "25%",
                price: "0",
                sortOrder: 2,
            },
            {
                id: "bbe40976-8ac7-4d74-b5d9-472424f114ce",
                modifierGroupId: "22817a4d-a43d-4bee-b449-b834da57b511",
                name: "50%",
                price: "0",
                sortOrder: 3,
            },
            {
                id: "052c40f8-d378-496b-b15b-05d95c68984e",
                modifierGroupId: "22817a4d-a43d-4bee-b449-b834da57b511",
                name: "75%",
                price: "0",
                sortOrder: 4,
            },
            {
                id: "f46bf951-63e2-4942-990e-18b2a89a368f",
                modifierGroupId: "22817a4d-a43d-4bee-b449-b834da57b511",
                name: "100%",
                price: "0",
                sortOrder: 5,
            },
            {
                id: "5a3bf748-81a6-4ca1-86e5-01155eb85884",
                modifierGroupId: "ed26965f-d429-4cdb-a559-775d6a0defe1",
                name: "Whole Milk",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "27e0be72-cd95-4fc1-a67f-395b593f8c86",
                modifierGroupId: "ed26965f-d429-4cdb-a559-775d6a0defe1",
                name: "Oat Milk",
                price: "0.50",
                sortOrder: 2,
            },
            {
                id: "5c4e43fa-ae94-4979-a963-725884414d5f",
                modifierGroupId: "ed26965f-d429-4cdb-a559-775d6a0defe1",
                name: "Almond Milk",
                price: "0.50",
                sortOrder: 3,
            },
            {
                id: "5bfc6c28-a8bd-4632-abaa-48a058a085c1",
                modifierGroupId: "ed26965f-d429-4cdb-a559-775d6a0defe1",
                name: "Soy Milk",
                price: "0.50",
                sortOrder: 4,
            },
            {
                id: "f12d9f0e-3029-4973-9ab4-9568a71f0bca",
                modifierGroupId: "23db2081-6e59-4f06-b8dd-4274e7ace923",
                name: "No",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "cba0f386-fd5e-4cdd-b0de-cead30bb02cd",
                modifierGroupId: "23db2081-6e59-4f06-b8dd-4274e7ace923",
                name: "Yes",
                price: "0",
                sortOrder: 2,
            },
            {
                id: "362428c3-5e8b-4a5d-adcf-1d16591b5d7d",
                modifierGroupId: "913fd563-3899-40fc-a978-f46df7b833da",
                name: "No",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "9c45891d-c3d0-430f-96f2-c7c817670f5e",
                modifierGroupId: "913fd563-3899-40fc-a978-f46df7b833da",
                name: "Yes",
                price: "0",
                sortOrder: 2,
            },
            {
                id: "1aec0482-801e-4f56-99de-3959a3ff49ac",
                modifierGroupId: "f71b9378-6da1-414b-96af-606d3dcbb5a9",
                name: "No",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "77f15a8a-b491-4b49-a9cb-6f7b11573f23",
                modifierGroupId: "f71b9378-6da1-414b-96af-606d3dcbb5a9",
                name: "Yes",
                price: "0",
                sortOrder: 2,
            },
            {
                id: "1c45af2b-aa35-4b1f-a703-45314b699f61",
                modifierGroupId: "c9ebb4c9-bd04-4f6a-a441-810b423ada0d",
                name: "No",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "6a251fc9-6b62-4667-8f18-f5a3c76ef230",
                modifierGroupId: "c9ebb4c9-bd04-4f6a-a441-810b423ada0d",
                name: "Yes",
                price: "0",
                sortOrder: 2,
            },
            {
                id: "0c1a8cb1-ad51-4767-a245-a2c75e5be617",
                modifierGroupId: "511b414e-9e7d-403d-a460-27dbf689ebce",
                name: "Regular",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "8b074fc3-d21f-4105-9d30-b878cfdf9b54",
                modifierGroupId: "511b414e-9e7d-403d-a460-27dbf689ebce",
                name: "Toasted",
                price: "0",
                sortOrder: 2,
            },
            {
                id: "4a472d89-3a78-4e7c-bd19-6927ee455f07",
                modifierGroupId: "511b414e-9e7d-403d-a460-27dbf689ebce",
                name: "Pressed",
                price: "0",
                sortOrder: 3,
            },
            {
                id: "06b594ad-7ff0-440c-bba2-50fdee0ffdaf",
                modifierGroupId: "372e2e25-02e8-467e-900b-7abe9848f583",
                name: "Regular",
                price: "0",
                sortOrder: 1,
            },
            {
                id: "1532cd27-351b-4fdd-bcba-54c264331876",
                modifierGroupId: "372e2e25-02e8-467e-900b-7abe9848f583",
                name: "Toasted",
                price: "0",
                sortOrder: 2,
            },
            {
                id: "f775ce64-f3eb-41c8-8482-3df40bb78556",
                modifierGroupId: "372e2e25-02e8-467e-900b-7abe9848f583",
                name: "Pressed",
                price: "0",
                sortOrder: 3,
            },
        ])
        .onConflictDoNothing();

    console.log("  Modifier Group defaults...");
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "31fd6ad0-6301-465d-95d4-32accff8278c",
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
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "a7d3f3bd-d8cb-450f-86d4-c1115add5940",
        })
        .where(
            eq(modifierGroupsTable.id, "d369535d-9be4-43af-aa94-0a543943f81f"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "f074a226-f425-4b84-a061-6d5bddaf6673",
        })
        .where(
            eq(modifierGroupsTable.id, "b7f08b19-3aab-4bf7-b61c-115ed485aecc"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "2f70ab9d-8f4a-4f88-a0c5-13bae7579aac",
        })
        .where(
            eq(modifierGroupsTable.id, "9100b3b6-0691-4182-ab08-4eff151bb417"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "4382443c-e336-44fb-82e0-9f84c747d3bf",
        })
        .where(
            eq(modifierGroupsTable.id, "de2e1a51-1b6f-4c85-a178-bad0e67a4604"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "1c5d0786-acaf-42ba-916f-e0e8fc19dfa6",
        })
        .where(
            eq(modifierGroupsTable.id, "f5c8f0ea-5905-4cfb-a4fa-7f8272a98f74"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "4a5e8421-a60f-4900-a359-1bd9163de3fb",
        })
        .where(
            eq(modifierGroupsTable.id, "a93c1d1f-178d-49c2-a2eb-aa43e0a1ba6e"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "fb4ad6e4-857f-4615-b9a0-67e654c9d934",
        })
        .where(
            eq(modifierGroupsTable.id, "a2b46de9-6eb8-4990-a412-12f52fa66e29"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "e30a7fc9-e24e-40df-a2d6-a8a554d5ce96",
        })
        .where(
            eq(modifierGroupsTable.id, "bd0ebe4c-5145-4053-ad14-c389ef96e78d"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "de6767ca-9387-4701-af61-b3b2304cc693",
        })
        .where(
            eq(modifierGroupsTable.id, "0fc57c7a-8194-4d4d-a92c-db071cf0614c"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "a23d2ebb-a9a5-4039-8f4e-a8b50bffdd37",
        })
        .where(
            eq(modifierGroupsTable.id, "05e07662-afb0-4f53-bb04-96e5d534ce75"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "ba4b3521-3790-46ea-8f70-0ecc77f5e471",
        })
        .where(
            eq(modifierGroupsTable.id, "49013759-2a8a-44d7-bbf5-ffdcc08121e9"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "d18cc6d3-39f1-472d-aca5-b37c2569054a",
        })
        .where(
            eq(modifierGroupsTable.id, "d292ea49-33f7-4f7b-bcd8-cb991b711dda"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "f5418640-eaaf-4f9e-94db-01b9ceef8ddd",
        })
        .where(
            eq(modifierGroupsTable.id, "60befca9-289e-4797-8d55-f864047f2733"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "d5d750c0-d084-410e-b189-fa772274806c",
        })
        .where(
            eq(modifierGroupsTable.id, "16b4da2b-018e-4a77-91ee-bff1a8936ec7"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "5d3c6981-4368-499a-be81-751e17477a9c",
        })
        .where(
            eq(modifierGroupsTable.id, "aac10392-60d0-4048-817c-1e14620ac161"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "8a33acda-bb52-40df-b4fc-9fe0a0a4f296",
        })
        .where(
            eq(modifierGroupsTable.id, "e00819cf-1488-4978-9bca-0c1115f2d6ae"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "c6f36176-db1a-4bd6-83e6-fa104ef73ad6",
        })
        .where(
            eq(modifierGroupsTable.id, "75d2fac7-2464-4dcf-aad4-262cd78ad4e3"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "67dbe02a-c0d9-449f-ba73-70cdeeeb0a4c",
        })
        .where(
            eq(modifierGroupsTable.id, "ef07baf3-7e8d-49e1-b574-5e5bb1141979"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "a4159f8a-cac8-4b89-b865-7d7e6173075b",
        })
        .where(
            eq(modifierGroupsTable.id, "0cf2dbe8-a25f-4132-b78b-893c5945542b"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "3f37ae28-4e37-4057-bfd5-f0748bb61ec2",
        })
        .where(
            eq(modifierGroupsTable.id, "ecf2a330-36c1-4a29-9583-903fe48e5388"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "901448fa-11e9-41f7-bd32-11934a8b62d5",
        })
        .where(
            eq(modifierGroupsTable.id, "c87fa5fd-0551-4fe6-b865-6894bbe2ed86"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "1dac21b2-5b8b-47c9-b440-1217bcf75a5c",
        })
        .where(
            eq(modifierGroupsTable.id, "4b3667b8-43fc-4f89-8cae-352511e2accb"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "030077bc-eb59-4d8d-a7de-dd6e7116365a",
        })
        .where(
            eq(modifierGroupsTable.id, "405ed4ad-6bf2-4aff-a9bd-cf89f80b1fa0"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "4453109d-7ce1-49ac-b907-84a417a3de0a",
        })
        .where(
            eq(modifierGroupsTable.id, "59d33b4b-f23e-4bd1-9a09-45f4f0df45d1"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "89332f48-4ba3-474f-8fe0-d6fc80d2ac71",
        })
        .where(
            eq(modifierGroupsTable.id, "60deb156-275f-4cf6-9f19-33b4a8319a05"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "02134cfb-36a0-4249-bcf5-e54e14fd706f",
        })
        .where(
            eq(modifierGroupsTable.id, "0ed04a37-3f76-46fb-b062-1c7257ca1f7d"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "4d6a5692-acd9-4e3c-b258-572b132f8eba",
        })
        .where(
            eq(modifierGroupsTable.id, "83f0900f-55dd-43d4-b31a-8fd9ae6239a6"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "e963ff2c-e16d-4b66-a4d9-113379a25bd2",
        })
        .where(
            eq(modifierGroupsTable.id, "8a558da3-82c2-487a-9dd5-f037eaea1ad2"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "7cb58bbe-25dd-43d7-954f-f82d1c3e0e27",
        })
        .where(
            eq(modifierGroupsTable.id, "29850737-b313-45dd-868f-b025d173c458"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "48020399-aca2-447a-b676-b88e6b64ba66",
        })
        .where(
            eq(modifierGroupsTable.id, "4aad97c0-7fbb-41bd-b2de-48e7b7aedd26"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "71ae34c1-9317-4346-b7ea-045e05251801",
        })
        .where(
            eq(modifierGroupsTable.id, "aea2a2b9-3183-4157-91f9-04edabcc0f5a"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "fcbd47c5-5761-4e6a-8ec9-dbd1d210886e",
        })
        .where(
            eq(modifierGroupsTable.id, "da087462-0709-43be-a691-8cb243a87bd5"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "7bf3a333-11d7-416b-8eca-468a5b4478f0",
        })
        .where(
            eq(modifierGroupsTable.id, "1930e57b-84a3-438d-a604-d36d3316789e"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "57df93d0-5702-482c-8c52-1eed3c774110",
        })
        .where(
            eq(modifierGroupsTable.id, "03da6daa-ef4c-4d6a-8614-87ba0d2f6175"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "659a614d-0f4f-4fd0-8d4b-dc0a64be2d15",
        })
        .where(
            eq(modifierGroupsTable.id, "10f7172a-071e-4e45-b4b9-e4afcd24e174"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "8a51c5ad-b028-49d6-85a8-7274c0c3bac0",
        })
        .where(
            eq(modifierGroupsTable.id, "d2c85d46-b507-4f16-8384-223ba2f62e91"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "38715507-0310-4b31-b6d1-16da2deaff25",
        })
        .where(
            eq(modifierGroupsTable.id, "61fd0336-00ef-4ca8-ac7d-1515a2561848"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "ac2a5c62-76a6-4412-b37b-b43500b28156",
        })
        .where(
            eq(modifierGroupsTable.id, "09029d8b-d566-4bca-979d-7414cdd89194"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "c02c97d4-d130-40ef-99f3-407e1339c51b",
        })
        .where(
            eq(modifierGroupsTable.id, "f1ebbd2b-6d90-42a0-8051-f4697c44a18d"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "77bb4e0f-1e09-4408-8621-eb9ad34d5d81",
        })
        .where(
            eq(modifierGroupsTable.id, "07f476eb-014e-4892-8d2b-8acbb5e5e1fe"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "ac151913-6dc3-4d89-8d60-23590ebb031b",
        })
        .where(
            eq(modifierGroupsTable.id, "ba5daedb-8a4d-4e70-b8d6-e6f2bdd526ad"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "f65f4736-9d92-4768-b1ca-22750c2d6ead",
        })
        .where(
            eq(modifierGroupsTable.id, "de04dd9b-a785-4570-bfb4-ea6b83437cad"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "e59e4359-ee47-4944-a503-a63b50a33b43",
        })
        .where(
            eq(modifierGroupsTable.id, "071ea9e1-6077-494f-9626-5e94eb38deda"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "1c7b70ae-85af-49ca-be82-7e57b2689216",
        })
        .where(
            eq(modifierGroupsTable.id, "22817a4d-a43d-4bee-b449-b834da57b511"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "5a3bf748-81a6-4ca1-86e5-01155eb85884",
        })
        .where(
            eq(modifierGroupsTable.id, "ed26965f-d429-4cdb-a559-775d6a0defe1"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "f12d9f0e-3029-4973-9ab4-9568a71f0bca",
        })
        .where(
            eq(modifierGroupsTable.id, "23db2081-6e59-4f06-b8dd-4274e7ace923"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "362428c3-5e8b-4a5d-adcf-1d16591b5d7d",
        })
        .where(
            eq(modifierGroupsTable.id, "913fd563-3899-40fc-a978-f46df7b833da"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "1aec0482-801e-4f56-99de-3959a3ff49ac",
        })
        .where(
            eq(modifierGroupsTable.id, "f71b9378-6da1-414b-96af-606d3dcbb5a9"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "1c45af2b-aa35-4b1f-a703-45314b699f61",
        })
        .where(
            eq(modifierGroupsTable.id, "c9ebb4c9-bd04-4f6a-a441-810b423ada0d"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "0c1a8cb1-ad51-4767-a245-a2c75e5be617",
        })
        .where(
            eq(modifierGroupsTable.id, "511b414e-9e7d-403d-a460-27dbf689ebce"),
        );
    await db
        .update(modifierGroupsTable)
        .set({
            defaultOptionId: "06b594ad-7ff0-440c-bba2-50fdee0ffdaf",
        })
        .where(
            eq(modifierGroupsTable.id, "372e2e25-02e8-467e-900b-7abe9848f583"),
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
            // Latte → Small
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
            // Latte → Medium
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
            // Latte → Large
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
            // Latte → Almond Milk
            {
                modifierOptionId: "59f2fc2c-da36-4138-a532-68ea34ba9e34",
                ingredientId: "4555b44c-8150-4562-a91a-d90a16ed43fa",
                quantity: "250",
            },
            // Latte → Soy Milk
            {
                modifierOptionId: "1e47d41d-4e1f-4c29-9fc9-10b54a6201f3",
                ingredientId: "d5592016-85e4-42bf-8b65-803b12cb5e30",
                quantity: "250",
            },
            // Espresso → Small
            {
                modifierOptionId: "f074a226-f425-4b84-a061-6d5bddaf6673",
                ingredientId: "d65097ac-3171-4d47-9fbd-b881b470711b",
                quantity: "10",
            },
            // Espresso → Medium
            {
                modifierOptionId: "2fe4ec61-f51c-4347-ac05-1ae193c7a47b",
                ingredientId: "d65097ac-3171-4d47-9fbd-b881b470711b",
                quantity: "12",
            },
            // Espresso → Large
            {
                modifierOptionId: "3cc6b14e-9dd5-4448-9bbb-66165cf85496",
                ingredientId: "d65097ac-3171-4d47-9fbd-b881b470711b",
                quantity: "14",
            },
            // Espresso → 1 Extra Shot
            {
                modifierOptionId: "424a2f9d-8393-43d5-a227-612312398fca",
                ingredientId: "d65097ac-3171-4d47-9fbd-b881b470711b",
                quantity: "8",
            },
            // Espresso → 2 Extra Shot
            {
                modifierOptionId: "70888213-6c6d-4d58-b34b-c7ff152d233d",
                ingredientId: "d65097ac-3171-4d47-9fbd-b881b470711b",
                quantity: "16",
            },
            // Americano → Small
            {
                modifierOptionId: "1c5d0786-acaf-42ba-916f-e0e8fc19dfa6",
                ingredientId: "d65097ac-3171-4d47-9fbd-b881b470711b",
                quantity: "10",
            },
            // Americano → Medium
            {
                modifierOptionId: "2d951989-0535-4877-9204-d4b7bb70dd1e",
                ingredientId: "d65097ac-3171-4d47-9fbd-b881b470711b",
                quantity: "12",
            },
            // Americano → Large
            {
                modifierOptionId: "1cbf6eb9-e6a1-4c0b-8012-9f2391449ce4",
                ingredientId: "d65097ac-3171-4d47-9fbd-b881b470711b",
                quantity: "14",
            },
            // Americano → Whole Milk
            {
                modifierOptionId: "c684f4d4-b6f7-4f77-a87e-aef2896ceada",
                ingredientId: "b7e779c7-e70c-4e12-859c-60b1e920794a",
                quantity: "100",
            },
            // Americano → Oat Milk
            {
                modifierOptionId: "df90ef89-b8df-475f-9d79-b5a70ad10ae3",
                ingredientId: "5ab280ae-4f0e-4db9-b01e-619fd2c9ecae",
                quantity: "100",
            },
            // Americano → Almond Milk
            {
                modifierOptionId: "c77f953f-4a1b-4d37-a12a-f4d14bddc9a1",
                ingredientId: "4555b44c-8150-4562-a91a-d90a16ed43fa",
                quantity: "100",
            },
            // Americano → Soy Milk
            {
                modifierOptionId: "6771e233-9a71-49c9-94cc-1585ad7abfdd",
                ingredientId: "d5592016-85e4-42bf-8b65-803b12cb5e30",
                quantity: "100",
            },
            // Latte → 1 Extra Shot
            {
                modifierOptionId: "70acc393-1ec4-400c-93b2-a40dd678186a",
                ingredientId: "d65097ac-3171-4d47-9fbd-b881b470711b",
                quantity: "8",
            },
            // Latte → 2 Extra Shot
            {
                modifierOptionId: "87e19f73-cc10-4bcc-9e05-1b43382947ac",
                ingredientId: "d65097ac-3171-4d47-9fbd-b881b470711b",
                quantity: "16",
            },
            // Cappuccino → Small
            {
                modifierOptionId: "de6767ca-9387-4701-af61-b3b2304cc693",
                ingredientId: "d65097ac-3171-4d47-9fbd-b881b470711b",
                quantity: "14",
            },
            // Cappuccino → Small
            {
                modifierOptionId: "de6767ca-9387-4701-af61-b3b2304cc693",
                ingredientId: "b7e779c7-e70c-4e12-859c-60b1e920794a",
                quantity: "150",
            },
            // Cappuccino → Medium
            {
                modifierOptionId: "74d47b6f-52f8-4182-aabe-7e75dc9abe35",
                ingredientId: "d65097ac-3171-4d47-9fbd-b881b470711b",
                quantity: "16",
            },
            // Cappuccino → Medium
            {
                modifierOptionId: "74d47b6f-52f8-4182-aabe-7e75dc9abe35",
                ingredientId: "b7e779c7-e70c-4e12-859c-60b1e920794a",
                quantity: "200",
            },
            // Cappuccino → Large
            {
                modifierOptionId: "c775a107-b8cd-4059-a712-63759553d647",
                ingredientId: "d65097ac-3171-4d47-9fbd-b881b470711b",
                quantity: "18",
            },
            // Cappuccino → Large
            {
                modifierOptionId: "c775a107-b8cd-4059-a712-63759553d647",
                ingredientId: "b7e779c7-e70c-4e12-859c-60b1e920794a",
                quantity: "250",
            },
            // Cappuccino → Oat Milk
            {
                modifierOptionId: "ed8c343d-8fcf-4166-8e94-fbac2bc44533",
                ingredientId: "5ab280ae-4f0e-4db9-b01e-619fd2c9ecae",
                quantity: "200",
            },
            // Cappuccino → Almond Milk
            {
                modifierOptionId: "c4c734d0-3c52-42cb-b073-ff3ef397a790",
                ingredientId: "4555b44c-8150-4562-a91a-d90a16ed43fa",
                quantity: "200",
            },
            // Cappuccino → Soy Milk
            {
                modifierOptionId: "9816d1ab-e95b-4b70-9f22-97e969bab14e",
                ingredientId: "d5592016-85e4-42bf-8b65-803b12cb5e30",
                quantity: "200",
            },
            // Cappuccino → 1 Extra Shot
            {
                modifierOptionId: "297c26c2-71d8-4adc-b939-1d6d69239a5c",
                ingredientId: "d65097ac-3171-4d47-9fbd-b881b470711b",
                quantity: "8",
            },
            // Cappuccino → 2 Extra Shot
            {
                modifierOptionId: "babe07ae-284c-48bb-bda0-c40313e0fcf6",
                ingredientId: "d65097ac-3171-4d47-9fbd-b881b470711b",
                quantity: "16",
            },
            // Flat White → Small
            {
                modifierOptionId: "f5418640-eaaf-4f9e-94db-01b9ceef8ddd",
                ingredientId: "d65097ac-3171-4d47-9fbd-b881b470711b",
                quantity: "14",
            },
            // Flat White → Small
            {
                modifierOptionId: "f5418640-eaaf-4f9e-94db-01b9ceef8ddd",
                ingredientId: "b7e779c7-e70c-4e12-859c-60b1e920794a",
                quantity: "200",
            },
            // Flat White → Medium
            {
                modifierOptionId: "07139703-7816-4ac6-bf2d-0bf9289fff30",
                ingredientId: "d65097ac-3171-4d47-9fbd-b881b470711b",
                quantity: "16",
            },
            // Flat White → Medium
            {
                modifierOptionId: "07139703-7816-4ac6-bf2d-0bf9289fff30",
                ingredientId: "b7e779c7-e70c-4e12-859c-60b1e920794a",
                quantity: "250",
            },
            // Flat White → Large
            {
                modifierOptionId: "0e540db5-a81b-4878-b5b4-e917f8d86a10",
                ingredientId: "d65097ac-3171-4d47-9fbd-b881b470711b",
                quantity: "18",
            },
            // Flat White → Large
            {
                modifierOptionId: "0e540db5-a81b-4878-b5b4-e917f8d86a10",
                ingredientId: "b7e779c7-e70c-4e12-859c-60b1e920794a",
                quantity: "300",
            },
            // Flat White → Oat Milk
            {
                modifierOptionId: "c300afe9-bc5b-4ce5-ab7c-412c3243e12f",
                ingredientId: "5ab280ae-4f0e-4db9-b01e-619fd2c9ecae",
                quantity: "250",
            },
            // Flat White → Almond Milk
            {
                modifierOptionId: "29463634-034b-4a37-8854-3634335c6115",
                ingredientId: "4555b44c-8150-4562-a91a-d90a16ed43fa",
                quantity: "250",
            },
            // Flat White → Soy Milk
            {
                modifierOptionId: "8264d378-53c5-47a0-9dfc-77cbec1e5bd6",
                ingredientId: "d5592016-85e4-42bf-8b65-803b12cb5e30",
                quantity: "250",
            },
            // Mocha → Small
            {
                modifierOptionId: "8a33acda-bb52-40df-b4fc-9fe0a0a4f296",
                ingredientId: "d65097ac-3171-4d47-9fbd-b881b470711b",
                quantity: "14",
            },
            // Mocha → Small
            {
                modifierOptionId: "8a33acda-bb52-40df-b4fc-9fe0a0a4f296",
                ingredientId: "b7e779c7-e70c-4e12-859c-60b1e920794a",
                quantity: "200",
            },
            // Mocha → Medium
            {
                modifierOptionId: "7ed8c7ab-697e-45fa-a09a-3543203cbb76",
                ingredientId: "d65097ac-3171-4d47-9fbd-b881b470711b",
                quantity: "16",
            },
            // Mocha → Medium
            {
                modifierOptionId: "7ed8c7ab-697e-45fa-a09a-3543203cbb76",
                ingredientId: "b7e779c7-e70c-4e12-859c-60b1e920794a",
                quantity: "250",
            },
            // Mocha → Large
            {
                modifierOptionId: "f944ff16-002d-40bf-9457-ffc07e7d198f",
                ingredientId: "d65097ac-3171-4d47-9fbd-b881b470711b",
                quantity: "18",
            },
            // Mocha → Large
            {
                modifierOptionId: "f944ff16-002d-40bf-9457-ffc07e7d198f",
                ingredientId: "b7e779c7-e70c-4e12-859c-60b1e920794a",
                quantity: "300",
            },
            // Mocha → Oat Milk
            {
                modifierOptionId: "bd42498f-054c-4ae2-aaa0-b33a3bdbd46b",
                ingredientId: "5ab280ae-4f0e-4db9-b01e-619fd2c9ecae",
                quantity: "250",
            },
            // Mocha → Almond Milk
            {
                modifierOptionId: "a4ceebe4-32d0-4e0e-9013-d0f8bbe98374",
                ingredientId: "4555b44c-8150-4562-a91a-d90a16ed43fa",
                quantity: "250",
            },
            // Mocha → Soy Milk
            {
                modifierOptionId: "ac58fecb-4000-4abc-9bce-2dfbaaaf7a34",
                ingredientId: "d5592016-85e4-42bf-8b65-803b12cb5e30",
                quantity: "250",
            },
            // Mocha → 1 Extra Shot
            {
                modifierOptionId: "95bb10ab-96e2-4615-86e9-8a3a810300a2",
                ingredientId: "d65097ac-3171-4d47-9fbd-b881b470711b",
                quantity: "8",
            },
            // Mocha → 2 Extra Shot
            {
                modifierOptionId: "80054ef8-e727-4bac-8330-1f7b563c761f",
                ingredientId: "d65097ac-3171-4d47-9fbd-b881b470711b",
                quantity: "16",
            },
            // Iced Latte → Medium
            {
                modifierOptionId: "3f37ae28-4e37-4057-bfd5-f0748bb61ec2",
                ingredientId: "d65097ac-3171-4d47-9fbd-b881b470711b",
                quantity: "16",
            },
            // Iced Latte → Medium
            {
                modifierOptionId: "3f37ae28-4e37-4057-bfd5-f0748bb61ec2",
                ingredientId: "b7e779c7-e70c-4e12-859c-60b1e920794a",
                quantity: "250",
            },
            // Iced Latte → Medium (ice)
            {
                modifierOptionId: "3f37ae28-4e37-4057-bfd5-f0748bb61ec2",
                ingredientId: "97ab5de8-7d51-4150-96a4-a20bed70df71",
                quantity: "100",
            },
            // Iced Latte → Large
            {
                modifierOptionId: "10fb5717-0470-4ce0-b15c-14f1517917f2",
                ingredientId: "d65097ac-3171-4d47-9fbd-b881b470711b",
                quantity: "18",
            },
            // Iced Latte → Large
            {
                modifierOptionId: "10fb5717-0470-4ce0-b15c-14f1517917f2",
                ingredientId: "b7e779c7-e70c-4e12-859c-60b1e920794a",
                quantity: "300",
            },
            // Iced Latte → Large (ice)
            {
                modifierOptionId: "10fb5717-0470-4ce0-b15c-14f1517917f2",
                ingredientId: "97ab5de8-7d51-4150-96a4-a20bed70df71",
                quantity: "100",
            },
            // Iced Latte → Whole Milk
            {
                modifierOptionId: "9b714eb0-1933-4074-8f1a-aa2e7eb7d07d",
                ingredientId: "b7e779c7-e70c-4e12-859c-60b1e920794a",
                quantity: "250",
            },
            // Iced Latte → Oat Milk
            {
                modifierOptionId: "61c8a059-21bd-46d1-8692-b13ea1346b40",
                ingredientId: "5ab280ae-4f0e-4db9-b01e-619fd2c9ecae",
                quantity: "250",
            },
            // Iced Latte → Almond Milk
            {
                modifierOptionId: "c9285b30-fad1-4369-99b8-8c9fc75edbb7",
                ingredientId: "4555b44c-8150-4562-a91a-d90a16ed43fa",
                quantity: "250",
            },
            // Iced Latte → Soy Milk
            {
                modifierOptionId: "a33aeb6d-9ef1-4c82-a529-08160abc48b3",
                ingredientId: "d5592016-85e4-42bf-8b65-803b12cb5e30",
                quantity: "250",
            },
            // Iced Latte → Regular Ice
            {
                modifierOptionId: "030077bc-eb59-4d8d-a7de-dd6e7116365a",
                ingredientId: "97ab5de8-7d51-4150-96a4-a20bed70df71",
                quantity: "100",
            },
            // Iced Latte → Light Ice
            {
                modifierOptionId: "9d4b09c6-2f13-4181-9479-76d057f228cc",
                ingredientId: "97ab5de8-7d51-4150-96a4-a20bed70df71",
                quantity: "60",
            },
            // Iced Latte → Extra Ice
            {
                modifierOptionId: "061cfb6a-60f6-41ac-ab0e-aaaff25b1ca5",
                ingredientId: "97ab5de8-7d51-4150-96a4-a20bed70df71",
                quantity: "150",
            },
            // Iced Americano → Medium
            {
                modifierOptionId: "4453109d-7ce1-49ac-b907-84a417a3de0a",
                ingredientId: "d65097ac-3171-4d47-9fbd-b881b470711b",
                quantity: "16",
            },
            // Iced Americano → Medium (ice)
            {
                modifierOptionId: "4453109d-7ce1-49ac-b907-84a417a3de0a",
                ingredientId: "97ab5de8-7d51-4150-96a4-a20bed70df71",
                quantity: "100",
            },
            // Iced Americano → Large
            {
                modifierOptionId: "e4ead042-c561-4d0e-862b-77d52ff83cf4",
                ingredientId: "d65097ac-3171-4d47-9fbd-b881b470711b",
                quantity: "18",
            },
            // Iced Americano → Large (ice)
            {
                modifierOptionId: "e4ead042-c561-4d0e-862b-77d52ff83cf4",
                ingredientId: "97ab5de8-7d51-4150-96a4-a20bed70df71",
                quantity: "100",
            },
            // Iced Americano → Whole Milk
            {
                modifierOptionId: "c4685578-1537-43a3-aa74-3571461f18f6",
                ingredientId: "b7e779c7-e70c-4e12-859c-60b1e920794a",
                quantity: "80",
            },
            // Iced Americano → Oat Milk
            {
                modifierOptionId: "936275a5-67a6-4a5b-80c9-65e763224162",
                ingredientId: "5ab280ae-4f0e-4db9-b01e-619fd2c9ecae",
                quantity: "80",
            },
            // Iced Americano → Almond Milk
            {
                modifierOptionId: "b8f6b286-5779-44b8-bf13-45a00b7566f4",
                ingredientId: "4555b44c-8150-4562-a91a-d90a16ed43fa",
                quantity: "80",
            },
            // Iced Americano → Soy Milk
            {
                modifierOptionId: "734fc5f1-bb0b-4ac7-bb69-bd33552399da",
                ingredientId: "d5592016-85e4-42bf-8b65-803b12cb5e30",
                quantity: "80",
            },
            // Iced Americano → Regular Ice
            {
                modifierOptionId: "4d6a5692-acd9-4e3c-b258-572b132f8eba",
                ingredientId: "97ab5de8-7d51-4150-96a4-a20bed70df71",
                quantity: "100",
            },
            // Iced Americano → Light Ice
            {
                modifierOptionId: "3931a01d-ca4c-44ad-b9ee-fbe4d9f434db",
                ingredientId: "97ab5de8-7d51-4150-96a4-a20bed70df71",
                quantity: "60",
            },
            // Iced Americano → Extra Ice
            {
                modifierOptionId: "e0e4e5a9-8ef6-4250-9ba7-b34b1a370359",
                ingredientId: "97ab5de8-7d51-4150-96a4-a20bed70df71",
                quantity: "150",
            },
            // Cold Brew → Medium
            {
                modifierOptionId: "e963ff2c-e16d-4b66-a4d9-113379a25bd2",
                ingredientId: "d65097ac-3171-4d47-9fbd-b881b470711b",
                quantity: "20",
            },
            // Cold Brew → Medium (ice)
            {
                modifierOptionId: "e963ff2c-e16d-4b66-a4d9-113379a25bd2",
                ingredientId: "97ab5de8-7d51-4150-96a4-a20bed70df71",
                quantity: "100",
            },
            // Cold Brew → Large
            {
                modifierOptionId: "bbc008f9-0c45-4e68-863d-14cf13a65f61",
                ingredientId: "d65097ac-3171-4d47-9fbd-b881b470711b",
                quantity: "24",
            },
            // Cold Brew → Large (ice)
            {
                modifierOptionId: "bbc008f9-0c45-4e68-863d-14cf13a65f61",
                ingredientId: "97ab5de8-7d51-4150-96a4-a20bed70df71",
                quantity: "100",
            },
            // Cold Brew → Regular Ice
            {
                modifierOptionId: "48020399-aca2-447a-b676-b88e6b64ba66",
                ingredientId: "97ab5de8-7d51-4150-96a4-a20bed70df71",
                quantity: "100",
            },
            // Cold Brew → Light Ice
            {
                modifierOptionId: "493cf157-6eb1-4d8c-b89b-531d9b35a8a3",
                ingredientId: "97ab5de8-7d51-4150-96a4-a20bed70df71",
                quantity: "60",
            },
            // Cold Brew → Extra Ice
            {
                modifierOptionId: "4c2cabc8-0c15-47a5-8db0-571ac7f794c2",
                ingredientId: "97ab5de8-7d51-4150-96a4-a20bed70df71",
                quantity: "150",
            },
            // Frappuccino → Medium
            {
                modifierOptionId: "71ae34c1-9317-4346-b7ea-045e05251801",
                ingredientId: "d65097ac-3171-4d47-9fbd-b881b470711b",
                quantity: "12",
            },
            // Frappuccino → Medium
            {
                modifierOptionId: "71ae34c1-9317-4346-b7ea-045e05251801",
                ingredientId: "b7e779c7-e70c-4e12-859c-60b1e920794a",
                quantity: "200",
            },
            // Frappuccino → Medium (ice)
            {
                modifierOptionId: "71ae34c1-9317-4346-b7ea-045e05251801",
                ingredientId: "97ab5de8-7d51-4150-96a4-a20bed70df71",
                quantity: "100",
            },
            // Frappuccino → Large
            {
                modifierOptionId: "6c09573c-810f-49c4-a5c3-d282a28a2337",
                ingredientId: "d65097ac-3171-4d47-9fbd-b881b470711b",
                quantity: "16",
            },
            // Frappuccino → Large
            {
                modifierOptionId: "6c09573c-810f-49c4-a5c3-d282a28a2337",
                ingredientId: "b7e779c7-e70c-4e12-859c-60b1e920794a",
                quantity: "250",
            },
            // Frappuccino → Large (ice)
            {
                modifierOptionId: "6c09573c-810f-49c4-a5c3-d282a28a2337",
                ingredientId: "97ab5de8-7d51-4150-96a4-a20bed70df71",
                quantity: "100",
            },
            // Frappuccino → Whipped Cream
            {
                modifierOptionId: "fcbd47c5-5761-4e6a-8ec9-dbd1d210886e",
                ingredientId: "c017b2fc-db5f-4b6c-b759-15c69a4af5d5",
                quantity: "50",
            },
            // Frappuccino → Caramel Drizzle
            {
                modifierOptionId: "b4663fd0-f60b-4bea-8c4b-cd61b011794f",
                ingredientId: "9b47a12f-e5c1-491d-86c0-ebea47cfc7e5",
                quantity: "20",
            },
            // Frappuccino → Chocolate Sauce
            {
                modifierOptionId: "686f6fed-71a9-44c3-a149-22e1d6a083c6",
                ingredientId: "445e452c-14a6-44a8-a185-56234926b07a",
                quantity: "20",
            },
            // Frappuccino → Dairy Cream Base
            {
                modifierOptionId: "7bf3a333-11d7-416b-8eca-468a5b4478f0",
                ingredientId: "5937761d-2806-4962-8aa4-ecd66ddca3bb",
                quantity: "200",
            },
            // Green Tea → Small
            {
                modifierOptionId: "57df93d0-5702-482c-8c52-1eed3c774110",
                ingredientId: "5c91a9ce-a730-47aa-84c1-b76bae51770a",
                quantity: "4",
            },
            // Green Tea → Medium
            {
                modifierOptionId: "c6637989-4e4f-48fa-a464-77af64ccb8cc",
                ingredientId: "5c91a9ce-a730-47aa-84c1-b76bae51770a",
                quantity: "5",
            },
            // Green Tea → Large
            {
                modifierOptionId: "91b46408-22eb-4b17-836b-cf882b700000",
                ingredientId: "5c91a9ce-a730-47aa-84c1-b76bae51770a",
                quantity: "6",
            },
            // Green Tea → Whole Milk
            {
                modifierOptionId: "6d12d196-2989-4cdb-abcf-51ddbf720692",
                ingredientId: "b7e779c7-e70c-4e12-859c-60b1e920794a",
                quantity: "50",
            },
            // Green Tea → Oat Milk
            {
                modifierOptionId: "b82a0cc0-1796-4d87-b323-fe168aaa7eed",
                ingredientId: "5ab280ae-4f0e-4db9-b01e-619fd2c9ecae",
                quantity: "50",
            },
            // Green Tea → Almond Milk
            {
                modifierOptionId: "d1fd9f2d-f912-4943-917c-601e6a681b18",
                ingredientId: "4555b44c-8150-4562-a91a-d90a16ed43fa",
                quantity: "50",
            },
            // Green Tea → Soy Milk
            {
                modifierOptionId: "ad092e0e-0a92-439b-ad5c-1dcaac12a836",
                ingredientId: "d5592016-85e4-42bf-8b65-803b12cb5e30",
                quantity: "50",
            },
            // Earl Grey → Small
            {
                modifierOptionId: "38715507-0310-4b31-b6d1-16da2deaff25",
                ingredientId: "2db3f327-36b0-49d0-bec6-e1777c17ceff",
                quantity: "3",
            },
            // Earl Grey → Medium
            {
                modifierOptionId: "fe516d1e-2e60-4ffa-8fb8-2d924994cf8d",
                ingredientId: "2db3f327-36b0-49d0-bec6-e1777c17ceff",
                quantity: "4",
            },
            // Earl Grey → Large
            {
                modifierOptionId: "8781fa08-6709-46ad-ac63-88c98f69160d",
                ingredientId: "2db3f327-36b0-49d0-bec6-e1777c17ceff",
                quantity: "5",
            },
            // Earl Grey → Whole Milk
            {
                modifierOptionId: "e5ebe8f1-325d-4b47-ab3c-1729b3344aa5",
                ingredientId: "b7e779c7-e70c-4e12-859c-60b1e920794a",
                quantity: "50",
            },
            // Earl Grey → Oat Milk
            {
                modifierOptionId: "fce4d7bd-2bb3-4059-8dcf-3c525e95c7b7",
                ingredientId: "5ab280ae-4f0e-4db9-b01e-619fd2c9ecae",
                quantity: "50",
            },
            // Earl Grey → Almond Milk
            {
                modifierOptionId: "8a6dc0d7-fdd4-4a4f-b12e-1d16064c155d",
                ingredientId: "4555b44c-8150-4562-a91a-d90a16ed43fa",
                quantity: "50",
            },
            // Earl Grey → Soy Milk
            {
                modifierOptionId: "69dc58c2-52e7-4179-9055-126a2499c96d",
                ingredientId: "d5592016-85e4-42bf-8b65-803b12cb5e30",
                quantity: "50",
            },
            // Chai Latte → Small (chai)
            {
                modifierOptionId: "77bb4e0f-1e09-4408-8621-eb9ad34d5d81",
                ingredientId: "6ea63b6a-acaa-458a-9c99-623c430d53df",
                quantity: "40",
            },
            // Chai Latte → Small (milk)
            {
                modifierOptionId: "77bb4e0f-1e09-4408-8621-eb9ad34d5d81",
                ingredientId: "b7e779c7-e70c-4e12-859c-60b1e920794a",
                quantity: "200",
            },
            // Chai Latte → Medium (chai)
            {
                modifierOptionId: "277c1946-9bde-4e75-b71c-2417cb6cd512",
                ingredientId: "6ea63b6a-acaa-458a-9c99-623c430d53df",
                quantity: "50",
            },
            // Chai Latte → Medium (milk)
            {
                modifierOptionId: "277c1946-9bde-4e75-b71c-2417cb6cd512",
                ingredientId: "b7e779c7-e70c-4e12-859c-60b1e920794a",
                quantity: "250",
            },
            // Chai Latte → Large (chai)
            {
                modifierOptionId: "ab289954-e053-47cf-b418-84fab3e388c4",
                ingredientId: "6ea63b6a-acaa-458a-9c99-623c430d53df",
                quantity: "60",
            },
            // Chai Latte → Large (milk)
            {
                modifierOptionId: "ab289954-e053-47cf-b418-84fab3e388c4",
                ingredientId: "b7e779c7-e70c-4e12-859c-60b1e920794a",
                quantity: "300",
            },
            // Chai Latte → Oat Milk
            {
                modifierOptionId: "943ba5f5-c5de-448a-82b9-75f3eb94ae96",
                ingredientId: "5ab280ae-4f0e-4db9-b01e-619fd2c9ecae",
                quantity: "250",
            },
            // Chai Latte → Almond Milk
            {
                modifierOptionId: "db87dfc4-c1a3-4e47-ac1e-cc574f426de2",
                ingredientId: "4555b44c-8150-4562-a91a-d90a16ed43fa",
                quantity: "250",
            },
            // Chai Latte → Soy Milk
            {
                modifierOptionId: "65ce6173-17fb-41f3-8cad-aebf57c97ea3",
                ingredientId: "d5592016-85e4-42bf-8b65-803b12cb5e30",
                quantity: "250",
            },
            // Matcha Latte → Small
            {
                modifierOptionId: "e59e4359-ee47-4944-a503-a63b50a33b43",
                ingredientId: "7a0a8b17-92a6-469c-a120-33e9e4264284",
                quantity: "4",
            },
            // Matcha Latte → Small (milk)
            {
                modifierOptionId: "e59e4359-ee47-4944-a503-a63b50a33b43",
                ingredientId: "b7e779c7-e70c-4e12-859c-60b1e920794a",
                quantity: "200",
            },
            // Matcha Latte → Medium
            {
                modifierOptionId: "702dd08c-0c4d-4333-85e3-10a48f420996",
                ingredientId: "7a0a8b17-92a6-469c-a120-33e9e4264284",
                quantity: "5",
            },
            // Matcha Latte → Medium (milk)
            {
                modifierOptionId: "702dd08c-0c4d-4333-85e3-10a48f420996",
                ingredientId: "b7e779c7-e70c-4e12-859c-60b1e920794a",
                quantity: "250",
            },
            // Matcha Latte → Large
            {
                modifierOptionId: "17bddc5a-fd25-42f8-af62-0dcd771e7dab",
                ingredientId: "7a0a8b17-92a6-469c-a120-33e9e4264284",
                quantity: "6",
            },
            // Matcha Latte → Large (milk)
            {
                modifierOptionId: "17bddc5a-fd25-42f8-af62-0dcd771e7dab",
                ingredientId: "b7e779c7-e70c-4e12-859c-60b1e920794a",
                quantity: "300",
            },
            // Matcha Latte → Oat Milk
            {
                modifierOptionId: "27e0be72-cd95-4fc1-a67f-395b593f8c86",
                ingredientId: "5ab280ae-4f0e-4db9-b01e-619fd2c9ecae",
                quantity: "250",
            },
            // Matcha Latte → Almond Milk
            {
                modifierOptionId: "5c4e43fa-ae94-4979-a963-725884414d5f",
                ingredientId: "4555b44c-8150-4562-a91a-d90a16ed43fa",
                quantity: "250",
            },
            // Matcha Latte → Soy Milk
            {
                modifierOptionId: "5bfc6c28-a8bd-4632-abaa-48a058a085c1",
                ingredientId: "d5592016-85e4-42bf-8b65-803b12cb5e30",
                quantity: "250",
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
            {
                itemId: "e20feb5b-5980-4e03-901a-c6c7a3fc4766",
                ingredientId: "36f31b16-2435-4471-8b2b-2dc8a7ccdaa9",
                quantity: "1",
            },
            {
                itemId: "8240a5b6-072c-4fb7-9345-8075489611cf",
                ingredientId: "82d1098d-9674-40a3-a706-9315a9402056",
                quantity: "1",
            },
            {
                itemId: "58f0375c-3367-44d6-a3d2-905e174d7598",
                ingredientId: "f655d517-c708-4f31-a375-62262c3fab17",
                quantity: "1",
            },
            {
                itemId: "14cbc963-c2f3-44f0-9c45-56b62ac5b97b",
                ingredientId: "9dcc2862-58ef-4261-ac56-c1498412257b",
                quantity: "1",
            },
            {
                itemId: "14cbc963-c2f3-44f0-9c45-56b62ac5b97b",
                ingredientId: "5eca42e5-d1a6-4b1d-8bab-2e4594e4176f",
                quantity: "80",
            },
            {
                itemId: "14cbc963-c2f3-44f0-9c45-56b62ac5b97b",
                ingredientId: "55cb7dae-0fe6-4bc0-ba77-096f0b81d224",
                quantity: "1",
            },
            {
                itemId: "3cad9c4a-de73-45a8-a669-c0a5ca7dd2a2",
                ingredientId: "6c158039-0aa4-4baa-9555-a619387af12d",
                quantity: "1",
            },
            {
                itemId: "3cad9c4a-de73-45a8-a669-c0a5ca7dd2a2",
                ingredientId: "b883c31d-219e-48b5-ba84-d5d439513480",
                quantity: "100",
            },
            {
                itemId: "3cad9c4a-de73-45a8-a669-c0a5ca7dd2a2",
                ingredientId: "62835de4-5ddc-450f-9fa5-4ea3807edfcd",
                quantity: "30",
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
