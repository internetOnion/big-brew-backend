import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("./modifierGroup.repository.ts");
vi.mock("./modifierOption.repository.ts");
vi.mock("./modifierOptionIngredient.repository.ts");

import {
    modifierGroupService,
    modifierOptionService,
    modifierOptionIngredientService,
} from "./modifierGroup.service.ts";
import { modifierGroupRepository } from "./modifierGroup.repository.ts";
import { modifierOptionRepository } from "./modifierOption.repository.ts";
import { modifierOptionIngredientRepository } from "./modifierOptionIngredient.repository.ts";

const mockGroupRepo = vi.mocked(modifierGroupRepository);
const mockOptionRepo = vi.mocked(modifierOptionRepository);
const mockIngredientRepo = vi.mocked(modifierOptionIngredientRepository);

const makeModifierGroup = (overrides = {}) => ({
    id: "mg-1",
    name: "Size",
    menuItemId: null,
    selectionType: "single" as const,
    isRequired: true,
    defaultOptionId: null,
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
});

const makeModifierOption = (overrides = {}) => ({
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

const makeModifierOptionIngredient = (overrides = {}) => ({
    id: "moi-1",
    modifierOptionId: "mo-1",
    ingredientId: "ing-1",
    quantity: "0.05",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

describe("ModifierGroupService", () => {
    beforeEach(() => vi.resetAllMocks());

    describe("getModifierGroups", () => {
        it("returns sorted and formatted groups", async () => {
            mockGroupRepo.findAll.mockResolvedValue([
                makeModifierGroup({ sortOrder: 2, name: "Milk" }),
                makeModifierGroup({
                    id: "mg-2",
                    sortOrder: 1,
                    name: "Size",
                }),
            ]);

            const result = await modifierGroupService.getModifierGroups();

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe("Size");
            expect(result[0]).not.toHaveProperty("createdAt");
        });

        it("wraps errors as internal", async () => {
            mockGroupRepo.findAll.mockRejectedValue(new Error("db fail"));

            await expect(
                modifierGroupService.getModifierGroups(),
            ).rejects.toThrow("Failed to fetch modifier groups");
        });
    });

    describe("addModifierGroup", () => {
        it("inserts and returns formatted group", async () => {
            mockGroupRepo.insert.mockResolvedValue(makeModifierGroup());

            const result = await modifierGroupService.addModifierGroup({
                name: "Size",
                selectionType: "single",
                isRequired: true,
            });

            expect(result.name).toBe("Size");
        });

        it("wraps errors as internal", async () => {
            mockGroupRepo.insert.mockRejectedValue(new Error("db fail"));

            await expect(
                modifierGroupService.addModifierGroup({
                    name: "X",
                    selectionType: "single",
                    isRequired: false,
                }),
            ).rejects.toThrow("Failed to add modifier group");
        });
    });

    describe("updateModifierGroup", () => {
        it("updates when id exists", async () => {
            mockGroupRepo.findById.mockResolvedValue(makeModifierGroup());
            mockGroupRepo.update.mockResolvedValue(
                makeModifierGroup({ name: "Updated" }),
            );

            const result = await modifierGroupService.updateModifierGroup(
                "mg-1",
                { name: "Updated" },
            );

            expect(result.name).toBe("Updated");
        });

        it("throws notFound when missing", async () => {
            mockGroupRepo.findById.mockResolvedValue(null);

            await expect(
                modifierGroupService.updateModifierGroup("missing", {
                    name: "X",
                }),
            ).rejects.toThrow("Modifier group not found");
        });

        it("wraps unknown errors as internal", async () => {
            mockGroupRepo.findById.mockRejectedValue(new Error("unexpected"));

            await expect(
                modifierGroupService.updateModifierGroup("mg-1", {
                    name: "X",
                }),
            ).rejects.toThrow("Failed to update modifier group");
        });
    });

    describe("deleteModifierGroup", () => {
        it("deletes when id exists", async () => {
            mockGroupRepo.findById.mockResolvedValue(makeModifierGroup());
            mockGroupRepo.delete.mockResolvedValue(undefined);

            await modifierGroupService.deleteModifierGroup("mg-1");

            expect(mockGroupRepo.delete).toHaveBeenCalledWith("mg-1");
        });

        it("wraps notFound when missing as internal", async () => {
            mockGroupRepo.findById.mockResolvedValue(null);

            await expect(
                modifierGroupService.deleteModifierGroup("missing"),
            ).rejects.toThrow("Failed to delete modifier group");
        });
    });
});

describe("ModifierOptionService", () => {
    beforeEach(() => vi.resetAllMocks());

    describe("getModifierOptionsByGroupId", () => {
        it("returns sorted and formatted options", async () => {
            mockOptionRepo.findByModifierGroupId.mockResolvedValue([
                makeModifierOption({ sortOrder: 2 }),
                makeModifierOption({
                    id: "mo-2",
                    name: "Small",
                    sortOrder: 1,
                }),
            ]);

            const result =
                await modifierOptionService.getModifierOptionsByGroupId("mg-1");

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe("Small");
            expect(result[0]).not.toHaveProperty("createdAt");
        });

        it("wraps errors as internal", async () => {
            mockOptionRepo.findByModifierGroupId.mockRejectedValue(
                new Error("db fail"),
            );

            await expect(
                modifierOptionService.getModifierOptionsByGroupId("mg-1"),
            ).rejects.toThrow("Failed to fetch modifier options");
        });
    });

    describe("addModifierOption", () => {
        it("inserts and returns formatted option", async () => {
            mockOptionRepo.insert.mockResolvedValue(makeModifierOption());

            const result = await modifierOptionService.addModifierOption({
                modifierGroupId: "mg-1",
                name: "Large",
                price: "1.00",
                isAvailable: true,
                sortOrder: 1,
            });

            expect(result.name).toBe("Large");
        });

        it("wraps errors as internal", async () => {
            mockOptionRepo.insert.mockRejectedValue(new Error("db fail"));

            await expect(
                modifierOptionService.addModifierOption({
                    modifierGroupId: "mg-1",
                    name: "X",
                    price: "0",
                    isAvailable: true,
                    sortOrder: 1,
                }),
            ).rejects.toThrow("Failed to add modifier option");
        });
    });

    describe("updateModifierOption", () => {
        it("updates when id exists", async () => {
            mockOptionRepo.findById.mockResolvedValue(makeModifierOption());
            mockOptionRepo.update.mockResolvedValue(
                makeModifierOption({ name: "Updated" }),
            );

            const result = await modifierOptionService.updateModifierOption(
                "mo-1",
                { name: "Updated" },
            );

            expect(result.name).toBe("Updated");
        });

        it("throws notFound when missing", async () => {
            mockOptionRepo.findById.mockResolvedValue(null);

            await expect(
                modifierOptionService.updateModifierOption("missing", {
                    name: "X",
                }),
            ).rejects.toThrow("Modifier option not found");
        });

        it("wraps unknown errors as internal", async () => {
            mockOptionRepo.findById.mockRejectedValue(new Error("unexpected"));

            await expect(
                modifierOptionService.updateModifierOption("mo-1", {
                    name: "X",
                }),
            ).rejects.toThrow("Failed to update modifier option");
        });
    });

    describe("deleteModifierOption", () => {
        it("deletes when id exists", async () => {
            mockOptionRepo.findById.mockResolvedValue(makeModifierOption());
            mockOptionRepo.delete.mockResolvedValue(undefined);

            await modifierOptionService.deleteModifierOption("mo-1");

            expect(mockOptionRepo.delete).toHaveBeenCalledWith("mo-1");
        });

        it("wraps notFound when missing as internal", async () => {
            mockOptionRepo.findById.mockResolvedValue(null);

            await expect(
                modifierOptionService.deleteModifierOption("missing"),
            ).rejects.toThrow("Failed to delete modifier option");
        });
    });
});

describe("ModifierOptionIngredientService", () => {
    beforeEach(() => vi.resetAllMocks());

    describe("addModifierOptionIngredient", () => {
        it("inserts and returns option ingredient", async () => {
            mockIngredientRepo.insert.mockResolvedValue(
                makeModifierOptionIngredient(),
            );

            const result =
                await modifierOptionIngredientService.addModifierOptionIngredient(
                    {
                        modifierOptionId: "mo-1",
                        ingredientId: "ing-1",
                        quantity: "0.05",
                    },
                );

            expect(result.id).toBe("moi-1");
        });

        it("wraps errors as internal", async () => {
            mockIngredientRepo.insert.mockRejectedValue(new Error("db fail"));

            await expect(
                modifierOptionIngredientService.addModifierOptionIngredient({
                    modifierOptionId: "mo-1",
                    ingredientId: "ing-1",
                    quantity: "0.05",
                }),
            ).rejects.toThrow("Failed to add modifier option ingredient");
        });
    });

    describe("updateModifierOptionIngredient", () => {
        it("updates when id exists", async () => {
            mockIngredientRepo.findById.mockResolvedValue(
                makeModifierOptionIngredient(),
            );
            mockIngredientRepo.update.mockResolvedValue(
                makeModifierOptionIngredient({ quantity: "0.10" }),
            );

            const result =
                await modifierOptionIngredientService.updateModifierOptionIngredient(
                    "moi-1",
                    { quantity: "0.10" },
                );

            expect(result.quantity).toBe("0.10");
        });

        it("throws notFound when missing", async () => {
            mockIngredientRepo.findById.mockResolvedValue(null);

            await expect(
                modifierOptionIngredientService.updateModifierOptionIngredient(
                    "missing",
                    { quantity: "0.10" },
                ),
            ).rejects.toThrow("Modifier option ingredient not found");
        });

        it("wraps unknown errors as internal", async () => {
            mockIngredientRepo.findById.mockRejectedValue(
                new Error("unexpected"),
            );

            await expect(
                modifierOptionIngredientService.updateModifierOptionIngredient(
                    "moi-1",
                    { quantity: "0.10" },
                ),
            ).rejects.toThrow("Failed to update modifier option ingredient");
        });
    });
});
