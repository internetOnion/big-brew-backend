import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("./stockMovement.repository.ts");

import { stockMovementService } from "./stockMovement.service.ts";
import { stockMovementRepository } from "./stockMovement.repository.ts";

const mockRepo = vi.mocked(stockMovementRepository);

const makeMovement = (overrides = {}) => ({
    id: "sm-1",
    ingredientId: "ing-1",
    ingredientName: "Coffee Beans",
    ingredientUnit: "kg",
    quantityChange: "-0.50",
    reason: "order_placed" as const,
    referenceOrderId: "order-1",
    notes: null,
    createdAt: new Date(),
    ...overrides,
});

describe("StockMovementService", () => {
    beforeEach(() => vi.resetAllMocks());

    describe("listMovements", () => {
        it("returns movements matching filters", async () => {
            mockRepo.findAll.mockResolvedValue([makeMovement()]);

            const result = await stockMovementService.listMovements({
                ingredientId: "ing-1",
            });

            expect(result).toHaveLength(1);
            expect(result[0].ingredientName).toBe("Coffee Beans");
            expect(mockRepo.findAll).toHaveBeenCalledWith({
                ingredientId: "ing-1",
            });
        });

        it("returns empty array when no movements", async () => {
            mockRepo.findAll.mockResolvedValue([]);

            const result = await stockMovementService.listMovements({});

            expect(result).toHaveLength(0);
        });
    });
});
