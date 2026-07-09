import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("./itemRecipe.repository.ts");

import { itemRecipeService } from "./itemRecipe.service.ts";
import { itemRecipeRepository } from "./itemRecipe.repository.ts";

const mockRepo = vi.mocked(itemRecipeRepository);

const makeItemRecipe = (overrides = {}) => ({
    id: "ir-1",
    itemId: "mi-1",
    ingredientId: "ing-1",
    quantity: "2.00",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

describe("ItemRecipeService", () => {
    beforeEach(() => vi.resetAllMocks());

    describe("addItemRecipe", () => {
        it("inserts and returns item recipe", async () => {
            mockRepo.insert.mockResolvedValue(makeItemRecipe());

            const result = await itemRecipeService.addItemRecipe({
                itemId: "mi-1",
                ingredientId: "ing-1",
                quantity: "2.00",
            });

            expect(result.id).toBe("ir-1");
            expect(mockRepo.insert).toHaveBeenCalledWith({
                itemId: "mi-1",
                ingredientId: "ing-1",
                quantity: "2.00",
            });
        });

        it("wraps errors as internal", async () => {
            mockRepo.insert.mockRejectedValue(new Error("db fail"));

            await expect(
                itemRecipeService.addItemRecipe({
                    itemId: "mi-1",
                    ingredientId: "ing-1",
                    quantity: "2.00",
                }),
            ).rejects.toThrow("Failed to add item recipe");
        });
    });

    describe("deleteItemRecipe", () => {
        it("deletes item recipe", async () => {
            mockRepo.delete.mockResolvedValue(undefined);

            await itemRecipeService.deleteItemRecipe("ir-1");

            expect(mockRepo.delete).toHaveBeenCalledWith("ir-1");
        });

        it("wraps errors as internal", async () => {
            mockRepo.delete.mockRejectedValue(new Error("db fail"));

            await expect(
                itemRecipeService.deleteItemRecipe("ir-1"),
            ).rejects.toThrow("Failed to delete item recipe");
        });
    });
});
