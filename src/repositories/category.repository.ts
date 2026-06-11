import { db } from "../models/index.ts";
import { categoriesTable } from "../models/schema/index.ts";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { insertCategorySchema } from "../models/schema/categories.ts";
import { PgTransaction } from "drizzle-orm/pg-core";

export type Category = z.infer<typeof insertCategorySchema>;
export type InsertCategory = z.infer<
    ReturnType<
        typeof insertCategorySchema.pick<{ name: true; sortOrder: true }>
    >
>;
export type UpdateCategory = Partial<InsertCategory>;

export class CategoryRepository {
    async findAll(): Promise<Category[]> {
        const results = await db.query.categoriesTable.findMany();
        return results;
    }

    async findById(
        id: string,
        tx?: PgTransaction<any, any, any>,
    ): Promise<Category | null> {
        const client = tx || db;
        const [result] = await client
            .select()
            .from(categoriesTable)
            .where(eq(categoriesTable.id, id));
        return result || null;
    }

    async findByName(name: string): Promise<Category | null> {
        const [result] = await db
            .select()
            .from(categoriesTable)
            .where(eq(categoriesTable.name, name));
        return result || null;
    }

    async insert(
        input: InsertCategory,
        tx?: PgTransaction<any, any, any>,
    ): Promise<Category> {
        const client = tx || db;
        const result = await client
            .insert(categoriesTable)
            .values(input)
            .returning();
        return result[0];
    }

    async update(id: string, input: UpdateCategory): Promise<Category> {
        const result = await db
            .update(categoriesTable)
            .set(input)
            .where(eq(categoriesTable.id, id))
            .returning();
        const result = await db
            .update(categoriesTable)
            .set(input)
            .where(eq(categoriesTable.id, id))
            .returning();
        return result[0];
    }

    async delete(id: string): Promise<void> {
        await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
    }
}

export const categoryRepository = new CategoryRepository();

