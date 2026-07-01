import { eq, and, lt } from "drizzle-orm";
import { db } from "../models/index.ts";
import { refreshTokensTable } from "../models/schema/index.ts";

export interface InsertRefreshToken {
    employeeId: string;
    tokenHash: string;
    expiresAt: Date;
}

export interface RefreshToken {
    id: string;
    employeeId: string;
    tokenHash: string;
    expiresAt: Date;
    revoked: boolean;
    createdAt: Date;
}

export class RefreshTokenRepository {
    async insert(data: InsertRefreshToken): Promise<RefreshToken> {
        const result = await db
            .insert(refreshTokensTable)
            .values(data)
            .returning();
        return result[0];
    }

    async findByHash(tokenHash: string): Promise<RefreshToken | null> {
        const result = await db.query.refreshTokensTable.findFirst({
            where: and(
                eq(refreshTokensTable.tokenHash, tokenHash),
                eq(refreshTokensTable.revoked, false),
            ),
        });
        return result ?? null;
    }

    async revoke(id: string): Promise<void> {
        await db
            .update(refreshTokensTable)
            .set({ revoked: true })
            .where(eq(refreshTokensTable.id, id));
    }

    async revokeAllForEmployee(employeeId: string): Promise<void> {
        await db
            .update(refreshTokensTable)
            .set({ revoked: true })
            .where(eq(refreshTokensTable.employeeId, employeeId));
    }

    async deleteExpired(): Promise<void> {
        await db
            .delete(refreshTokensTable)
            .where(lt(refreshTokensTable.expiresAt, new Date()));
    }
}

export const refreshTokenRepository = new RefreshTokenRepository();
