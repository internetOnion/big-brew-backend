import { menuItemRepository } from "../repositories/index.ts";
import { categoryRepository } from "../repositories/index.ts";
import { AppError } from "../utils/AppError.ts";
import { storageService } from "./storage.service.ts";
import {
    formatMenuItem,
    formatMenuItemBasic,
    type MenuItemResponse,
} from "../utils/formatMenuItem.ts";
import type {
    InsertMenuItem,
    UpdateMenuItem,
} from "../repositories/menuItem.repository.ts";
import type { Category } from "../repositories/category.repository.ts";

export class MenuItemService {
    async getMenuItems(): Promise<MenuItemResponse[]> {
        const menuItems = await menuItemRepository.findAllWithRelations();
        return menuItems.map(formatMenuItem);
    }

    async addMenuItem(
        input: InsertMenuItem,
    ): Promise<Omit<MenuItemResponse, "modifierGroups" | "recipes">> {
        const category = await categoryRepository.findById(input.categoryId);
        if (!category) {
            throw AppError.badRequest("Invalid category ID");
        }

        const newMenuItem = await menuItemRepository.insert(input);

        return formatMenuItemBasic({
            menu_items: newMenuItem,
            categories: category,
        });
    }

    async updateMenuItem(
        id: string,
        input: UpdateMenuItem,
    ): Promise<Omit<MenuItemResponse, "modifierGroups" | "recipes">> {
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

        return formatMenuItemBasic({
            menu_items: updatedMenuItem,
            categories: category as Category,
        });
    }

    async deleteMenuItem(id: string): Promise<void> {
        const existingMenuItem = await menuItemRepository.findById(id);
        if (!existingMenuItem) {
            throw AppError.notFound("Menu item not found");
        }
        await menuItemRepository.delete(id);
    }

    async updateImage(
        id: string,
        file: Express.Multer.File,
    ): Promise<{ imageUrl: string; imagePath: string }> {
        const menuItem = await menuItemRepository.findById(id);
        if (!menuItem) {
            throw AppError.notFound("Menu item not found");
        }

        if (menuItem.imagePath) {
            try {
                await storageService.delete(menuItem.imagePath);
            } catch {
                // old file may already be gone — continue
            }
        }

        const { url, path } = await storageService.upload(file);
        await menuItemRepository.updateImage(id, url, path);

        return { imageUrl: url, imagePath: path };
    }

    async deleteImage(id: string): Promise<void> {
        const menuItem = await menuItemRepository.findById(id);
        if (!menuItem) {
            throw AppError.notFound("Menu item not found");
        }

        if (menuItem.imagePath) {
            try {
                await storageService.delete(menuItem.imagePath);
            } catch {
                // old file may already be gone — continue
            }
        }

        await menuItemRepository.clearImage(id);
    }
}

export const menuItemService = new MenuItemService();
