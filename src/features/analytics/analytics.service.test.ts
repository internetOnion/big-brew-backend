import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("./analytics.repository.ts");

import { analyticsService } from "./analytics.service.ts";
import { analyticsRepository } from "./analytics.repository.ts";

const mockRepo = vi.mocked(analyticsRepository);

const makeRevenuePoint = (overrides = {}) => ({
    period: "2025-01-01",
    revenue: "100.00",
    orderCount: 5,
    ...overrides,
});

const makeTopItem = (overrides = {}) => ({
    menuItemId: "mi-1",
    name: "Latte",
    quantity: 10,
    revenue: "50.00",
    ...overrides,
});

const makeExpenseCategoryTotal = (overrides = {}) => ({
    category: "Supplies",
    total: "25.00",
    count: 3,
    ...overrides,
});

const makeSummary = (overrides = {}) => ({
    totalRevenue: "500.00",
    totalExpenses: "100.00",
    netIncome: "400.00",
    orderCount: 20,
    averageOrderValue: "25.00",
    ...overrides,
});

const from = new Date("2025-01-01");
const to = new Date("2025-01-31");

describe("AnalyticsService", () => {
    beforeEach(() => vi.resetAllMocks());

    describe("getRevenue", () => {
        it("returns revenue data points", async () => {
            mockRepo.getRevenueOverTime.mockResolvedValue([makeRevenuePoint()]);

            const result = await analyticsService.getRevenue(from, to, "day");

            expect(result).toHaveLength(1);
            expect(mockRepo.getRevenueOverTime).toHaveBeenCalledWith(
                from,
                to,
                "day",
            );
        });

        it("throws badRequest when from >= to", async () => {
            await expect(
                analyticsService.getRevenue(to, from, "day"),
            ).rejects.toThrow("'from' must be before 'to'");
        });
    });

    describe("getTopItems", () => {
        it("returns top items", async () => {
            mockRepo.getTopItems.mockResolvedValue([makeTopItem()]);

            const result = await analyticsService.getTopItems(
                from,
                to,
                "quantity",
                10,
            );

            expect(result).toHaveLength(1);
            expect(mockRepo.getTopItems).toHaveBeenCalledWith(
                from,
                to,
                "quantity",
                10,
            );
        });

        it("throws badRequest when from >= to", async () => {
            await expect(
                analyticsService.getTopItems(to, from, "revenue", 5),
            ).rejects.toThrow("'from' must be before 'to'");
        });
    });

    describe("getExpenseBreakdown", () => {
        it("returns expense breakdown", async () => {
            mockRepo.getExpenseBreakdown.mockResolvedValue([
                makeExpenseCategoryTotal(),
            ]);

            const result = await analyticsService.getExpenseBreakdown(from, to);

            expect(result).toHaveLength(1);
        });

        it("throws badRequest when from >= to", async () => {
            await expect(
                analyticsService.getExpenseBreakdown(to, from),
            ).rejects.toThrow("'from' must be before 'to'");
        });
    });

    describe("getSummary", () => {
        it("returns summary", async () => {
            mockRepo.getSummary.mockResolvedValue(makeSummary());

            const result = await analyticsService.getSummary(from, to);

            expect(result.totalRevenue).toBe("500.00");
        });

        it("throws badRequest when from >= to", async () => {
            await expect(analyticsService.getSummary(to, from)).rejects.toThrow(
                "'from' must be before 'to'",
            );
        });
    });
});
