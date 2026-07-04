import { AppError } from "../../shared/utils/AppError.ts";
import {
    expenseCategoryRepository,
    type ExpenseCategory,
} from "./expense-category.repository.ts";

export class ExpenseCategoryService {
    async listCategories(): Promise<ExpenseCategory[]> {
        return expenseCategoryRepository.findAll();
    }

    async getCategory(id: string): Promise<ExpenseCategory> {
        const category = await expenseCategoryRepository.findById(id);
        if (!category) {
            throw AppError.notFound("Expense category not found");
        }
        return category;
    }

    async createCategory(name: string): Promise<ExpenseCategory> {
        if (!name.trim()) {
            throw AppError.badRequest("Name is required");
        }

        const existing = await expenseCategoryRepository.findByName(
            name.trim(),
        );
        if (existing) {
            throw AppError.conflict(
                "An expense category with this name already exists",
            );
        }

        return expenseCategoryRepository.insert(name.trim());
    }

    async updateCategory(id: string, name: string): Promise<ExpenseCategory> {
        if (!name.trim()) {
            throw AppError.badRequest("Name is required");
        }

        const existing = await expenseCategoryRepository.findById(id);
        if (!existing) {
            throw AppError.notFound("Expense category not found");
        }

        const duplicate = await expenseCategoryRepository.findByName(
            name.trim(),
        );
        if (duplicate && duplicate.id !== id) {
            throw AppError.conflict(
                "An expense category with this name already exists",
            );
        }

        return expenseCategoryRepository.update(id, name.trim());
    }

    async deleteCategory(id: string): Promise<void> {
        const existing = await expenseCategoryRepository.findById(id);
        if (!existing) {
            throw AppError.notFound("Expense category not found");
        }
        await expenseCategoryRepository.delete(id);
    }
}

export const expenseCategoryService = new ExpenseCategoryService();
