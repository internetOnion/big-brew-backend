import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("./menuItem.repository.ts");
vi.mock("../../categories/category.repository.ts");
vi.mock("../../ingredients/ingredient.respository.ts");
vi.mock("../../storage/storage.service.ts");

import { menuItemService } from "./menuItem.service.ts";
import { menuItemRepository } from "./menuItem.repository.ts";
import { categoryRepository } from "../../categories/category.repository.ts";
import { ingredientRepository } from "../../ingredients/ingredient.respository.ts";
import { storageService } from "../../storage/storage.service.ts";

const mockMenuItemRepo = vi.mocked(menuItemRepository);
const mockCategoryRepo = vi.mocked(categoryRepository);
const mockIngredientRepo = vi.mocked(ingredientRepository);
const mockStorageService = vi.mocked(storageService);

const makeCategory = (overrides = {}) => ({
    id: "cat-1",
    name: "Coffee",
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
});

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

const makeMenuItemWithCategory = (overrides = {}) => ({
    menu_items: makeMenuItem(),
    categories: makeCategory(),
    ...overrides,
});

const makeMenuItemWithRelations = (overrides = {}) => ({
    menuItems: makeMenuItem(),
    categories: makeCategory(),
    modifierGroups: [],
    recipes: [],
    ...overrides,
});

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

describe("MenuItemService", () => {
    beforeEach(() => vi.resetAllMocks());

    describe("getMenuItems", () => {
        it("returns formatted menu items", async () => {
            mockMenuItemRepo.findAllWithCategory.mockResolvedValue([
                makeMenuItemWithCategory(),
            ]);

            const result = await menuItemService.getMenuItems();

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe("Latte");
        });
    });

    describe("getMenuItem", () => {
        it("returns full menu item with relations", async () => {
            mockMenuItemRepo.findByIdWithRelations.mockResolvedValue(
                makeMenuItemWithRelations(),
            );

            const result = await menuItemService.getMenuItem("mi-1");

            expect(result.name).toBe("Latte");
        });

        it("throws notFound when missing", async () => {
            mockMenuItemRepo.findByIdWithRelations.mockResolvedValue(null);

            await expect(
                menuItemService.getMenuItem("missing"),
            ).rejects.toThrow("Menu item not found");
        });
    });

    describe("addMenuItem", () => {
        it("creates menu item when category valid and name unique", async () => {
            mockCategoryRepo.findById.mockResolvedValue(makeCategory());
            mockMenuItemRepo.findByName.mockResolvedValue(null);
            mockMenuItemRepo.insert.mockResolvedValue(makeMenuItem());

            const result = await menuItemService.addMenuItem({
                name: "Latte",
                basePrice: 5,
                categoryId: "cat-1",
            });

            expect(result.name).toBe("Latte");
        });

        it("throws badRequest when category invalid", async () => {
            mockCategoryRepo.findById.mockResolvedValue(null);

            await expect(
                menuItemService.addMenuItem({
                    name: "Latte",
                    basePrice: 5,
                    categoryId: "bad-cat",
                }),
            ).rejects.toThrow("Invalid category ID");
        });

        it("throws conflict when name duplicate", async () => {
            mockCategoryRepo.findById.mockResolvedValue(makeCategory());
            mockMenuItemRepo.findByName.mockResolvedValue(makeMenuItem());

            await expect(
                menuItemService.addMenuItem({
                    name: "Latte",
                    basePrice: 5,
                    categoryId: "cat-1",
                }),
            ).rejects.toThrow('Menu item "Latte" already exists');
        });
    });

    describe("addMenuItemWithRelations", () => {
        it("batch creates with recipes and modifier groups", async () => {
            mockCategoryRepo.findById.mockResolvedValue(makeCategory());
            mockMenuItemRepo.findByName.mockResolvedValue(null);
            mockIngredientRepo.findByIds.mockResolvedValue([makeIngredient()]);
            mockMenuItemRepo.insertWithRelations.mockResolvedValue(
                makeMenuItem(),
            );
            mockMenuItemRepo.findByIdWithRelations.mockResolvedValue(
                makeMenuItemWithRelations(),
            );

            const result = await menuItemService.addMenuItemWithRelations({
                name: "Latte",
                basePrice: 5,
                categoryId: "cat-1",
                recipes: [{ ingredientId: "ing-1", quantity: 0.02 }],
            });

            expect(result.name).toBe("Latte");
        });

        it("throws badRequest when ingredient missing", async () => {
            mockCategoryRepo.findById.mockResolvedValue(makeCategory());
            mockMenuItemRepo.findByName.mockResolvedValue(null);
            mockIngredientRepo.findByIds.mockResolvedValue([]);

            await expect(
                menuItemService.addMenuItemWithRelations({
                    name: "Latte",
                    basePrice: 5,
                    categoryId: "cat-1",
                    recipes: [{ ingredientId: "missing", quantity: 0.02 }],
                }),
            ).rejects.toThrow("Ingredient not found: missing");
        });
    });

    describe("updateMenuItem", () => {
        it("updates when id exists", async () => {
            mockMenuItemRepo.findById.mockResolvedValue(makeMenuItem());
            mockMenuItemRepo.update.mockResolvedValue(
                makeMenuItem({ name: "Updated" }),
            );
            mockCategoryRepo.findById.mockResolvedValue(makeCategory());

            const result = await menuItemService.updateMenuItem("mi-1", {
                name: "Updated",
            });

            expect(result.name).toBe("Updated");
        });

        it("throws notFound when missing", async () => {
            mockMenuItemRepo.findById.mockResolvedValue(null);

            await expect(
                menuItemService.updateMenuItem("missing", { name: "X" }),
            ).rejects.toThrow("Menu item not found");
        });

        it("throws badRequest when new categoryId invalid", async () => {
            mockMenuItemRepo.findById.mockResolvedValue(makeMenuItem());
            mockCategoryRepo.findById.mockResolvedValue(null);

            await expect(
                menuItemService.updateMenuItem("mi-1", {
                    categoryId: "bad-cat",
                }),
            ).rejects.toThrow("Invalid category ID");
        });
    });

    describe("deleteMenuItem", () => {
        it("deletes when id exists", async () => {
            mockMenuItemRepo.findById.mockResolvedValue(makeMenuItem());
            mockMenuItemRepo.delete.mockResolvedValue(undefined);

            await menuItemService.deleteMenuItem("mi-1");

            expect(mockMenuItemRepo.delete).toHaveBeenCalledWith("mi-1");
        });

        it("throws notFound when missing", async () => {
            mockMenuItemRepo.findById.mockResolvedValue(null);

            await expect(
                menuItemService.deleteMenuItem("missing"),
            ).rejects.toThrow("Menu item not found");
        });
    });

    describe("updateImage", () => {
        it("uploads new image and updates DB", async () => {
            mockMenuItemRepo.findById.mockResolvedValue(makeMenuItem());
            mockStorageService.upload.mockResolvedValue({
                url: "https://example.com/new.jpg",
                path: "uploads/new.jpg",
            });
            mockMenuItemRepo.updateImage.mockResolvedValue(makeMenuItem());

            const file = {
                buffer: Buffer.from(""),
                mimetype: "image/jpeg",
                size: 100,
            } as Express.Multer.File;

            const result = await menuItemService.updateImage("mi-1", file);

            expect(result.imageUrl).toBe("https://example.com/new.jpg");
            expect(mockStorageService.upload).toHaveBeenCalledWith(file);
        });

        it("deletes old image before uploading new one", async () => {
            mockMenuItemRepo.findById.mockResolvedValue(
                makeMenuItem({ imagePath: "uploads/old.jpg" }),
            );
            mockStorageService.delete.mockResolvedValue(undefined);
            mockStorageService.upload.mockResolvedValue({
                url: "https://example.com/new.jpg",
                path: "uploads/new.jpg",
            });
            mockMenuItemRepo.updateImage.mockResolvedValue(makeMenuItem());

            const file = {
                buffer: Buffer.from(""),
                mimetype: "image/jpeg",
                size: 100,
            } as Express.Multer.File;

            await menuItemService.updateImage("mi-1", file);

            expect(mockStorageService.delete).toHaveBeenCalledWith(
                "uploads/old.jpg",
            );
        });

        it("throws notFound when missing", async () => {
            mockMenuItemRepo.findById.mockResolvedValue(null);

            await expect(
                menuItemService.updateImage("missing", {} as any),
            ).rejects.toThrow("Menu item not found");
        });
    });

    describe("deleteImage", () => {
        it("deletes image from storage and clears DB", async () => {
            mockMenuItemRepo.findById.mockResolvedValue(
                makeMenuItem({ imagePath: "uploads/img.jpg" }),
            );
            mockStorageService.delete.mockResolvedValue(undefined);
            mockMenuItemRepo.clearImage.mockResolvedValue(makeMenuItem());

            await menuItemService.deleteImage("mi-1");

            expect(mockStorageService.delete).toHaveBeenCalledWith(
                "uploads/img.jpg",
            );
            expect(mockMenuItemRepo.clearImage).toHaveBeenCalledWith("mi-1");
        });

        it("throws notFound when missing", async () => {
            mockMenuItemRepo.findById.mockResolvedValue(null);

            await expect(
                menuItemService.deleteImage("missing"),
            ).rejects.toThrow("Menu item not found");
        });

        it("skips storage delete when no imagePath", async () => {
            mockMenuItemRepo.findById.mockResolvedValue(
                makeMenuItem({ imagePath: null }),
            );
            mockMenuItemRepo.clearImage.mockResolvedValue(makeMenuItem());

            await menuItemService.deleteImage("mi-1");

            expect(mockStorageService.delete).not.toHaveBeenCalled();
        });
    });
});
