import { eq, isNull, and } from "drizzle-orm";
import { db } from "../../shared/models/index.ts";
import { expenseCategoriesTable } from "../../shared/models/schema/index.ts";

export interface ExpenseCategory {
    id: string;
    name: string;
    createdAt: Date;
}

export interface PaginatedExpenseCategoriesResult {
    data: ExpenseCategory[];
    total: number;
    page: number;
    limit: number;
}

export class ExpenseCategoryRepository {
    async findAll(): Promise<ExpenseCategory[]> {
        return db
            .select({
                id: expenseCategoriesTable.id,
                name: expenseCategoriesTable.name,
                createdAt: expenseCategoriesTable.createdAt,
            })
            .from(expenseCategoriesTable)
            .where(isNull(expenseCategoriesTable.deletedAt))
            .orderBy(expenseCategoriesTable.name);
    }

    async findById(id: string): Promise<ExpenseCategory | null> {
        const [result] = await db
            .select({
                id: expenseCategoriesTable.id,
                name: expenseCategoriesTable.name,
                createdAt: expenseCategoriesTable.createdAt,
            })
            .from(expenseCategoriesTable)
            .where(
                and(
                    eq(expenseCategoriesTable.id, id),
                    isNull(expenseCategoriesTable.deletedAt),
                ),
            );
        return result ?? null;
    }

    async findByName(name: string): Promise<ExpenseCategory | null> {
        const [result] = await db
            .select({
                id: expenseCategoriesTable.id,
                name: expenseCategoriesTable.name,
                createdAt: expenseCategoriesTable.createdAt,
            })
            .from(expenseCategoriesTable)
            .where(
                and(
                    eq(expenseCategoriesTable.name, name),
                    isNull(expenseCategoriesTable.deletedAt),
                ),
            );
        return result ?? null;
    }

    async insert(name: string): Promise<ExpenseCategory> {
        const [result] = await db
            .insert(expenseCategoriesTable)
            .values({ name })
            .returning();
        return result;
    }

    async update(id: string, name: string): Promise<ExpenseCategory> {
        const [result] = await db
            .update(expenseCategoriesTable)
            .set({ name })
            .where(eq(expenseCategoriesTable.id, id))
            .returning();
        return result;
    }

    async delete(id: string): Promise<void> {
        await db
            .update(expenseCategoriesTable)
            .set({ deletedAt: new Date() })
            .where(eq(expenseCategoriesTable.id, id));
    }
}

export const expenseCategoryRepository = new ExpenseCategoryRepository();
