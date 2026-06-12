import { baseMenuItemSchema } from "../models/schema/menu-items.ts";
import { menuItemsTable } from "../models/schema/menu-items.ts";
import { categoriesTable } from "../models/schema/categories.ts";
import { modifierGroupsTable } from "../models/schema/modifier-groups.ts";
import { modifierOptionsTable } from "../models/schema/modifier-options.ts";
import { modifierOptionIngredientsTable } from "../models/schema/modifier-option-ingredients.ts";
import { itemRecipesTable } from "../models/schema/item-recipes.ts";
import { ingredientsTable } from "../models/schema/ingredients.ts";
import {
    insertMenuItemValidationSchema,
    updateMenuItemValidationSchema,
} from "../routes/menuItem.routes.ts";
import { Category } from "./category.repository.ts";
import { ModifierGroup } from "./modifierGroup.repository.ts";
import { ModifierOption } from "./modifierOption.repository.ts";
import { ModifierOptionIngredient } from "./modifierOptionIngredient.repository.ts";
import { ItemRecipe } from "./itemRecipe.repository.ts";
import type { Ingredient } from "./ingredient.respository.ts";
import { db } from "../models/index.ts";
import { eq, isNull, inArray } from "drizzle-orm";
import { z } from "zod";
import { PgTransaction } from "drizzle-orm/pg-core";

export type MenuItem = z.infer<typeof baseMenuItemSchema>;
export type InsertMenuItem = z.infer<typeof insertMenuItemValidationSchema>;
export type UpdateMenuItem = z.infer<typeof updateMenuItemValidationSchema>;

export type MenuItemWithCategory = {
    menu_items: MenuItem;
    categories: Category;
};

export type MenuItemWithRelations = {
    menu_items: MenuItem;
    categories: Category;
    modifierGroups: (ModifierGroup & {
        options: (ModifierOption & {
            ingredients: (ModifierOptionIngredient & {
                ingredient: Pick<
                    Ingredient,
                    "id" | "name" | "unit" | "stockQuantity"
                >;
            })[];
        })[];
    })[];
    recipes: (ItemRecipe & {
        ingredient: Pick<Ingredient, "id" | "name" | "unit" | "stockQuantity">;
    })[];
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

    async findAllWithRelations(): Promise<MenuItemWithRelations[]> {
        const menuItems = await this.findAllWithCategory();
        const itemIds = menuItems.map((m) => m.menu_items.id);
        if (itemIds.length === 0) return [];

        const allGroups = await db
            .select()
            .from(modifierGroupsTable)
            .where(inArray(modifierGroupsTable.menuItemId, itemIds))
            .orderBy(modifierGroupsTable.sortOrder);
        const groupIds = allGroups.map((g) => g.id);

        let allOptions: (typeof modifierOptionsTable.$inferSelect)[] = [];
        let allOptionIngredients: (typeof modifierOptionIngredientsTable.$inferSelect)[] =
            [];
        if (groupIds.length > 0) {
            allOptions = await db
                .select()
                .from(modifierOptionsTable)
                .where(inArray(modifierOptionsTable.modifierGroupId, groupIds))
                .orderBy(modifierOptionsTable.sortOrder);
            const optionIds = allOptions.map((o) => o.id);
            if (optionIds.length > 0) {
                allOptionIngredients = await db
                    .select()
                    .from(modifierOptionIngredientsTable)
                    .where(
                        inArray(
                            modifierOptionIngredientsTable.modifierOptionId,
                            optionIds,
                        ),
                    );
            }
        }

        const allRecipes = await db
            .select()
            .from(itemRecipesTable)
            .where(inArray(itemRecipesTable.itemId, itemIds));

        const allIngredientIds = [
            ...new Set([
                ...allRecipes.map((r) => r.ingredientId),
                ...allOptionIngredients.map((i) => i.ingredientId),
            ]),
        ];
        let ingredientMap = new Map<string, Ingredient>();
        if (allIngredientIds.length > 0) {
            const ingredients = await db
                .select()
                .from(ingredientsTable)
                .where(inArray(ingredientsTable.id, allIngredientIds));
            ingredientMap = new Map(ingredients.map((i) => [i.id, i]));
        }

        const optionsByGroup = new Map<string, typeof allOptions>();
        for (const option of allOptions) {
            const list = optionsByGroup.get(option.modifierGroupId) || [];
            list.push(option);
            optionsByGroup.set(option.modifierGroupId, list);
        }

        const ingredientsByOption = new Map<
            string,
            typeof allOptionIngredients
        >();
        for (const moi of allOptionIngredients) {
            const list = ingredientsByOption.get(moi.modifierOptionId) || [];
            list.push(moi);
            ingredientsByOption.set(moi.modifierOptionId, list);
        }

        const groupsByItem = new Map<string, typeof allGroups>();
        for (const group of allGroups) {
            const list = groupsByItem.get(group.menuItemId!) || [];
            list.push(group);
            groupsByItem.set(group.menuItemId!, list);
        }

        const recipesByItem = new Map<string, typeof allRecipes>();
        for (const recipe of allRecipes) {
            const list = recipesByItem.get(recipe.itemId) || [];
            list.push(recipe);
            recipesByItem.set(recipe.itemId, list);
        }

        const getIngredient = (id: string) => {
            const i = ingredientMap.get(id);
            return i
                ? {
                      id: i.id,
                      name: i.name,
                      unit: i.unit,
                      stockQuantity: i.stockQuantity,
                  }
                : {
                      id,
                      name: "Unknown",
                      unit: "g" as const,
                      stockQuantity: "0",
                  };
        };

        return menuItems.map((item) => ({
            ...item,
            modifierGroups: (groupsByItem.get(item.menu_items.id) || []).map(
                (group) => ({
                    ...group,
                    options: (optionsByGroup.get(group.id) || []).map(
                        (option) => ({
                            ...option,
                            ingredients: (
                                ingredientsByOption.get(option.id) || []
                            ).map((moi) => ({
                                ...moi,
                                ingredient: getIngredient(moi.ingredientId),
                            })),
                        }),
                    ),
                }),
            ),
            recipes: (recipesByItem.get(item.menu_items.id) || []).map(
                (recipe) => ({
                    ...recipe,
                    ingredient: getIngredient(recipe.ingredientId),
                }),
            ),
        }));
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

    async updateImage(
        id: string,
        imageUrl: string,
        imagePath: string,
    ): Promise<MenuItem> {
        const result = await db
            .update(menuItemsTable)
            .set({ imageUrl, imagePath })
            .where(eq(menuItemsTable.id, id))
            .returning();
        return result[0];
    }

    async clearImage(id: string): Promise<MenuItem> {
        const result = await db
            .update(menuItemsTable)
            .set({ imageUrl: null, imagePath: null })
            .where(eq(menuItemsTable.id, id))
            .returning();
        return result[0];
    }
}

export const menuItemRepository = new MenuItemRepository();
