import { eq, isNull } from "drizzle-orm";
import { db } from "../../shared/models/index.ts";
import { terminalsTable } from "../../shared/models/schema/index.ts";

export interface InsertTerminal {
    name: string;
    clerkUserId: string;
}

export interface UpdateTerminal {
    name?: string;
    clerkUserId?: string;
    isActive?: boolean;
}

export interface Terminal {
    id: string;
    name: string;
    clerkUserId: string;
    isActive: boolean;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export class TerminalRepository {
    async findById(id: string): Promise<Terminal | null> {
        const result = await db.query.terminalsTable.findFirst({
            where: eq(terminalsTable.id, id),
        });
        return result ?? null;
    }

    async findByClerkUserId(clerkUserId: string): Promise<Terminal | null> {
        const result = await db.query.terminalsTable.findFirst({
            where: eq(terminalsTable.clerkUserId, clerkUserId),
        });
        return result ?? null;
    }

    async findAll(): Promise<Terminal[]> {
        return db
            .select()
            .from(terminalsTable)
            .where(isNull(terminalsTable.deletedAt))
            .orderBy(terminalsTable.createdAt);
    }

    async insert(data: InsertTerminal): Promise<Terminal> {
        const result = await db.insert(terminalsTable).values(data).returning();
        return result[0];
    }

    async update(id: string, data: UpdateTerminal): Promise<Terminal> {
        const result = await db
            .update(terminalsTable)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(terminalsTable.id, id))
            .returning();
        return result[0];
    }

    async delete(id: string): Promise<void> {
        await db
            .update(terminalsTable)
            .set({
                isActive: false,
                deletedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(terminalsTable.id, id));
    }
}

export const terminalRepository = new TerminalRepository();
