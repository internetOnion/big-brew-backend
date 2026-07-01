import { db } from "../../../shared/models/index.ts";
import { modifierGroupsTable } from "../../../shared/models/schema/index.ts";
import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";
import { baseModifierGroupSchema } from "../../../shared/models/schema/modifier-groups.ts";
import { insertModifierGroupValidationSchema } from "./modifierGroup.routes.ts";
import { PgTransaction } from "drizzle-orm/pg-core";

export type ModifierGroup = z.infer<typeof baseModifierGroupSchema>;
export type InsertModifierGroup = z.infer<
    typeof insertModifierGroupValidationSchema
>;
export type UpdateModifierGroup = Partial<InsertModifierGroup>;

export class ModifierGroupRepository {
    async findAll(): Promise<ModifierGroup[]> {
        const results = await db.query.modifierGroupsTable.findMany({
            where: (modifierGroups, { isNull }) =>
                and(
                    isNull(modifierGroups.menuItemId),
                    isNull(modifierGroups.deletedAt),
                ),
        });
        return results;
    }

    async findByMenuItemId(menuItemId: string): Promise<ModifierGroup[]> {
        const results = await db.query.modifierGroupsTable.findMany({
            where: and(
                eq(modifierGroupsTable.menuItemId, menuItemId),
                isNull(modifierGroupsTable.deletedAt),
            ),
        });
        return results;
    }

    async findById(
        id: string,
        includeDeleted = false,
    ): Promise<ModifierGroup | null> {
        const result = await db.query.modifierGroupsTable.findFirst({
            where: includeDeleted
                ? eq(modifierGroupsTable.id, id)
                : and(
                      eq(modifierGroupsTable.id, id),
                      isNull(modifierGroupsTable.deletedAt),
                  ),
        });
        return result || null;
    }

    async insert(
        input: InsertModifierGroup,
        tx?: PgTransaction<any, any, any>,
    ): Promise<ModifierGroup> {
        const client = tx || db;
        const result = await client
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
            .update(modifierGroupsTable)
            .set({ deletedAt: new Date() })
            .where(eq(modifierGroupsTable.id, id));
    }
}

export const modifierGroupRepository = new ModifierGroupRepository();
