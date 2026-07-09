import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("./ingredient.respository.ts");
vi.mock("../../shared/models/index.ts", () => ({
    db: { transaction: vi.fn() },
    pool: {},
}));

import { ingredientService } from "./ingredient.service.ts";
import { ingredientRepository } from "./ingredient.respository.ts";
import { db } from "../../shared/models/index.ts";

const mockRepo = vi.mocked(ingredientRepository);
const mockDb = vi.mocked(db);

const makeIngredient = (overrides = {}) => ({
    id: "ing-1",
    name: "Coffee Beans",
    unit: "g" as const,
    stockQuantity: "10.00",
    lowStockThreshold: "2.00",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

describe("IngredientService", () => {
    beforeEach(() => vi.resetAllMocks());

    describe("getIngredient", () => {
        it("returns formatted ingredients", async () => {
            mockRepo.findAll.mockResolvedValue([makeIngredient()]);

            const result = await ingredientService.getIngredient();

            expect(result).toHaveLength(1);
            expect(result[0]).not.toHaveProperty("createdAt");
            expect(result[0].name).toBe("Coffee Beans");
        });

        it("wraps errors as internal", async () => {
            mockRepo.findAll.mockRejectedValue(new Error("db fail"));

            await expect(ingredientService.getIngredient()).rejects.toThrow(
                "Failed to fetch ingredients",
            );
        });
    });

    describe("addIngredient", () => {
        it("inserts and returns formatted ingredient", async () => {
            mockRepo.insert.mockResolvedValue(makeIngredient());

            const result = await ingredientService.addIngredient({
                name: "Coffee Beans",
                unit: "g",
                stockQuantity: "10.00",
                lowStockThreshold: "2.00",
            });

            expect(result.name).toBe("Coffee Beans");
        });

        it("wraps errors as internal", async () => {
            mockRepo.insert.mockRejectedValue(new Error("db fail"));

            await expect(
                ingredientService.addIngredient({
                    name: "X",
                    unit: "g",
                    stockQuantity: "0",
                    lowStockThreshold: "0",
                }),
            ).rejects.toThrow("Failed to add ingredient");
        });
    });

    describe("updateIngredient", () => {
        it("updates when id exists", async () => {
            mockRepo.findById.mockResolvedValue(makeIngredient());
            mockRepo.update.mockResolvedValue(
                makeIngredient({ name: "Updated" }),
            );

            const result = await ingredientService.updateIngredient("ing-1", {
                name: "Updated",
            });

            expect(result.name).toBe("Updated");
        });

        it("throws notFound when missing", async () => {
            mockRepo.findById.mockResolvedValue(null);

            await expect(
                ingredientService.updateIngredient("missing", { name: "X" }),
            ).rejects.toThrow("Ingredient not found");
        });

        it("wraps unknown errors as internal", async () => {
            mockRepo.findById.mockRejectedValue(new Error("unexpected"));

            await expect(
                ingredientService.updateIngredient("ing-1", { name: "X" }),
            ).rejects.toThrow("Failed to update ingredient");
        });
    });

    describe("deleteIngredient", () => {
        it("deletes when id exists", async () => {
            mockRepo.findById.mockResolvedValue(makeIngredient());
            mockRepo.delete.mockResolvedValue(undefined);

            await ingredientService.deleteIngredient("ing-1");

            expect(mockRepo.delete).toHaveBeenCalledWith("ing-1");
        });

        it("throws notFound when missing", async () => {
            mockRepo.findById.mockResolvedValue(null);

            await expect(
                ingredientService.deleteIngredient("missing"),
            ).rejects.toThrow("Ingredient not found");
        });

        it("wraps unknown errors as internal", async () => {
            mockRepo.findById.mockRejectedValue(new Error("unexpected"));

            await expect(
                ingredientService.deleteIngredient("ing-1"),
            ).rejects.toThrow("Failed to delete ingredient");
        });
    });

    describe("adjustStock", () => {
        it("adjusts stock and returns updated ingredient", async () => {
            mockRepo.findById.mockResolvedValueOnce(
                makeIngredient({ stockQuantity: "10.00" }),
            );
            mockDb.transaction.mockImplementation(async (cb: any) => {
                const tx = {
                    insert: vi.fn().mockReturnValue({ values: vi.fn() }),
                    update: vi.fn().mockReturnValue({
                        set: vi.fn().mockReturnValue({
                            where: vi.fn(),
                        }),
                    }),
                };
                await cb(tx);
            });
            mockRepo.findById.mockResolvedValueOnce(
                makeIngredient({ stockQuantity: "8.00" }),
            );

            const result = await ingredientService.adjustStock(
                "ing-1",
                -2,
                "manual_adjustment",
                undefined,
                "emp-1",
            );

            expect(result.stockQuantity).toBe("8.00");
        });

        it("throws notFound when ingredient missing", async () => {
            mockRepo.findById.mockResolvedValue(null);

            await expect(
                ingredientService.adjustStock(
                    "missing",
                    1,
                    "manual_adjustment",
                    undefined,
                    "emp-1",
                ),
            ).rejects.toThrow("Ingredient not found");
        });

        it("throws badRequest when stock would go negative", async () => {
            mockRepo.findById.mockResolvedValue(
                makeIngredient({ stockQuantity: "1.00" }),
            );

            await expect(
                ingredientService.adjustStock(
                    "ing-1",
                    -5,
                    "manual_adjustment",
                    undefined,
                    "emp-1",
                ),
            ).rejects.toThrow("Insufficient stock");
        });
    });
});
