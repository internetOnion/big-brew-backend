import { menuItemRepository } from "../repositories/index.ts";
import { categoryRepository } from "../repositories/index.ts";
import { AppError } from "../utils/AppError.ts";
import { formatMenuItem, type MenuItemResponse } from "../utils/formatMenuItem.ts";
import type { InsertMenuItem, UpdateMenuItem } from "../repositories/menuItem.repository.ts";
import { Category } from "../repositories/category.repository.ts";


export class MenuItemService {
    async getMenuItems(): Promise<MenuItemResponse[]> {
        const menuItems = await menuItemRepository.findAllWithCategory();
        return menuItems.map(formatMenuItem);
    }


    async addMenuItem(input: InsertMenuItem): Promise<MenuItemResponse> {
        try {
            const category = await categoryRepository.findById(input.categoryId);
            if (!category) {
                throw AppError.badRequest("Invalid category ID");
            }
            const newMenuItem = await menuItemRepository.insert(input);
            const menuItemWithCategory = {
                menu_items: newMenuItem,
                categories: category
            }
            return formatMenuItem(menuItemWithCategory);
        } catch (error) {
            throw AppError.internal("Failed to add menu item");
        }
    }

    async updateMenuItem(id: string, input: UpdateMenuItem): Promise<MenuItemResponse> {
        try {
            const categoryIdToCheck = input.categoryId;
            const category = input.categoryId ? await categoryRepository.findById(input.categoryId) : null;
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
            }
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

