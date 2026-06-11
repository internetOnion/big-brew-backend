import { menuItemRepository } from "../repositories/index.ts";
import { categoryRepository } from "../repositories/index.ts";
import { AppError } from "../utils/AppError.ts";
import {
    formatMenuItem,
    type MenuItemResponse,
} from "../utils/formatMenuItem.ts";
import type {
    InsertMenuItem,
    UpdateMenuItem,
} from "../repositories/menuItem.repository.ts";
import type { Category } from "../repositories/category.repository.ts";

export class MenuItemService {
    async getMenuItems(): Promise<MenuItemResponse[]> {
        const menuItems = await menuItemRepository.findAllWithCategory();
        return menuItems.map(formatMenuItem);
    }

    async addMenuItem(input: InsertMenuItem): Promise<MenuItemResponse> {
        const category = await categoryRepository.findById(input.categoryId);
        if (!category) {
            throw AppError.badRequest("Invalid category ID");
        }

        const newMenuItem = await menuItemRepository.insert(input);

        const menuItemWithCategory = {
            menu_items: newMenuItem,
            categories: category,
        };
        return formatMenuItem(menuItemWithCategory);
    }

    async updateMenuItem(
        id: string,
        input: UpdateMenuItem,
    ): Promise<MenuItemResponse> {
        const existingMenuItem = await menuItemRepository.findById(id);
        if (!existingMenuItem) {
            throw AppError.notFound("Menu item not found");
        }

        if (input.categoryId) {
            const category = await categoryRepository.findById(
                input.categoryId,
            );
            if (!category) {
                throw AppError.badRequest("Invalid category ID");
            }
        }

        const updatedMenuItem = await menuItemRepository.update(id, input);

        const category = await categoryRepository.findById(
            updatedMenuItem.categoryId,
        );

        const menuItemWithCategory = {
            menu_items: updatedMenuItem,
            categories: category as Category,
        };
        return formatMenuItem(menuItemWithCategory);
    }

    async deleteMenuItem(id: string): Promise<void> {
        const existingMenuItem = await menuItemRepository.findById(id);
        if (!existingMenuItem) {
            throw AppError.notFound("Menu item not found");
        }
        await menuItemRepository.delete(id);
    }
}

export const menuItemService = new MenuItemService();
