import { db } from "../models/index.ts";
import { modifierOptionsTable } from "../models/schema/index.ts";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { baseModifierOptionSchema } from "../models/schema/modifier-options.ts";
import { insertModifierOptionValidationSchema } from "../routes/menuItem.ts";
import { PgTransaction } from "drizzle-orm/pg-core";

export type ModifierOption = z.infer<typeof baseModifierOptionSchema>;
export type InsertModifierOption = z.infer<
    typeof insertModifierOptionValidationSchema
>;
export type UpdateModifierOption = Partial<InsertModifierOption>;

export class ModifierOptionRepository {
    async findAll(): Promise<ModifierOption[]> {
        const results = await db.query.modifierOptionsTable.findMany();
        return results;
    }

    async findById(id: string): Promise<ModifierOption | null> {
        const result = await db.query.modifierOptionsTable.findFirst({
            where: eq(modifierOptionsTable.id, id),
        });
        return result || null;
    }

    async findByModifierGroupId(
        modifierGroupId: string,
    ): Promise<ModifierOption[]> {
        const results = await db.query.modifierOptionsTable.findMany({
            where: eq(modifierOptionsTable.modifierGroupId, modifierGroupId),
        });
        return results;
    }

    async insert(
        input: InsertModifierOption,
        tx?: PgTransaction<any, any, any>,
    ): Promise<ModifierOption> {
        const client = tx || db;
        const result = await client
            .insert(modifierOptionsTable)
            .values(input)
            .returning();
        return result[0];
    }

    async update(
        id: string,
        input: UpdateModifierOption,
    ): Promise<ModifierOption> {
        const result = await db
            .update(modifierOptionsTable)
            .set(input)
            .where(eq(modifierOptionsTable.id, id))
            .returning();
        return result[0];
    }

    async delete(id: string): Promise<void> {
        await db
            .delete(modifierOptionsTable)
            .where(eq(modifierOptionsTable.id, id));
    }
}

export const modifierOptionRepository = new ModifierOptionRepository();
