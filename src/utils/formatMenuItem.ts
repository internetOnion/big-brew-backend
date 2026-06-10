import { MenuItem } from "../repositories/menuItem.repository.ts";

export type MenuItemResponse = Omit<MenuItem, "createdAt" | "updatedAt" | "deletedAt">;

export const formatMenuItem = (menuItem: MenuItem): MenuItemResponse => ({
    id: menuItem.id,
    categoryId: menuItem.categoryId,
    name: menuItem.name,
    basePrice: menuItem.basePrice,
    isAvailable: menuItem.isAvailable,
    imageUrl: menuItem.imageUrl,
});