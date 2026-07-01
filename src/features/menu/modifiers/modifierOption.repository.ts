import { db } from "../../../shared/models/index.ts";
import { modifierOptionsTable } from "../../../shared/models/schema/index.ts";
import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";
import { baseModifierOptionSchema } from "../../../shared/models/schema/modifier-options.ts";
import { insertModifierOptionValidationSchema } from "../items/menuItem.routes.ts";
import { PgTransaction } from "drizzle-orm/pg-core";

export type ModifierOption = z.infer<typeof baseModifierOptionSchema>;
export type InsertModifierOption = z.infer<
    typeof insertModifierOptionValidationSchema
>;
export type UpdateModifierOption = Partial<InsertModifierOption>;

export class ModifierOptionRepository {
    async findAll(): Promise<ModifierOption[]> {
        const results = await db.query.modifierOptionsTable.findMany({
            where: isNull(modifierOptionsTable.deletedAt),
        });
        return results;
    }

    async findById(
        id: string,
        includeDeleted = false,
    ): Promise<ModifierOption | null> {
        const result = await db.query.modifierOptionsTable.findFirst({
            where: includeDeleted
                ? eq(modifierOptionsTable.id, id)
                : and(
                      eq(modifierOptionsTable.id, id),
                      isNull(modifierOptionsTable.deletedAt),
                  ),
        });
        return result || null;
    }

    async findByModifierGroupId(
        modifierGroupId: string,
    ): Promise<ModifierOption[]> {
        const results = await db.query.modifierOptionsTable.findMany({
            where: and(
                eq(modifierOptionsTable.modifierGroupId, modifierGroupId),
                isNull(modifierOptionsTable.deletedAt),
            ),
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
            .update(modifierOptionsTable)
            .set({ deletedAt: new Date() })
            .where(eq(modifierOptionsTable.id, id));
    }
}

export const modifierOptionRepository = new ModifierOptionRepository();
