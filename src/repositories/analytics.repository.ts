import { sql, and, gte, lte, eq, desc } from "drizzle-orm";
import { db } from "../models/index.ts";
import {
    ordersTable,
    orderItemsTable,
    menuItemsTable,
    expensesTable,
} from "../models/schema/index.ts";

export type GroupBy = "day" | "week" | "month" | "year";

export interface RevenueDataPoint {
    period: string;
    revenue: string;
    orderCount: number;
}

export interface TopItem {
    menuItemId: string;
    name: string;
    quantity: number;
    revenue: string;
}

export interface ExpenseCategoryTotal {
    category: string | null;
    total: string;
    count: number;
}

export interface AnalyticsSummary {
    totalRevenue: string;
    totalExpenses: string;
    netIncome: string;
    orderCount: number;
    averageOrderValue: string;
}

export class AnalyticsRepository {
    async getRevenueOverTime(
        from: Date,
        to: Date,
        groupBy: GroupBy,
    ): Promise<RevenueDataPoint[]> {
        const results = await db
            .select({
                period: sql<string>`date_trunc(${groupBy}, ${ordersTable.createdAt})::text`,
                revenue: sql<string>`COALESCE(SUM(${ordersTable.total}), 0)::text`,
                orderCount: sql<number>`COUNT(*)::int`,
            })
            .from(ordersTable)
            .where(
                and(
                    eq(ordersTable.status, "completed"),
                    gte(ordersTable.createdAt, from),
                    lte(ordersTable.createdAt, to),
                ),
            )
            .groupBy(sql`date_trunc(${groupBy}, ${ordersTable.createdAt})`)
            .orderBy(sql`date_trunc(${groupBy}, ${ordersTable.createdAt})`);

        return results;
    }

    async getTopItems(
        from: Date,
        to: Date,
        sortBy: "quantity" | "revenue",
        limit: number,
    ): Promise<TopItem[]> {
        const orderClause =
            sortBy === "quantity"
                ? sql`SUM(${orderItemsTable.quantity}) DESC`
                : sql`SUM(${orderItemsTable.quantity} * ${orderItemsTable.unitPrice}) DESC`;

        const results = await db
            .select({
                menuItemId: orderItemsTable.menuItemId,
                name: menuItemsTable.name,
                quantity: sql<number>`SUM(${orderItemsTable.quantity})::int`,
                revenue: sql<string>`SUM(${orderItemsTable.quantity} * ${orderItemsTable.unitPrice})::text`,
            })
            .from(orderItemsTable)
            .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
            .innerJoin(
                menuItemsTable,
                eq(orderItemsTable.menuItemId, menuItemsTable.id),
            )
            .where(
                and(
                    eq(ordersTable.status, "completed"),
                    gte(ordersTable.createdAt, from),
                    lte(ordersTable.createdAt, to),
                ),
            )
            .groupBy(orderItemsTable.menuItemId, menuItemsTable.name)
            .orderBy(orderClause)
            .limit(limit);

        return results;
    }

    async getExpenseBreakdown(
        from: Date,
        to: Date,
    ): Promise<ExpenseCategoryTotal[]> {
        const results = await db
            .select({
                category: expensesTable.category,
                total: sql<string>`SUM(${expensesTable.amount})::text`,
                count: sql<number>`COUNT(*)::int`,
            })
            .from(expensesTable)
            .where(
                and(
                    gte(expensesTable.recordedAt, from),
                    lte(expensesTable.recordedAt, to),
                ),
            )
            .groupBy(expensesTable.category)
            .orderBy(sql`SUM(${expensesTable.amount}) DESC`);

        return results;
    }

    async getSummary(from: Date, to: Date): Promise<AnalyticsSummary> {
        const [revenueResult] = await db
            .select({
                total: sql<string>`COALESCE(SUM(${ordersTable.total}), 0)::text`,
                count: sql<number>`COUNT(*)::int`,
            })
            .from(ordersTable)
            .where(
                and(
                    eq(ordersTable.status, "completed"),
                    gte(ordersTable.createdAt, from),
                    lte(ordersTable.createdAt, to),
                ),
            );

        const [expenseResult] = await db
            .select({
                total: sql<string>`COALESCE(SUM(${expensesTable.amount}), 0)::text`,
            })
            .from(expensesTable)
            .where(
                and(
                    gte(expensesTable.recordedAt, from),
                    lte(expensesTable.recordedAt, to),
                ),
            );

        const totalRevenue = parseFloat(revenueResult.total);
        const totalExpenses = parseFloat(expenseResult.total);
        const orderCount = revenueResult.count;
        const netIncome = totalRevenue - totalExpenses;
        const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

        return {
            totalRevenue: totalRevenue.toFixed(2),
            totalExpenses: totalExpenses.toFixed(2),
            netIncome: netIncome.toFixed(2),
            orderCount,
            averageOrderValue: avgOrderValue.toFixed(2),
        };
    }
}

export const analyticsRepository = new AnalyticsRepository();
