import { baseMenuItemModifierGroupSchema } from "../models/schema/menu-item-modifier-groups.ts";
import { db } from "../models/index.ts";
import { menuItemModifierGroupsTable } from "../models/schema/index.ts";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { insertMenuItemModifierGroupValidationSchema } from "../routes/menuItem.ts";
import { PgTransaction } from "drizzle-orm/pg-core";

export type MenuItemModifierGroup = z.infer<typeof baseMenuItemModifierGroupSchema>;
export type InsertMenuItemModifierGroup = z.infer<typeof insertMenuItemModifierGroupValidationSchema>;
export type UpdateMenuItemModifierGroup = Partial<InsertMenuItemModifierGroup>;

export class MenuItemModifierGroupRepository {
    async insert(input: InsertMenuItemModifierGroup, tx? : PgTransaction<any, any, any>): Promise<MenuItemModifierGroup> {
        const client = tx || db;
        const result = await client.insert(menuItemModifierGroupsTable).values(input).returning();
        return result[0];
    }

    async insertMany(inputs: InsertMenuItemModifierGroup[], tx?: PgTransaction<any, any, any>): Promise<MenuItemModifierGroup[]> {
        const client = tx || db;
        const result = await client.insert(menuItemModifierGroupsTable).values(inputs).returning();
        return result;
    }
}

export const menuItemModifierGroupRepository = new MenuItemModifierGroupRepository();