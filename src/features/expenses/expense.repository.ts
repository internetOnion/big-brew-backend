import { eq, and, gte, lte, desc, sql, isNull, count } from "drizzle-orm";
import { db } from "../../shared/models/index.ts";
import {
    expensesTable,
    employeesTable,
} from "../../shared/models/schema/index.ts";

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
    limit?: number;
    offset?: number;
}

export interface PaginatedExpensesResult {
    data: Expense[];
    total: number;
    page: number;
    limit: number;
}

export interface ExpenseSummaryRow {
    category: string | null;
    total: string;
    count: number;
}

export class ExpenseRepository {
    async findAll(filters: ExpenseFilters): Promise<PaginatedExpensesResult> {
        const conditions = [isNull(expensesTable.deletedAt)];

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

        const limit = filters.limit ?? 20;
        const offset = filters.offset ?? 0;

        const [countResult, results] = await Promise.all([
            db
                .select({ total: count() })
                .from(expensesTable)
                .where(whereClause),
            db
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
                .orderBy(desc(expensesTable.recordedAt))
                .limit(limit)
                .offset(offset),
        ]);

        const total = countResult[0]?.total ?? 0;

        return {
            data: results,
            total,
            page: Math.floor(offset / limit) + 1,
            limit,
        };
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
            .where(
                and(eq(expensesTable.id, id), isNull(expensesTable.deletedAt)),
            )
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
        await db
            .update(expensesTable)
            .set({ deletedAt: new Date() })
            .where(eq(expensesTable.id, id));
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
                    isNull(expensesTable.deletedAt),
                ),
            )
            .groupBy(expensesTable.category);

        return results;
    }
}

export const expenseRepository = new ExpenseRepository();
