import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("../modifiers/modifierGroup.repository.ts");
vi.mock("../modifiers/modifierOption.repository.ts");
vi.mock("../modifiers/modifierOptionIngredient.repository.ts");
vi.mock("./menuItem.repository.ts");
vi.mock("../../ingredients/ingredient.repository.ts");

import { menuItemModifierGroupService } from "./menuItemModifierGroup.service.ts";
import { modifierGroupRepository } from "../modifiers/modifierGroup.repository.ts";
import { modifierOptionRepository } from "../modifiers/modifierOption.repository.ts";
import { modifierOptionIngredientRepository } from "../modifiers/modifierOptionIngredient.repository.ts";
import { menuItemRepository } from "./menuItem.repository.ts";
import { ingredientRepository } from "../../ingredients/ingredient.repository.ts";

const mockGroupRepo = vi.mocked(modifierGroupRepository);
const mockOptionRepo = vi.mocked(modifierOptionRepository);
const mockIngredientRepo = vi.mocked(modifierOptionIngredientRepository);
const mockMenuItemRepo = vi.mocked(menuItemRepository);
const mockIngRepo = vi.mocked(ingredientRepository);

const makeMenuItem = (overrides = {}) => ({
    id: "mi-1",
    name: "Latte",
    basePrice: "5.00",
    categoryId: "cat-1",
    isAvailable: true,
    imageUrl: null,
    imagePath: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
});

const makeGroup = (overrides = {}) => ({
    id: "mg-1",
    name: "Size",
    menuItemId: "mi-1",
    selectionType: "single" as const,
    isRequired: true,
    defaultOptionId: null,
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
});

const makeOption = (overrides = {}) => ({
    id: "mo-1",
    modifierGroupId: "mg-1",
    name: "Large",
    price: "1.00",
    isAvailable: true,
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
});

const makeOptionIngredient = (overrides = {}) => ({
    id: "moi-1",
    modifierOptionId: "mo-1",
    ingredientId: "ing-1",
    quantity: "0.05",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

const makeIngredient = (overrides = {}) => ({
    id: "ing-1",
    name: "Milk",
    unit: "ml" as const,
    stockQuantity: "1000.00",
    lowStockThreshold: "100.00",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

describe("MenuItemModifierGroupService", () => {
    beforeEach(() => vi.resetAllMocks());

    describe("getGroups", () => {
        it("returns groups for menu item", async () => {
            mockGroupRepo.findByMenuItemId.mockResolvedValue([makeGroup()]);

            const result = await menuItemModifierGroupService.getGroups("mi-1");

            expect(result).toHaveLength(1);
        });
    });

    describe("addGroup", () => {
        it("adds group when menu item exists", async () => {
            mockMenuItemRepo.findById.mockResolvedValue(makeMenuItem());
            mockGroupRepo.insert.mockResolvedValue(makeGroup());

            const result = await menuItemModifierGroupService.addGroup("mi-1", {
                name: "Size",
                selectionType: "single",
                isRequired: true,
            });

            expect(result.name).toBe("Size");
        });

        it("throws notFound when menu item missing", async () => {
            mockMenuItemRepo.findById.mockResolvedValue(null);

            await expect(
                menuItemModifierGroupService.addGroup("missing", {
                    name: "X",
                    selectionType: "single",
                    isRequired: false,
                }),
            ).rejects.toThrow("Menu item not found");
        });
    });

    describe("updateGroup", () => {
        it("updates when group belongs to menu item", async () => {
            mockGroupRepo.findById.mockResolvedValue(makeGroup());
            mockGroupRepo.update.mockResolvedValue(
                makeGroup({ name: "Updated" }),
            );

            const result = await menuItemModifierGroupService.updateGroup(
                "mi-1",
                "mg-1",
                { name: "Updated" },
            );

            expect(result.name).toBe("Updated");
        });

        it("throws notFound when group missing", async () => {
            mockGroupRepo.findById.mockResolvedValue(null);

            await expect(
                menuItemModifierGroupService.updateGroup("mi-1", "missing", {
                    name: "X",
                }),
            ).rejects.toThrow("Modifier group not found for this menu item");
        });

        it("throws notFound when group belongs to different menu item", async () => {
            mockGroupRepo.findById.mockResolvedValue(
                makeGroup({ menuItemId: "mi-other" }),
            );

            await expect(
                menuItemModifierGroupService.updateGroup("mi-1", "mg-1", {
                    name: "X",
                }),
            ).rejects.toThrow("Modifier group not found for this menu item");
        });
    });

    describe("deleteGroup", () => {
        it("deletes when group belongs to menu item", async () => {
            mockGroupRepo.findById.mockResolvedValue(makeGroup());
            mockGroupRepo.delete.mockResolvedValue(undefined);

            await menuItemModifierGroupService.deleteGroup("mi-1", "mg-1");

            expect(mockGroupRepo.delete).toHaveBeenCalledWith("mg-1");
        });

        it("throws notFound when group missing", async () => {
            mockGroupRepo.findById.mockResolvedValue(null);

            await expect(
                menuItemModifierGroupService.deleteGroup("mi-1", "missing"),
            ).rejects.toThrow("Modifier group not found for this menu item");
        });
    });

    describe("getOptions", () => {
        it("returns options for group", async () => {
            mockOptionRepo.findByModifierGroupId.mockResolvedValue([
                makeOption(),
            ]);

            const result =
                await menuItemModifierGroupService.getOptions("mg-1");

            expect(result).toHaveLength(1);
        });
    });

    describe("addOption", () => {
        it("adds option when group belongs to menu item", async () => {
            mockGroupRepo.findById.mockResolvedValue(makeGroup());
            mockOptionRepo.insert.mockResolvedValue(makeOption());

            const result = await menuItemModifierGroupService.addOption(
                "mi-1",
                "mg-1",
                {
                    name: "Large",
                    price: "1.00",
                    isAvailable: true,
                    sortOrder: 1,
                    modifierGroupId: "mg-1",
                },
            );

            expect(result.name).toBe("Large");
        });

        it("throws notFound when group missing", async () => {
            mockGroupRepo.findById.mockResolvedValue(null);

            await expect(
                menuItemModifierGroupService.addOption("mi-1", "missing", {
                    name: "X",
                    price: "0",
                    isAvailable: true,
                    sortOrder: 1,
                    modifierGroupId: "mg-1",
                }),
            ).rejects.toThrow("Modifier group not found for this menu item");
        });
    });

    describe("updateOption", () => {
        it("updates when group and option belong together", async () => {
            mockGroupRepo.findById.mockResolvedValue(makeGroup());
            mockOptionRepo.findById.mockResolvedValue(makeOption());
            mockOptionRepo.update.mockResolvedValue(
                makeOption({ name: "Updated" }),
            );

            const result = await menuItemModifierGroupService.updateOption(
                "mi-1",
                "mg-1",
                "mo-1",
                { name: "Updated" },
            );

            expect(result.name).toBe("Updated");
        });

        it("throws notFound when group missing", async () => {
            mockGroupRepo.findById.mockResolvedValue(null);

            await expect(
                menuItemModifierGroupService.updateOption(
                    "mi-1",
                    "missing",
                    "mo-1",
                    { name: "X" },
                ),
            ).rejects.toThrow("Modifier group not found for this menu item");
        });

        it("throws notFound when option missing", async () => {
            mockGroupRepo.findById.mockResolvedValue(makeGroup());
            mockOptionRepo.findById.mockResolvedValue(null);

            await expect(
                menuItemModifierGroupService.updateOption(
                    "mi-1",
                    "mg-1",
                    "missing",
                    { name: "X" },
                ),
            ).rejects.toThrow("Modifier option not found for this group");
        });

        it("throws notFound when option belongs to different group", async () => {
            mockGroupRepo.findById.mockResolvedValue(makeGroup());
            mockOptionRepo.findById.mockResolvedValue(
                makeOption({ modifierGroupId: "mg-other" }),
            );

            await expect(
                menuItemModifierGroupService.updateOption(
                    "mi-1",
                    "mg-1",
                    "mo-1",
                    { name: "X" },
                ),
            ).rejects.toThrow("Modifier option not found for this group");
        });
    });

    describe("deleteOption", () => {
        it("deletes when group and option belong together", async () => {
            mockGroupRepo.findById.mockResolvedValue(makeGroup());
            mockOptionRepo.findById.mockResolvedValue(makeOption());
            mockOptionRepo.delete.mockResolvedValue(undefined);

            await menuItemModifierGroupService.deleteOption(
                "mi-1",
                "mg-1",
                "mo-1",
            );

            expect(mockOptionRepo.delete).toHaveBeenCalledWith("mo-1");
        });

        it("throws notFound when group missing", async () => {
            mockGroupRepo.findById.mockResolvedValue(null);

            await expect(
                menuItemModifierGroupService.addOption("mi-1", "missing", {
                    name: "X",
                    price: "0",
                    isAvailable: true,
                    sortOrder: 1,
                    modifierGroupId: "mg-1",
                }),
            ).rejects.toThrow("Modifier group not found for this menu item");
        });

        it("throws notFound when option missing", async () => {
            mockGroupRepo.findById.mockResolvedValue(makeGroup());
            mockOptionRepo.findById.mockResolvedValue(null);

            await expect(
                menuItemModifierGroupService.deleteOption(
                    "mi-1",
                    "mg-1",
                    "missing",
                ),
            ).rejects.toThrow("Modifier option not found for this group");
        });
    });

    describe("getOptionIngredients", () => {
        it("returns ingredients for option", async () => {
            mockIngredientRepo.findByModifierOptionId.mockResolvedValue([
                makeOptionIngredient(),
            ]);

            const result =
                await menuItemModifierGroupService.getOptionIngredients("mo-1");

            expect(result).toHaveLength(1);
        });
    });

    describe("addOptionIngredient", () => {
        it("adds when group, option, and ingredient are valid", async () => {
            mockGroupRepo.findById.mockResolvedValue(makeGroup());
            mockOptionRepo.findById.mockResolvedValue(makeOption());
            mockIngRepo.findById.mockResolvedValue(makeIngredient());
            mockIngredientRepo.insert.mockResolvedValue(makeOptionIngredient());

            const result =
                await menuItemModifierGroupService.addOptionIngredient(
                    "mi-1",
                    "mg-1",
                    "mo-1",
                    {
                        ingredientId: "ing-1",
                        quantity: "0.05",
                        modifierOptionId: "mo-1",
                    },
                );

            expect(result.id).toBe("moi-1");
        });

        it("throws notFound when group missing", async () => {
            mockGroupRepo.findById.mockResolvedValue(null);

            await expect(
                menuItemModifierGroupService.addOptionIngredient(
                    "mi-1",
                    "missing",
                    "mo-1",
                    {
                        ingredientId: "ing-1",
                        quantity: "0.05",
                        modifierOptionId: "mo-1",
                    },
                ),
            ).rejects.toThrow("Modifier group not found for this menu item");
        });

        it("throws notFound when option missing", async () => {
            mockGroupRepo.findById.mockResolvedValue(makeGroup());
            mockOptionRepo.findById.mockResolvedValue(null);

            await expect(
                menuItemModifierGroupService.addOptionIngredient(
                    "mi-1",
                    "mg-1",
                    "missing",
                    {
                        ingredientId: "ing-1",
                        quantity: "0.05",
                        modifierOptionId: "mo-1",
                    },
                ),
            ).rejects.toThrow("Modifier option not found for this group");
        });

        it("throws badRequest when ingredient missing", async () => {
            mockGroupRepo.findById.mockResolvedValue(makeGroup());
            mockOptionRepo.findById.mockResolvedValue(makeOption());
            mockIngRepo.findById.mockResolvedValue(null);

            await expect(
                menuItemModifierGroupService.addOptionIngredient(
                    "mi-1",
                    "mg-1",
                    "mo-1",
                    {
                        ingredientId: "missing",
                        quantity: "0.05",
                        modifierOptionId: "mo-1",
                    },
                ),
            ).rejects.toThrow("Ingredient not found: missing");
        });
    });

    describe("updateOptionIngredient", () => {
        it("updates when all parent resources exist", async () => {
            mockGroupRepo.findById.mockResolvedValue(makeGroup());
            mockOptionRepo.findById.mockResolvedValue(makeOption());
            mockIngredientRepo.findByModifierOptionIdAndIngredientId.mockResolvedValue(
                makeOptionIngredient(),
            );
            mockIngredientRepo.update.mockResolvedValue(
                makeOptionIngredient({ quantity: "0.10" }),
            );

            const result =
                await menuItemModifierGroupService.updateOptionIngredient(
                    "mi-1",
                    "mg-1",
                    "mo-1",
                    "ing-1",
                    { quantity: "0.10" },
                );

            expect(result.quantity).toBe("0.10");
        });

        it("throws notFound when group missing", async () => {
            mockGroupRepo.findById.mockResolvedValue(null);

            await expect(
                menuItemModifierGroupService.updateOptionIngredient(
                    "mi-1",
                    "missing",
                    "mo-1",
                    "ing-1",
                    { quantity: "0.10" },
                ),
            ).rejects.toThrow("Modifier group not found for this menu item");
        });

        it("throws notFound when option missing", async () => {
            mockGroupRepo.findById.mockResolvedValue(makeGroup());
            mockOptionRepo.findById.mockResolvedValue(null);

            await expect(
                menuItemModifierGroupService.updateOptionIngredient(
                    "mi-1",
                    "mg-1",
                    "missing",
                    "ing-1",
                    { quantity: "0.10" },
                ),
            ).rejects.toThrow("Modifier option not found for this group");
        });

        it("throws notFound when option ingredient mapping missing", async () => {
            mockGroupRepo.findById.mockResolvedValue(makeGroup());
            mockOptionRepo.findById.mockResolvedValue(makeOption());
            mockIngredientRepo.findByModifierOptionIdAndIngredientId.mockResolvedValue(
                null,
            );

            await expect(
                menuItemModifierGroupService.updateOptionIngredient(
                    "mi-1",
                    "mg-1",
                    "mo-1",
                    "ing-1",
                    { quantity: "0.10" },
                ),
            ).rejects.toThrow(
                "Option ingredient not found for ingredient: ing-1",
            );
        });
    });

    describe("deleteOptionIngredient", () => {
        it("deletes when all parent resources exist", async () => {
            mockGroupRepo.findById.mockResolvedValue(makeGroup());
            mockOptionRepo.findById.mockResolvedValue(makeOption());
            mockIngredientRepo.findByModifierOptionIdAndIngredientId.mockResolvedValue(
                makeOptionIngredient(),
            );
            mockIngredientRepo.delete.mockResolvedValue(undefined);

            await menuItemModifierGroupService.deleteOptionIngredient(
                "mi-1",
                "mg-1",
                "mo-1",
                "ing-1",
            );

            expect(mockIngredientRepo.delete).toHaveBeenCalledWith("moi-1");
        });

        it("throws notFound when group missing", async () => {
            mockGroupRepo.findById.mockResolvedValue(null);

            await expect(
                menuItemModifierGroupService.deleteOptionIngredient(
                    "mi-1",
                    "missing",
                    "mo-1",
                    "ing-1",
                ),
            ).rejects.toThrow("Modifier group not found for this menu item");
        });

        it("throws notFound when option missing", async () => {
            mockGroupRepo.findById.mockResolvedValue(makeGroup());
            mockOptionRepo.findById.mockResolvedValue(null);

            await expect(
                menuItemModifierGroupService.deleteOptionIngredient(
                    "mi-1",
                    "mg-1",
                    "missing",
                    "ing-1",
                ),
            ).rejects.toThrow("Modifier option not found for this group");
        });

        it("throws notFound when option ingredient mapping missing", async () => {
            mockGroupRepo.findById.mockResolvedValue(makeGroup());
            mockOptionRepo.findById.mockResolvedValue(makeOption());
            mockIngredientRepo.findByModifierOptionIdAndIngredientId.mockResolvedValue(
                null,
            );

            await expect(
                menuItemModifierGroupService.deleteOptionIngredient(
                    "mi-1",
                    "mg-1",
                    "mo-1",
                    "ing-1",
                ),
            ).rejects.toThrow(
                "Option ingredient not found for ingredient: ing-1",
            );
        });
    });
});
