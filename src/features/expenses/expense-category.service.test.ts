import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("./expense-category.repository.ts");

import { expenseCategoryService } from "./expense-category.service.ts";
import { expenseCategoryRepository } from "./expense-category.repository.ts";

const mockRepo = vi.mocked(expenseCategoryRepository);

const makeCategory = (overrides = {}) => ({
    id: "ec-1",
    name: "Supplies",
    createdAt: new Date(),
    ...overrides,
});

describe("ExpenseCategoryService", () => {
    beforeEach(() => vi.resetAllMocks());

    describe("listCategories", () => {
        it("returns all categories", async () => {
            mockRepo.findAll.mockResolvedValue([
                makeCategory(),
                makeCategory({ id: "ec-2", name: "Utilities" }),
            ]);

            const result = await expenseCategoryService.listCategories();

            expect(result).toHaveLength(2);
        });
    });

    describe("getCategory", () => {
        it("returns category when found", async () => {
            mockRepo.findById.mockResolvedValue(makeCategory());

            const result = await expenseCategoryService.getCategory("ec-1");

            expect(result.id).toBe("ec-1");
        });

        it("throws notFound when missing", async () => {
            mockRepo.findById.mockResolvedValue(null);

            await expect(
                expenseCategoryService.getCategory("missing"),
            ).rejects.toThrow("Expense category not found");
        });
    });

    describe("createCategory", () => {
        it("creates category when name is unique", async () => {
            mockRepo.findByName.mockResolvedValue(null);
            mockRepo.insert.mockResolvedValue(makeCategory());

            const result =
                await expenseCategoryService.createCategory("Supplies");

            expect(result.name).toBe("Supplies");
            expect(mockRepo.insert).toHaveBeenCalledWith("Supplies");
        });

        it("throws badRequest for empty name", async () => {
            await expect(
                expenseCategoryService.createCategory("   "),
            ).rejects.toThrow("Name is required");
        });

        it("throws conflict when name exists", async () => {
            mockRepo.findByName.mockResolvedValue(makeCategory());

            await expect(
                expenseCategoryService.createCategory("Supplies"),
            ).rejects.toThrow("already exists");
        });
    });

    describe("updateCategory", () => {
        it("updates when id exists and name is unique", async () => {
            mockRepo.findById.mockResolvedValue(makeCategory());
            mockRepo.findByName.mockResolvedValue(null);
            mockRepo.update.mockResolvedValue(
                makeCategory({ name: "Updated" }),
            );

            const result = await expenseCategoryService.updateCategory(
                "ec-1",
                "Updated",
            );

            expect(result.name).toBe("Updated");
        });

        it("throws badRequest for empty name", async () => {
            await expect(
                expenseCategoryService.updateCategory("ec-1", "   "),
            ).rejects.toThrow("Name is required");
        });

        it("throws notFound when missing", async () => {
            mockRepo.findById.mockResolvedValue(null);

            await expect(
                expenseCategoryService.updateCategory("missing", "Name"),
            ).rejects.toThrow("Expense category not found");
        });

        it("throws conflict when duplicate name belongs to different id", async () => {
            mockRepo.findById.mockResolvedValue(makeCategory());
            mockRepo.findByName.mockResolvedValue(makeCategory({ id: "ec-2" }));

            await expect(
                expenseCategoryService.updateCategory("ec-1", "Supplies"),
            ).rejects.toThrow("already exists");
        });

        it("allows updating when duplicate name is same id", async () => {
            mockRepo.findById.mockResolvedValue(makeCategory());
            mockRepo.findByName.mockResolvedValue(makeCategory({ id: "ec-1" }));
            mockRepo.update.mockResolvedValue(
                makeCategory({ name: "Supplies" }),
            );

            const result = await expenseCategoryService.updateCategory(
                "ec-1",
                "Supplies",
            );

            expect(result.name).toBe("Supplies");
        });
    });

    describe("deleteCategory", () => {
        it("deletes when id exists", async () => {
            mockRepo.findById.mockResolvedValue(makeCategory());
            mockRepo.delete.mockResolvedValue(undefined);

            await expenseCategoryService.deleteCategory("ec-1");

            expect(mockRepo.delete).toHaveBeenCalledWith("ec-1");
        });

        it("throws notFound when missing", async () => {
            mockRepo.findById.mockResolvedValue(null);

            await expect(
                expenseCategoryService.deleteCategory("missing"),
            ).rejects.toThrow("Expense category not found");
        });
    });
});
