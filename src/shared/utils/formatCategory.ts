import { type Category } from "../../features/categories/category.repository";

export type CategoryResponse = Omit<Category, "createdAt" | "updatedAt">;

export const formatCategory = (category: Category): CategoryResponse => ({
    id: category.id,
    name: category.name,
    sortOrder: category.sortOrder,
});
