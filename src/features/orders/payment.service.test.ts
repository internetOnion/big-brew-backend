import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("./payment.repository.ts");
vi.mock("./order.repository.ts");
vi.mock("../../shared/models/index.ts", () => ({
    db: { transaction: vi.fn() },
    pool: {},
}));

import { paymentService } from "./payment.service.ts";
import { paymentRepository } from "./payment.repository.ts";
import { orderRepository } from "./order.repository.ts";
import { db } from "../../shared/models/index.ts";

const mockPaymentRepo = vi.mocked(paymentRepository);
const mockOrderRepo = vi.mocked(orderRepository);
const mockDb = vi.mocked(db);

const makeOrder = (overrides = {}) => ({
    id: "order-1",
    orderNumber: 1,
    receiptNumber: 1,
    status: "pending" as const,
    diningOption: "dine_in" as const,
    subtotal: "10.00",
    discountId: null,
    discountAmount: "0.00",
    total: "10.00",
    paymentStatus: "pending" as const,
    createdBy: { id: "emp-1", name: "Alice" },
    voidRequestedBy: null,
    voidRequestedAt: null,
    voidApprovedBy: null,
    voidApprovedAt: null,
    voidRejectedAt: null,
    voidReason: null,
    items: [],
    payments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

const makePayment = (overrides = {}) => ({
    id: "pay-1",
    orderId: "order-1",
    method: "cash" as const,
    amount: "10.00",
    amountReceived: "10.00",
    changeAmount: "0.00",
    status: "paid" as const,
    createdBy: { id: "emp-1", name: "Alice" },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

describe("PaymentService", () => {
    beforeEach(() => vi.resetAllMocks());

    describe("processPayment", () => {
        it("processes cash payment with change", async () => {
            mockDb.transaction.mockImplementation(async (cb: any) => {
                mockOrderRepo.findByIdForUpdate.mockResolvedValue(
                    makeOrder({ total: "10.00" }),
                );
                mockPaymentRepo.create.mockResolvedValue(makePayment());
                mockOrderRepo.updatePaymentStatus.mockResolvedValue(undefined);
                return cb({});
            });

            const result = await paymentService.processPayment(
                "order-1",
                "cash",
                "emp-1",
                15,
            );

            expect(result.id).toBe("pay-1");
        });

        it("processes non-cash payment without amountReceived", async () => {
            mockDb.transaction.mockImplementation(async (cb: any) => {
                mockOrderRepo.findByIdForUpdate.mockResolvedValue(makeOrder());
                mockPaymentRepo.create.mockResolvedValue(
                    makePayment({ method: "qr", amountReceived: null }),
                );
                mockOrderRepo.updatePaymentStatus.mockResolvedValue(undefined);
                return cb({});
            });

            const result = await paymentService.processPayment(
                "order-1",
                "qr",
                "emp-1",
            );

            expect(result.method).toBe("qr");
        });

        it("throws notFound when order missing", async () => {
            mockDb.transaction.mockImplementation(async (cb: any) => {
                mockOrderRepo.findByIdForUpdate.mockResolvedValue(null);
                return cb({});
            });

            await expect(
                paymentService.processPayment("missing", "cash", "emp-1", 10),
            ).rejects.toThrow("Order not found");
        });

        it("throws badRequest when order already paid", async () => {
            mockDb.transaction.mockImplementation(async (cb: any) => {
                mockOrderRepo.findByIdForUpdate.mockResolvedValue(
                    makeOrder({ paymentStatus: "paid" }),
                );
                return cb({});
            });

            await expect(
                paymentService.processPayment("order-1", "cash", "emp-1", 10),
            ).rejects.toThrow("Order is already paid");
        });

        it("throws badRequest when cash amountReceived missing", async () => {
            mockDb.transaction.mockImplementation(async (cb: any) => {
                mockOrderRepo.findByIdForUpdate.mockResolvedValue(makeOrder());
                return cb({});
            });

            await expect(
                paymentService.processPayment("order-1", "cash", "emp-1"),
            ).rejects.toThrow("Amount received is required for cash payments");
        });

        it("throws badRequest when cash amountReceived < total", async () => {
            mockDb.transaction.mockImplementation(async (cb: any) => {
                mockOrderRepo.findByIdForUpdate.mockResolvedValue(
                    makeOrder({ total: "10.00" }),
                );
                return cb({});
            });

            await expect(
                paymentService.processPayment("order-1", "cash", "emp-1", 5),
            ).rejects.toThrow("Amount received is less than the total");
        });

        it("uses provided tx instead of db.transaction", async () => {
            const tx = {};
            mockOrderRepo.findByIdForUpdate.mockResolvedValue(makeOrder());
            mockPaymentRepo.create.mockResolvedValue(makePayment());
            mockOrderRepo.updatePaymentStatus.mockResolvedValue(undefined);

            await paymentService.processPayment(
                "order-1",
                "qr",
                "emp-1",
                undefined,
                tx,
            );

            expect(mockDb.transaction).not.toHaveBeenCalled();
        });
    });

    describe("getPayment", () => {
        it("returns payment when found", async () => {
            mockPaymentRepo.findById.mockResolvedValue(makePayment());

            const result = await paymentService.getPayment("pay-1");

            expect(result.id).toBe("pay-1");
        });

        it("throws notFound when missing", async () => {
            mockPaymentRepo.findById.mockResolvedValue(null);

            await expect(paymentService.getPayment("missing")).rejects.toThrow(
                "Payment not found",
            );
        });
    });

    describe("getPaymentsByOrderId", () => {
        it("returns payments for order", async () => {
            mockPaymentRepo.findByOrderId.mockResolvedValue([makePayment()]);

            const result = await paymentService.getPaymentsByOrderId("order-1");

            expect(result).toHaveLength(1);
        });
    });

    describe("refundPayment", () => {
        it("refunds payment and updates order status", async () => {
            mockDb.transaction.mockImplementation(async (cb: any) => {
                mockPaymentRepo.findById.mockResolvedValue(makePayment());
                mockOrderRepo.findByIdForUpdate.mockResolvedValue(makeOrder());
                mockPaymentRepo.refund.mockResolvedValue(
                    makePayment({ status: "refunded" }),
                );
                mockOrderRepo.updatePaymentStatus.mockResolvedValue(undefined);
                return cb({});
            });

            const result = await paymentService.refundPayment("pay-1");

            expect(result.status).toBe("refunded");
        });

        it("throws notFound when payment missing", async () => {
            mockDb.transaction.mockImplementation(async (cb: any) => {
                mockPaymentRepo.findById.mockResolvedValue(null);
                return cb({});
            });

            await expect(
                paymentService.refundPayment("missing"),
            ).rejects.toThrow("Payment not found");
        });

        it("throws badRequest when already refunded", async () => {
            mockDb.transaction.mockImplementation(async (cb: any) => {
                mockPaymentRepo.findById.mockResolvedValue(
                    makePayment({ status: "refunded" }),
                );
                return cb({});
            });

            await expect(paymentService.refundPayment("pay-1")).rejects.toThrow(
                "Payment is already refunded",
            );
        });

        it("throws notFound when order missing during refund", async () => {
            mockDb.transaction.mockImplementation(async (cb: any) => {
                mockPaymentRepo.findById.mockResolvedValue(makePayment());
                mockOrderRepo.findByIdForUpdate.mockResolvedValue(null);
                return cb({});
            });

            await expect(paymentService.refundPayment("pay-1")).rejects.toThrow(
                "Order not found",
            );
        });
    });
});
