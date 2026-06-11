import {
    menuItemRepository,
    ModifierGroup,
    InsertModifierGroup,
    InsertModifierOption,
} from "../repositories/index.ts";
import { categoryRepository } from "../repositories/index.ts";
import {
    modifierGroupRepository,
    modifierOptionRepository,
    modifierOptionIngredientRepository,
    itemRecipeRepository,
    menuItemModifierGroupRepository,
} from "../repositories/index.ts";

import { itemRecipeService } from "./itemRecipe.service.ts";
import { MenuItem } from "../repositories/menuItem.repository.ts";
import { AppError } from "../utils/AppError.ts";
import {
    formatMenuItem,
    type MenuItemResponse,
} from "../utils/formatMenuItem.ts";
import type {
    InsertMenuItem,
    UpdateMenuItem,
    MenuItemRequest,
} from "../repositories/menuItem.repository.ts";
import { Category } from "../repositories/category.repository.ts";
import { db } from "../models/index.ts";

export class MenuItemService {
    async getMenuItems(): Promise<MenuItemResponse[]> {
        const menuItems = await menuItemRepository.findAllWithCategory();
        return menuItems.map(formatMenuItem);
    }

    async addMenuItem(input: MenuItemRequest): Promise<MenuItemResponse> {
        return await db.transaction(async (tx) => {
            try {
                const category = await categoryRepository.findById(
                    input.categoryId,
                    tx,
                );
                if (!category) {
                    throw AppError.badRequest("Invalid category ID");
                }

                const menuItemData: InsertMenuItem = {
                    name: input.name,
                    basePrice: input.basePrice,
                    categoryId: input.categoryId,
                    imageUrl: input.imageUrl || null,
                };
                const newMenuItem = await menuItemRepository.insert(
                    menuItemData,
                    tx,
                );

                if (input.ingredients && input.ingredients.length > 0) {
                    const itemRecipe = input.ingredients.map((ingredient) => ({
                        itemId: newMenuItem.id,
                        ingredientId: ingredient.ingredientId,
                        quantity: ingredient.quantity,
                    }));
                    await itemRecipeRepository.insertMany(itemRecipe, tx);
                }

                if (input.modifierGroups && input.modifierGroups.length > 0) {
                    for (const group of input.modifierGroups) {
                        const modifierGroupData: InsertModifierGroup = {
                            name: group.name,
                            selectionType: group.selectionType,
                            isRequired: group.isRequired,
                        };
                        const newModifierGroup =
                            await modifierGroupRepository.insert(
                                modifierGroupData,
                                tx,
                            );

                        const menuItemModifierGroupData = {
                            menuItemId: newMenuItem.id,
                            modifierGroupId: newModifierGroup.id,
                        };
                        await menuItemModifierGroupRepository.insert(
                            menuItemModifierGroupData,
                            tx,
                        );

                        for (const option of group.modifierOptions) {
                            const modifierOptionData: InsertModifierOption = {
                                modifierGroupId: newModifierGroup.id,
                                name: option.name,
                                price: option.price,
                            };
                            const newModifierOption =
                                await modifierOptionRepository.insert(
                                    modifierOptionData,
                                    tx,
                                );

                            if (
                                option.insertModifierOptionIngredients &&
                                option.insertModifierOptionIngredients.length >
                                    0
                            ) {
                                const modifierOptionIngredientData =
                                    option.insertModifierOptionIngredients.map(
                                        (ingredient) => ({
                                            modifierOptionId:
                                                newModifierOption.id,
                                            ingredientId:
                                                ingredient.ingredientId,
                                            quantity: ingredient.quantity,
                                        }),
                                    );
                                await modifierOptionIngredientRepository.insertMany(
                                    modifierOptionIngredientData,
                                    tx,
                                );
                            }
                        }
                    }
                }

                const menuItemWithCategory = {
                    menu_items: newMenuItem,
                    categories: category,
                };
                return formatMenuItem(menuItemWithCategory);
            } catch (error) {
                if (error instanceof AppError) {
                    throw error;
                }
                throw AppError.internal(
                    "Failed to create the menu item layout structure.",
                );
            }
        });
    }

    async updateMenuItem(
        id: string,
        input: UpdateMenuItem,
    ): Promise<MenuItemResponse> {
        try {
            const categoryIdToCheck = input.categoryId;
            const category = input.categoryId
                ? await categoryRepository.findById(input.categoryId)
                : null;
            if (categoryIdToCheck && !category) {
                throw AppError.badRequest("Invalid category ID");
            }
            const existingMenuItem = await menuItemRepository.findById(id);
            if (!existingMenuItem) {
                throw AppError.notFound("Menu item not found");
            }
            const updatedMenuItem = await menuItemRepository.update(id, input);
            const menuItemWithCategory = {
                menu_items: updatedMenuItem,
                categories: category as Category,
            };
            return formatMenuItem(menuItemWithCategory);
        } catch (error) {
            throw AppError.internal("Failed to update menu item");
        }
    }

    async deleteMenuItem(id: string): Promise<void> {
        try {
            const existingMenuItem = await menuItemRepository.findById(id);
            if (!existingMenuItem) {
                throw AppError.notFound("Menu item not found");
            }
            await menuItemRepository.delete(id);
        } catch (error) {
            throw AppError.internal("Failed to delete menu item");
        }
    }
}

export const menuItemService = new MenuItemService();
