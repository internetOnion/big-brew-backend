import { db } from "../models/index.ts";
import { categoriesTable } from "../models/schema/index.ts";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { insertCategorySchema } from "../models/schema/categories.ts";
import { insertCategoryValidationSchema } from "../routes/category.ts";

export type Category = z.infer<typeof insertCategorySchema>;
export type InsertCategory = z.infer<typeof insertCategoryValidationSchema>;
export type UpdateCategory = Partial<InsertCategory>;

export class CategoryRepository {
    async findAll(): Promise<Category[]> {
        const results = await db.query.categoriesTable.findMany();
        return results;
    }

    async insert(input: InsertCategory): Promise<Category> {
        const result = await db
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
        return result[0];
    }

    async delete(id: string): Promise<void> {
        await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
    }
}

export const categoryRepository = new CategoryRepository();
