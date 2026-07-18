import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("./expense.repository.ts");

import { expenseService } from "./expense.service.ts";
import { expenseRepository } from "./expense.repository.ts";

const mockRepo = vi.mocked(expenseRepository);

const makeExpense = (overrides = {}) => ({
    id: "exp-1",
    description: "Coffee beans",
    amount: "50.00",
    category: "Ingredients",
    recordedBy: "emp-1",
    recordedByName: "Alice",
    recordedAt: new Date(),
    createdAt: new Date(),
    ...overrides,
});

describe("ExpenseService", () => {
    beforeEach(() => vi.resetAllMocks());

    describe("listExpenses", () => {
        it("returns paginated expenses", async () => {
            mockRepo.findAll.mockResolvedValue({
                data: [makeExpense()],
                total: 1,
                page: 1,
                limit: 20,
            });

            const result = await expenseService.listExpenses({});

            expect(result.data).toHaveLength(1);
            expect(result.total).toBe(1);
        });
    });

    describe("getExpense", () => {
        it("returns expense when found", async () => {
            mockRepo.findById.mockResolvedValue(makeExpense());

            const result = await expenseService.getExpense("exp-1");

            expect(result.id).toBe("exp-1");
        });

        it("throws notFound when missing", async () => {
            mockRepo.findById.mockResolvedValue(null);

            await expect(expenseService.getExpense("missing")).rejects.toThrow(
                "Expense not found",
            );
        });
    });

    describe("createExpense", () => {
        it("creates expense with valid category", async () => {
            mockRepo.insert.mockResolvedValue(makeExpense());

            const result = await expenseService.createExpense({
                description: "Coffee beans",
                amount: 50,
                category: "Ingredients",
                recordedBy: "emp-1",
            });

            expect(result.description).toBe("Coffee beans");
            expect(mockRepo.insert).toHaveBeenCalledWith(
                expect.objectContaining({
                    description: "Coffee beans",
                    amount: "50.00",
                    category: "Ingredients",
                    recordedBy: "emp-1",
                }),
            );
        });

        it("throws badRequest for invalid category", async () => {
            await expect(
                expenseService.createExpense({
                    description: "Test",
                    amount: 10,
                    category: "Invalid" as any,
                    recordedBy: "emp-1",
                }),
            ).rejects.toThrow("Invalid category");
        });
    });

    describe("updateExpense", () => {
        it("updates when id exists", async () => {
            mockRepo.findById.mockResolvedValue(makeExpense());
            mockRepo.update.mockResolvedValue(
                makeExpense({ description: "Updated", amount: "75.00" }),
            );

            const result = await expenseService.updateExpense("exp-1", {
                description: "Updated",
                amount: 75,
            });

            expect(result.description).toBe("Updated");
        });

        it("throws notFound when missing", async () => {
            mockRepo.findById.mockResolvedValue(null);

            await expect(
                expenseService.updateExpense("missing", { description: "X" }),
            ).rejects.toThrow("Expense not found");
        });

        it("throws badRequest for invalid category", async () => {
            mockRepo.findById.mockResolvedValue(makeExpense());

            await expect(
                expenseService.updateExpense("exp-1", {
                    category: "Invalid" as any,
                }),
            ).rejects.toThrow("Invalid category");
        });
    });

    describe("deleteExpense", () => {
        it("deletes when id exists", async () => {
            mockRepo.findById.mockResolvedValue(makeExpense());
            mockRepo.delete.mockResolvedValue(undefined);

            await expenseService.deleteExpense("exp-1");

            expect(mockRepo.delete).toHaveBeenCalledWith("exp-1");
        });

        it("throws notFound when missing", async () => {
            mockRepo.findById.mockResolvedValue(null);

            await expect(
                expenseService.deleteExpense("missing"),
            ).rejects.toThrow("Expense not found");
        });
    });

    describe("getExpenseSummary", () => {
        it("returns total and byCategory", async () => {
            mockRepo.getSummary.mockResolvedValue([
                { category: "Ingredients", total: "100.00", count: 2 },
                { category: "Supplies", total: "50.00", count: 1 },
            ]);

            const result = await expenseService.getExpenseSummary(
                new Date("2024-01-01"),
                new Date("2024-12-31"),
            );

            expect(result.total).toBe("150.00");
            expect(result.byCategory).toHaveLength(2);
        });
    });
});
