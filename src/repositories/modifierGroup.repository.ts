import { db } from "../models/index.ts";
import { modifierGroupsTable } from "../models/schema/index.ts";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { baseModifierGroupSchema } from "../models/schema/modifier-groups.ts";
import { insertModifierGroupValidationSchema } from "../routes/modifierGroup.ts";

export type ModifierGroup = z.infer<typeof baseModifierGroupSchema>;
export type InsertModifierGroup = z.infer<
    typeof insertModifierGroupValidationSchema
>;
export type UpdateModifierGroup = Partial<InsertModifierGroup>;

export class ModifierGroupRepository {
    async findAll(): Promise<ModifierGroup[]> {
        const results = await db.query.modifierGroupsTable.findMany();
        return results;
    }

    async findById(id: string): Promise<ModifierGroup | null> {
        const result = await db.query.modifierGroupsTable.findFirst({
            where: eq(modifierGroupsTable.id, id),
        });
        return result || null;
    }

    async insert(input: InsertModifierGroup): Promise<ModifierGroup> {
        const result = await db
            .insert(modifierGroupsTable)
            .values(input)
            .returning();
        return result[0];
    }

    async update(
        id: string,
        input: UpdateModifierGroup,
    ): Promise<ModifierGroup> {
        const result = await db
            .update(modifierGroupsTable)
            .set(input)
            .where(eq(modifierGroupsTable.id, id))
            .returning();
        return result[0];
    }

    async delete(id: string): Promise<void> {
        await db
            .delete(modifierGroupsTable)
            .where(eq(modifierGroupsTable.id, id));
    }
}

export const modifierGroupRepository = new ModifierGroupRepository();
