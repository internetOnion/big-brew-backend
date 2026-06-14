import { eq, and, gte, lte, desc } from "drizzle-orm";
import { db } from "../models/index.ts";
import {
    stockMovementsTable,
    ingredientsTable,
    ordersTable,
} from "../models/schema/index.ts";
import type { StockReason } from "../types/index.ts";

export interface StockMovement {
    id: string;
    ingredientId: string;
    ingredientName: string;
    ingredientUnit: string;
    quantityChange: string;
    reason: StockReason;
    referenceOrderId: string | null;
    notes: string | null;
    createdAt: Date;
}

export interface StockMovementFilters {
    ingredientId?: string;
    reason?: StockReason;
    from?: Date;
    to?: Date;
}

export class StockMovementRepository {
    async findAll(filters: StockMovementFilters): Promise<StockMovement[]> {
        const conditions = [];

        if (filters.ingredientId) {
            conditions.push(
                eq(stockMovementsTable.ingredientId, filters.ingredientId),
            );
        }
        if (filters.reason) {
            conditions.push(eq(stockMovementsTable.reason, filters.reason));
        }
        if (filters.from) {
            conditions.push(gte(stockMovementsTable.createdAt, filters.from));
        }
        if (filters.to) {
            conditions.push(lte(stockMovementsTable.createdAt, filters.to));
        }

        const whereClause =
            conditions.length > 0 ? and(...conditions) : undefined;

        const results = await db
            .select({
                id: stockMovementsTable.id,
                ingredientId: stockMovementsTable.ingredientId,
                ingredientName: ingredientsTable.name,
                ingredientUnit: ingredientsTable.unit,
                quantityChange: stockMovementsTable.quantityChange,
                reason: stockMovementsTable.reason,
                referenceOrderId: stockMovementsTable.referenceOrderId,
                notes: stockMovementsTable.notes,
                createdAt: stockMovementsTable.createdAt,
            })
            .from(stockMovementsTable)
            .innerJoin(
                ingredientsTable,
                eq(stockMovementsTable.ingredientId, ingredientsTable.id),
            )
            .where(whereClause)
            .orderBy(desc(stockMovementsTable.createdAt));

        return results;
    }
}

export const stockMovementRepository = new StockMovementRepository();
