import { baseMenuItemSchema } from "../models/schema/menu-items.ts";
import { menuItemsTable } from "../models/schema/menu-items.ts";
import { categoriesTable } from "../models/schema/categories.ts";
import {
    insertMenuItemValidationSchema,
    updateMenuItemValidationSchema,
} from "../routes/menuItem.routes.ts";
import { Category } from "./category.repository.ts";
import { db } from "../models/index.ts";
import { eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { PgTransaction } from "drizzle-orm/pg-core";

export type MenuItem = z.infer<typeof baseMenuItemSchema>;
export type InsertMenuItem = z.infer<typeof insertMenuItemValidationSchema>;
export type UpdateMenuItem = z.infer<typeof updateMenuItemValidationSchema>;

export type MenuItemWithCategory = {
    menu_items: MenuItem;
    categories: Category;
};

export class MenuItemRepository {
    async findAllAvtive(): Promise<MenuItem[]> {
        const results = await db.query.menuItemsTable.findMany({
            where: (menuItems, { isNull }) => isNull(menuItems.deletedAt),
        });
        return results;
    }

    async findAllWithCategory(): Promise<MenuItemWithCategory[]> {
        const menuItems = await db
            .select()
            .from(menuItemsTable)
            .innerJoin(
                categoriesTable,
                eq(menuItemsTable.categoryId, categoriesTable.id),
            )
            .where(isNull(menuItemsTable.deletedAt));
        return menuItems;
    }

    async findById(id: string): Promise<MenuItem | null> {
        const result = await db.query.menuItemsTable.findFirst({
            where: eq(menuItemsTable.id, id),
        });
        return result || null;
    }

    async insert(
        input: InsertMenuItem,
        tx?: PgTransaction<any, any, any>,
    ): Promise<MenuItem> {
        const client = tx || db;
        const result = await client
            .insert(menuItemsTable)
            .values(input)
            .returning();
        return result[0];
    }

    async update(id: string, input: UpdateMenuItem): Promise<MenuItem> {
        const result = await db
            .update(menuItemsTable)
            .set(input)
            .where(eq(menuItemsTable.id, id))
            .returning();
        return result[0];
    }

    async delete(id: string): Promise<void> {
        await db
            .update(menuItemsTable)
            .set({ deletedAt: new Date() })
            .where(eq(menuItemsTable.id, id));
    }
}

export const menuItemRepository = new MenuItemRepository();
