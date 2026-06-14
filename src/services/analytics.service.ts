import {
    analyticsRepository,
    type GroupBy,
    type RevenueDataPoint,
    type TopItem,
    type ExpenseCategoryTotal,
    type AnalyticsSummary,
} from "../repositories/analytics.repository.ts";
import { AppError } from "../utils/AppError.ts";

export class AnalyticsService {
    async getRevenue(
        from: Date,
        to: Date,
        groupBy: GroupBy,
    ): Promise<RevenueDataPoint[]> {
        this.validateDateRange(from, to);
        return analyticsRepository.getRevenueOverTime(from, to, groupBy);
    }

    async getTopItems(
        from: Date,
        to: Date,
        sortBy: "quantity" | "revenue",
        limit: number,
    ): Promise<TopItem[]> {
        this.validateDateRange(from, to);
        return analyticsRepository.getTopItems(from, to, sortBy, limit);
    }

    async getExpenseBreakdown(
        from: Date,
        to: Date,
    ): Promise<ExpenseCategoryTotal[]> {
        this.validateDateRange(from, to);
        return analyticsRepository.getExpenseBreakdown(from, to);
    }

    async getSummary(from: Date, to: Date): Promise<AnalyticsSummary> {
        this.validateDateRange(from, to);
        return analyticsRepository.getSummary(from, to);
    }

    private validateDateRange(from: Date, to: Date): void {
        if (from >= to) {
            throw AppError.badRequest("'from' must be before 'to'");
        }
    }
}

export const analyticsService = new AnalyticsService();
