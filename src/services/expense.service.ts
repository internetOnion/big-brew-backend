import { AppError } from "../utils/AppError.ts";
import {
    expenseRepository,
    type Expense,
    type ExpenseFilters,
    type ExpenseSummaryRow,
} from "../repositories/expense.repository.ts";

const EXPENSE_CATEGORIES = [
    "Supplies",
    "Utilities",
    "Rent",
    "Maintenance",
    "Ingredients",
    "Equipment",
    "Marketing",
    "Other",
] as const;

type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

interface CreateExpenseInput {
    description: string;
    amount: number;
    category: ExpenseCategory;
    recordedBy: string;
    recordedAt?: Date;
}

interface UpdateExpenseInput {
    description?: string;
    amount?: number;
    category?: ExpenseCategory;
}

interface ExpenseSummary {
    total: string;
    byCategory: ExpenseSummaryRow[];
}

export class ExpenseService {
    async listExpenses(filters: ExpenseFilters): Promise<Expense[]> {
        return expenseRepository.findAll(filters);
    }

    async getExpense(id: string): Promise<Expense> {
        const expense = await expenseRepository.findById(id);
        if (!expense) {
            throw AppError.notFound("Expense not found");
        }
        return expense;
    }

    async createExpense(input: CreateExpenseInput): Promise<Expense> {
        if (!EXPENSE_CATEGORIES.includes(input.category)) {
            throw AppError.badRequest(
                `Invalid category. Must be one of: ${EXPENSE_CATEGORIES.join(", ")}`,
            );
        }

        return expenseRepository.insert({
            description: input.description,
            amount: input.amount.toFixed(2),
            category: input.category,
            recordedBy: input.recordedBy,
            ...(input.recordedAt && { recordedAt: input.recordedAt }),
        });
    }

    async updateExpense(
        id: string,
        input: UpdateExpenseInput,
    ): Promise<Expense> {
        const existing = await expenseRepository.findById(id);
        if (!existing) {
            throw AppError.notFound("Expense not found");
        }

        if (input.category && !EXPENSE_CATEGORIES.includes(input.category)) {
            throw AppError.badRequest(
                `Invalid category. Must be one of: ${EXPENSE_CATEGORIES.join(", ")}`,
            );
        }

        const updateData: Record<string, unknown> = {};
        if (input.description !== undefined)
            updateData.description = input.description;
        if (input.amount !== undefined)
            updateData.amount = input.amount.toFixed(2);
        if (input.category !== undefined) updateData.category = input.category;

        return expenseRepository.update(id, updateData);
    }

    async deleteExpense(id: string): Promise<void> {
        const existing = await expenseRepository.findById(id);
        if (!existing) {
            throw AppError.notFound("Expense not found");
        }
        await expenseRepository.delete(id);
    }

    async getExpenseSummary(from: Date, to: Date): Promise<ExpenseSummary> {
        const rows = await expenseRepository.getSummary(from, to);
        const total = rows
            .reduce((sum, row) => sum + parseFloat(row.total), 0)
            .toFixed(2);

        return { total, byCategory: rows };
    }
}

export const expenseService = new ExpenseService();
