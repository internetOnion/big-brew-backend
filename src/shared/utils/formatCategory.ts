import { type Category } from "../../features/categories/category.repository.ts";

export type CategoryResponse = Omit<
    Category,
    "createdAt" | "updatedAt" | "deletedAt"
>;

export const formatCategory = (category: Category): CategoryResponse => ({
    id: category.id,
    name: category.name,
    sortOrder: category.sortOrder,
});
