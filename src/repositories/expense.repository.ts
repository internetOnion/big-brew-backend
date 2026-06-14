import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { db } from "../models/index.ts";
import { expensesTable, employeesTable } from "../models/schema/index.ts";

export interface Expense {
    id: string;
    description: string;
    amount: string;
    category: string | null;
    recordedBy: string;
    recordedByName: string | null;
    recordedAt: Date;
    createdAt: Date;
}

export interface InsertExpense {
    description: string;
    amount: string;
    category: string;
    recordedBy: string;
    recordedAt?: Date;
}

export interface UpdateExpense {
    description?: string;
    amount?: string;
    category?: string;
}

export interface ExpenseFilters {
    from?: Date;
    to?: Date;
    category?: string;
}

export interface ExpenseSummaryRow {
    category: string | null;
    total: string;
    count: number;
}

export class ExpenseRepository {
    async findAll(filters: ExpenseFilters): Promise<Expense[]> {
        const conditions = [];

        if (filters.from) {
            conditions.push(gte(expensesTable.recordedAt, filters.from));
        }
        if (filters.to) {
            conditions.push(lte(expensesTable.recordedAt, filters.to));
        }
        if (filters.category) {
            conditions.push(eq(expensesTable.category, filters.category));
        }

        const whereClause =
            conditions.length > 0 ? and(...conditions) : undefined;

        const results = await db
            .select({
                id: expensesTable.id,
                description: expensesTable.description,
                amount: expensesTable.amount,
                category: expensesTable.category,
                recordedBy: expensesTable.recordedBy,
                recordedByName: employeesTable.name,
                recordedAt: expensesTable.recordedAt,
                createdAt: expensesTable.createdAt,
            })
            .from(expensesTable)
            .leftJoin(
                employeesTable,
                eq(expensesTable.recordedBy, employeesTable.id),
            )
            .where(whereClause)
            .orderBy(desc(expensesTable.recordedAt));

        return results;
    }

    async findById(id: string): Promise<Expense | null> {
        const result = await db
            .select({
                id: expensesTable.id,
                description: expensesTable.description,
                amount: expensesTable.amount,
                category: expensesTable.category,
                recordedBy: expensesTable.recordedBy,
                recordedByName: employeesTable.name,
                recordedAt: expensesTable.recordedAt,
                createdAt: expensesTable.createdAt,
            })
            .from(expensesTable)
            .leftJoin(
                employeesTable,
                eq(expensesTable.recordedBy, employeesTable.id),
            )
            .where(eq(expensesTable.id, id))
            .limit(1);

        return result[0] ?? null;
    }

    async insert(data: InsertExpense): Promise<Expense> {
        const result = await db
            .insert(expensesTable)
            .values({
                description: data.description,
                amount: data.amount,
                category: data.category,
                recordedBy: data.recordedBy,
                ...(data.recordedAt && { recordedAt: data.recordedAt }),
            })
            .returning();

        return this.findById(result[0].id) as Promise<Expense>;
    }

    async update(id: string, data: UpdateExpense): Promise<Expense> {
        await db
            .update(expensesTable)
            .set(data)
            .where(eq(expensesTable.id, id));

        return this.findById(id) as Promise<Expense>;
    }

    async delete(id: string): Promise<void> {
        await db.delete(expensesTable).where(eq(expensesTable.id, id));
    }

    async getSummary(from: Date, to: Date): Promise<ExpenseSummaryRow[]> {
        const results = await db
            .select({
                category: expensesTable.category,
                total: sql<string>`SUM(${expensesTable.amount})::text`,
                count: sql<number>`COUNT(*)::int`,
            })
            .from(expensesTable)
            .where(
                and(
                    gte(expensesTable.recordedAt, from),
                    lte(expensesTable.recordedAt, to),
                ),
            )
            .groupBy(expensesTable.category);

        return results;
    }
}

export const expenseRepository = new ExpenseRepository();
