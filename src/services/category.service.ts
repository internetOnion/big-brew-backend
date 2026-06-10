import { categoryRepository, type Category } from "../repositories/category.repository";
import type { InsertCategory, UpdateCategory } from "../repositories/category.repository";
import { AppError } from "../utils/AppError.ts";
import { formatCategory, type CategoryResponse } from "../utils/fotmatCategory.ts";

export class CategoryService {
    async getCategories(): Promise<CategoryResponse[]> {
        try {
            const categories = await categoryRepository.findAll();
            categories.sort((a, b) => a.sortOrder - b.sortOrder);
            return categories.map(formatCategory);
        } catch (error) {
            throw AppError.internal("Failed to fetch categories");
        }
    }

    async addCategory(input: InsertCategory): Promise<CategoryResponse> {
        try {
            const newCategory = await categoryRepository.insert(input);
            return formatCategory(newCategory);
        } catch (error) {
            throw AppError.internal("Failed to add category");
        }
    }

    async updateCategory(id: string, input: UpdateCategory): Promise<CategoryResponse> {
        try {
            const existingCategory = await categoryRepository.findAll().then(categories => categories.find(cat => cat.id === id));
            if (!existingCategory) {
                throw AppError.notFound("Category not found");
            }
            const updatedCategory = await categoryRepository.update(id, input);
            return formatCategory(updatedCategory);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw AppError.internal("Failed to update category");
        }
    }

    async deleteCategory(id: string): Promise<void> {
        try {
            const existingCategory = await categoryRepository.findAll().then(categories => categories.find(cat => cat.id === id));
            if (!existingCategory) {
                throw AppError.notFound("Category not found");
            }
            await categoryRepository.delete(id);
        } catch (error) {
            throw AppError.internal("Failed to delete category");
        }
    }
}

export const categoryService = new CategoryService();