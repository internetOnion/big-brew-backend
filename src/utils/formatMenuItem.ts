import { MenuItemWithCategory } from "../repositories/menuItem.repository.ts";
import { MenuItem } from "../repositories/menuItem.repository.ts";
import { Category } from "../repositories/category.repository.ts";

export type MenuItemResponse = Omit<MenuItem, "createdAt" | "updatedAt" | "categoryId" | "deletedAt"> & { category: Omit<Category, "createdAt" | "updatedAt" | "sortOrder"> }; 


export const formatMenuItem = (menuItem: MenuItemWithCategory): MenuItemResponse => ({
    id: menuItem.menu_items.id,
    name: menuItem.menu_items.name,
    basePrice: menuItem.menu_items.basePrice,
    isAvailable: menuItem.menu_items.isAvailable,
    imageUrl: menuItem.menu_items.imageUrl,
    category: {
        id: menuItem.categories.id,
        name: menuItem.categories.name,
    }
});