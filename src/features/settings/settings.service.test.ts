import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("./settings.repository.ts");

import { settingsService } from "./settings.service.ts";
import { settingsRepository } from "./settings.repository.ts";
import { AppError } from "../../shared/utils/AppError.ts";

const mockRepo = vi.mocked(settingsRepository);

const makeSettings = (overrides = {}) => ({
    id: 1,
    storeName: "Big Brew",
    storeAddress: "123 Coffee St",
    currencySymbol: "$",
    receiptHeader: null,
    receiptFooter: null,
    taxLabel: "VAT",
    logoUrl: null,
    qrCodeUrl: null,
    khrRate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

describe("SettingsService", () => {
    beforeEach(() => vi.resetAllMocks());

    describe("getSettings", () => {
        it("returns settings when found", async () => {
            mockRepo.find.mockResolvedValue(makeSettings());

            const result = await settingsService.getSettings();

            expect(result.storeName).toBe("Big Brew");
        });

        it("throws notFound when missing", async () => {
            mockRepo.find.mockResolvedValue(null);

            await expect(settingsService.getSettings()).rejects.toThrow(
                "Settings not found",
            );
        });
    });

    describe("updateSettings", () => {
        it("updates and returns settings", async () => {
            mockRepo.update.mockResolvedValue(
                makeSettings({ storeName: "Small Brew" }),
            );

            const result = await settingsService.updateSettings({
                storeName: "Small Brew",
            });

            expect(result.storeName).toBe("Small Brew");
            expect(mockRepo.update).toHaveBeenCalledWith({
                storeName: "Small Brew",
            });
        });
    });
});
