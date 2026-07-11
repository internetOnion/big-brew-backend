import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("./discount.repository.ts");

import { discountService } from "./discount.service.ts";
import { discountRepository } from "./discount.repository.ts";
import { AppError } from "../../shared/utils/AppError.ts";

const mockRepo = vi.mocked(discountRepository);

const makeDiscount = (overrides = {}) => ({
    id: "disc-1",
    name: "Summer Sale",
    type: "percentage" as const,
    value: "10.00",
    appliesTo: "order" as const,
    itemId: null,
    buyItemId: null,
    freeItemId: null,
    isActive: true,
    startsAt: null,
    endsAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
});

describe("DiscountService", () => {
    beforeEach(() => vi.resetAllMocks());

    describe("getActiveDiscounts", () => {
        it("returns active discounts", async () => {
            mockRepo.findActive.mockResolvedValue([makeDiscount()]);

            const result = await discountService.getActiveDiscounts();

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe("Summer Sale");
        });
    });

    describe("listAllDiscounts", () => {
        it("returns all discounts", async () => {
            mockRepo.findAll.mockResolvedValue([
                makeDiscount(),
                makeDiscount({ id: "disc-2", name: "Winter Sale" }),
            ]);

            const result = await discountService.listAllDiscounts();

            expect(result).toHaveLength(2);
        });
    });

    describe("getDiscount", () => {
        it("returns discount when found", async () => {
            mockRepo.findById.mockResolvedValue(makeDiscount());

            const result = await discountService.getDiscount("disc-1");

            expect(result.id).toBe("disc-1");
        });

        it("throws notFound when missing", async () => {
            mockRepo.findById.mockResolvedValue(null);

            await expect(
                discountService.getDiscount("missing"),
            ).rejects.toThrow("Discount not found");
        });
    });

    describe("createDiscount", () => {
        it("creates a percentage discount", async () => {
            mockRepo.insert.mockResolvedValue(makeDiscount());

            const result = await discountService.createDiscount({
                name: "Summer Sale",
                type: "percentage",
                value: "10.00",
                buyItemId: null,
                freeItemId: null,
            });

            expect(result.name).toBe("Summer Sale");
            expect(mockRepo.insert).toHaveBeenCalledWith({
                name: "Summer Sale",
                type: "percentage",
                value: "10.00",
                buyItemId: null,
                freeItemId: null,
                isActive: true,
            });
        });

        it("creates a fixed_amount discount", async () => {
            mockRepo.insert.mockResolvedValue(
                makeDiscount({ type: "fixed_amount" }),
            );

            const result = await discountService.createDiscount({
                name: "Flat $5",
                type: "fixed_amount",
                value: "5.00",
                buyItemId: null,
                freeItemId: null,
            });

            expect(result.type).toBe("fixed_amount");
        });

        it("creates a bogo discount", async () => {
            mockRepo.insert.mockResolvedValue(makeDiscount({ type: "bogo" }));

            const result = await discountService.createDiscount({
                name: "BOGO",
                type: "bogo",
                value: null,
                buyItemId: "item-1",
                freeItemId: "item-2",
            });

            expect(result.type).toBe("bogo");
        });

        it("throws badRequest when percentage discount is missing value", async () => {
            await expect(
                discountService.createDiscount({
                    name: "Bad",
                    type: "percentage",
                    value: null,
                    buyItemId: null,
                    freeItemId: null,
                }),
            ).rejects.toThrow("Percentage discounts require a value");
        });

        it("throws badRequest when bogo discount is missing buyItemId", async () => {
            await expect(
                discountService.createDiscount({
                    name: "Bad",
                    type: "bogo",
                    value: null,
                    buyItemId: null,
                    freeItemId: "item-2",
                }),
            ).rejects.toThrow("BOGO discounts require a buy_item_id");
        });

        it("throws badRequest when bogo discount is missing freeItemId", async () => {
            await expect(
                discountService.createDiscount({
                    name: "Bad",
                    type: "bogo",
                    value: null,
                    buyItemId: "item-1",
                    freeItemId: null,
                }),
            ).rejects.toThrow("BOGO discounts require a free_item_id");
        });

        it("throws badRequest when bogo discount has a value", async () => {
            await expect(
                discountService.createDiscount({
                    name: "Bad",
                    type: "bogo",
                    value: "5.00",
                    buyItemId: "item-1",
                    freeItemId: "item-2",
                }),
            ).rejects.toThrow("BOGO discounts must not have a value");
        });
    });

    describe("updateDiscount", () => {
        it("updates when id exists", async () => {
            mockRepo.findById.mockResolvedValue(makeDiscount());
            mockRepo.update.mockResolvedValue(
                makeDiscount({ name: "Updated Sale" }),
            );

            const result = await discountService.updateDiscount("disc-1", {
                name: "Updated Sale",
            });

            expect(result.name).toBe("Updated Sale");
        });

        it("throws notFound when missing", async () => {
            mockRepo.findById.mockResolvedValue(null);

            await expect(
                discountService.updateDiscount("missing", { name: "X" }),
            ).rejects.toThrow("Discount not found");
        });

        it("validates on type change", async () => {
            mockRepo.findById.mockResolvedValue(
                makeDiscount({ type: "percentage", value: "10.00" }),
            );

            await expect(
                discountService.updateDiscount("disc-1", {
                    type: "bogo",
                    buyItemId: null,
                    freeItemId: null,
                }),
            ).rejects.toThrow("BOGO discounts require a buy_item_id");
        });
    });

    describe("deleteDiscount", () => {
        it("deactivates when id exists", async () => {
            mockRepo.findById.mockResolvedValue(makeDiscount());
            mockRepo.deactivate.mockResolvedValue(
                makeDiscount({ deletedAt: new Date() }),
            );

            await discountService.deleteDiscount("disc-1");

            expect(mockRepo.deactivate).toHaveBeenCalledWith("disc-1");
        });

        it("throws notFound when missing", async () => {
            mockRepo.findById.mockResolvedValue(null);

            await expect(
                discountService.deleteDiscount("missing"),
            ).rejects.toThrow("Discount not found");
        });
    });
});
