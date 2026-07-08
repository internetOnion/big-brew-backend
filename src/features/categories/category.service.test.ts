import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("./category.repository.ts");

import { categoryService } from "./category.service.ts";
import { categoryRepository } from "./category.repository.ts";
import { AppError } from "../../shared/utils/AppError.ts";

const mockRepo = vi.mocked(categoryRepository);

const makeCategory = (overrides = {}) => ({
    id: "cat-1",
    name: "Coffee",
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
});

describe("CategoryService", () => {
    beforeEach(() => vi.resetAllMocks());

    describe("getCategories", () => {
        it("returns sorted and formatted categories", async () => {
            mockRepo.findAll.mockResolvedValue([
                makeCategory({ sortOrder: 2 }),
                makeCategory({ id: "cat-2", name: "Tea", sortOrder: 1 }),
            ]);

            const result = await categoryService.getCategories();

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe("Tea");
            expect(result[1].name).toBe("Coffee");
            expect(result[0]).not.toHaveProperty("createdAt");
        });

        it("rethrows AppError", async () => {
            mockRepo.findAll.mockRejectedValue(AppError.internal("db down"));

            await expect(categoryService.getCategories()).rejects.toThrow(
                "db down",
            );
        });

        it("wraps unknown errors as internal", async () => {
            mockRepo.findAll.mockRejectedValue(new Error("unexpected"));

            await expect(categoryService.getCategories()).rejects.toThrow(
                "Failed to fetch categories",
            );
        });
    });

    describe("addCategory", () => {
        it("creates category when name is unique", async () => {
            mockRepo.findByName.mockResolvedValue(null);
            mockRepo.insert.mockResolvedValue(makeCategory());

            const result = await categoryService.addCategory({
                name: "Coffee",
                sortOrder: 1,
            });

            expect(result.name).toBe("Coffee");
            expect(mockRepo.insert).toHaveBeenCalledWith({
                name: "Coffee",
                sortOrder: 1,
            });
        });

        it("throws conflict when name exists", async () => {
            mockRepo.findByName.mockResolvedValue(makeCategory());

            await expect(
                categoryService.addCategory({ name: "Coffee", sortOrder: 1 }),
            ).rejects.toThrow("already exists");
        });

        it("wraps unknown errors as internal", async () => {
            mockRepo.findByName.mockRejectedValue(new Error("unexpected"));

            await expect(
                categoryService.addCategory({ name: "Coffee", sortOrder: 1 }),
            ).rejects.toThrow("Failed to add category");
        });
    });

    describe("updateCategory", () => {
        it("updates when id exists", async () => {
            mockRepo.findById.mockResolvedValue(makeCategory());
            mockRepo.update.mockResolvedValue(
                makeCategory({ name: "Espresso" }),
            );

            const result = await categoryService.updateCategory("cat-1", {
                name: "Espresso",
            });

            expect(result.name).toBe("Espresso");
            expect(mockRepo.update).toHaveBeenCalledWith("cat-1", {
                name: "Espresso",
            });
        });

        it("throws notFound when id is missing", async () => {
            mockRepo.findById.mockResolvedValue(null);

            await expect(
                categoryService.updateCategory("missing", { name: "X" }),
            ).rejects.toThrow("Category not found");
        });

        it("wraps unknown errors as internal", async () => {
            mockRepo.findById.mockRejectedValue(new Error("unexpected"));

            await expect(
                categoryService.updateCategory("cat-1", { name: "X" }),
            ).rejects.toThrow("Failed to update category");
        });
    });

    describe("deleteCategory", () => {
        it("deletes when id exists", async () => {
            mockRepo.findById.mockResolvedValue(makeCategory());
            mockRepo.delete.mockResolvedValue(undefined);

            await categoryService.deleteCategory("cat-1");

            expect(mockRepo.delete).toHaveBeenCalledWith("cat-1");
        });

        it("throws notFound when id is missing", async () => {
            mockRepo.findById.mockResolvedValue(null);

            await expect(
                categoryService.deleteCategory("missing"),
            ).rejects.toThrow("Category not found");
        });

        it("wraps unknown errors as internal", async () => {
            mockRepo.findById.mockRejectedValue(new Error("unexpected"));

            await expect(
                categoryService.deleteCategory("cat-1"),
            ).rejects.toThrow("Failed to delete category");
        });
    });
});
