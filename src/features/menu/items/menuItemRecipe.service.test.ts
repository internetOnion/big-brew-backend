import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("./itemRecipe.repository.ts");
vi.mock("../../ingredients/ingredient.respository.ts");

import { menuItemRecipeService } from "./menuItemRecipe.service.ts";
import { itemRecipeRepository } from "./itemRecipe.repository.ts";
import { ingredientRepository } from "../../ingredients/ingredient.respository.ts";

const mockRecipeRepo = vi.mocked(itemRecipeRepository);
const mockIngredientRepo = vi.mocked(ingredientRepository);

const makeItemRecipe = (overrides = {}) => ({
    id: "ir-1",
    itemId: "mi-1",
    ingredientId: "ing-1",
    quantity: "2.00",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

const makeIngredient = (overrides = {}) => ({
    id: "ing-1",
    name: "Coffee Beans",
    unit: "g" as const,
    stockQuantity: "100.00",
    lowStockThreshold: "10.00",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

describe("MenuItemRecipeService", () => {
    beforeEach(() => vi.resetAllMocks());

    describe("getRecipes", () => {
        it("returns recipes for menu item", async () => {
            mockRecipeRepo.findByItemId.mockResolvedValue([makeItemRecipe()]);

            const result = await menuItemRecipeService.getRecipes("mi-1");

            expect(result).toHaveLength(1);
            expect(mockRecipeRepo.findByItemId).toHaveBeenCalledWith("mi-1");
        });
    });

    describe("addRecipes", () => {
        it("inserts recipes after validating ingredients", async () => {
            mockIngredientRepo.findById.mockResolvedValue(makeIngredient());
            mockRecipeRepo.insertMany.mockResolvedValue([makeItemRecipe()]);

            const result = await menuItemRecipeService.addRecipes("mi-1", [
                { ingredientId: "ing-1", quantity: "2.00" },
            ]);

            expect(result).toHaveLength(1);
            expect(mockIngredientRepo.findById).toHaveBeenCalledWith("ing-1");
            expect(mockRecipeRepo.insertMany).toHaveBeenCalledWith([
                { itemId: "mi-1", ingredientId: "ing-1", quantity: "2.00" },
            ]);
        });

        it("throws badRequest when ingredient missing", async () => {
            mockIngredientRepo.findById.mockResolvedValue(null);

            await expect(
                menuItemRecipeService.addRecipes("mi-1", [
                    { ingredientId: "missing", quantity: "1.00" },
                ]),
            ).rejects.toThrow("Ingredient not found: missing");
        });
    });

    describe("updateRecipe", () => {
        it("updates recipe when found", async () => {
            mockRecipeRepo.findByItemIdAndIngredientId.mockResolvedValue(
                makeItemRecipe(),
            );
            mockRecipeRepo.update.mockResolvedValue(
                makeItemRecipe({ quantity: "3.00" }),
            );

            const result = await menuItemRecipeService.updateRecipe(
                "mi-1",
                "ing-1",
                { quantity: "3.00" },
            );

            expect(result.quantity).toBe("3.00");
        });

        it("throws notFound when recipe missing", async () => {
            mockRecipeRepo.findByItemIdAndIngredientId.mockResolvedValue(null);

            await expect(
                menuItemRecipeService.updateRecipe("mi-1", "ing-1", {
                    quantity: "3.00",
                }),
            ).rejects.toThrow("Recipe not found for ingredient: ing-1");
        });
    });

    describe("deleteRecipe", () => {
        it("deletes recipe when found", async () => {
            mockRecipeRepo.findByItemIdAndIngredientId.mockResolvedValue(
                makeItemRecipe(),
            );
            mockRecipeRepo.delete.mockResolvedValue(undefined);

            await menuItemRecipeService.deleteRecipe("mi-1", "ing-1");

            expect(mockRecipeRepo.delete).toHaveBeenCalledWith("ir-1");
        });

        it("throws notFound when recipe missing", async () => {
            mockRecipeRepo.findByItemIdAndIngredientId.mockResolvedValue(null);

            await expect(
                menuItemRecipeService.deleteRecipe("mi-1", "ing-1"),
            ).rejects.toThrow("Recipe not found for ingredient: ing-1");
        });
    });
});
