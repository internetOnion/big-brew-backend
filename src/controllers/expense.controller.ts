import type { Request, Response } from "express";
import { expenseService } from "../services/expense.service.ts";

export class ExpenseController {
    async listExpenses(req: Request, res: Response) {
        const { from, to, category } = req.query;

        const filters: {
            from?: Date;
            to?: Date;
            category?: string;
        } = {};

        if (from) filters.from = new Date(from as string);
        if (to) filters.to = new Date(to as string);
        if (category) filters.category = category as string;

        const expenses = await expenseService.listExpenses(filters);
        return res.json(expenses);
    }

    async getExpense(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const expense = await expenseService.getExpense(id);
        return res.json(expense);
    }

    async createExpense(req: Request, res: Response) {
        const { description, amount, category, recordedAt } = req.body;
        const recordedBy = req.employee!.id;

        const expense = await expenseService.createExpense({
            description,
            amount,
            category,
            recordedBy,
            ...(recordedAt && { recordedAt: new Date(recordedAt) }),
        });

        return res.status(201).json(expense);
    }

    async updateExpense(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const { description, amount, category } = req.body;

        const expense = await expenseService.updateExpense(id, {
            description,
            amount,
            category,
        });

        return res.json(expense);
    }

    async deleteExpense(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        await expenseService.deleteExpense(id);
        return res.status(204).send();
    }

    async getSummary(req: Request, res: Response) {
        const { from, to } = req.query;

        const summary = await expenseService.getExpenseSummary(
            new Date(from as string),
            new Date(to as string),
        );

        return res.json(summary);
    }
}

export const expenseController = new ExpenseController();
