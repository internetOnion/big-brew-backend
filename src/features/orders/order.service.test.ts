import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("./order.repository.ts");
vi.mock("./payment.service.ts");
vi.mock("../../shared/models/index.ts", () => ({
    db: { transaction: vi.fn() },
    pool: {},
}));

import { orderService } from "./order.service.ts";
import { orderRepository } from "./order.repository.ts";
import { paymentService } from "./payment.service.ts";
import { db } from "../../shared/models/index.ts";

const mockOrderRepo = vi.mocked(orderRepository);
const mockPaymentService = vi.mocked(paymentService);
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

describe("OrderService", () => {
    beforeEach(() => vi.resetAllMocks());

    describe("getOrder", () => {
        it("returns order when found", async () => {
            mockOrderRepo.findById.mockResolvedValue(makeOrder());

            const result = await orderService.getOrder("order-1");

            expect(result.id).toBe("order-1");
        });

        it("throws notFound when missing", async () => {
            mockOrderRepo.findById.mockResolvedValue(null);

            await expect(orderService.getOrder("missing")).rejects.toThrow(
                "Order not found",
            );
        });
    });

    describe("listOrders", () => {
        it("delegates to repository", async () => {
            mockOrderRepo.list.mockResolvedValue({
                data: [makeOrder()],
                total: 1,
                page: 1,
                limit: 20,
            });

            const result = await orderService.listOrders({});

            expect(result.data).toHaveLength(1);
        });
    });

    describe("updateOrderStatus", () => {
        it("updates pending order to completed", async () => {
            mockOrderRepo.findById.mockResolvedValue(makeOrder());
            mockOrderRepo.updateStatus.mockResolvedValue(
                makeOrder({ status: "completed" }),
            );

            const result = await orderService.updateOrderStatus(
                "order-1",
                "completed",
                "emp-1",
                "manager",
            );

            expect(result.status).toBe("completed");
        });

        it("throws badRequest when order not pending", async () => {
            mockOrderRepo.findById.mockResolvedValue(
                makeOrder({ status: "completed" }),
            );

            await expect(
                orderService.updateOrderStatus(
                    "order-1",
                    "completed",
                    "emp-1",
                    "manager",
                ),
            ).rejects.toThrow('Cannot update order with status "completed"');
        });

        it("throws forbidden when barista completes another's order", async () => {
            mockOrderRepo.findById.mockResolvedValue(
                makeOrder({
                    createdBy: { id: "emp-other", name: "Bob" },
                }),
            );

            await expect(
                orderService.updateOrderStatus(
                    "order-1",
                    "completed",
                    "emp-1",
                    "barista",
                ),
            ).rejects.toThrow("You can only complete your own orders");
        });

        it("allows barista to complete own order", async () => {
            mockOrderRepo.findById.mockResolvedValue(makeOrder());
            mockOrderRepo.updateStatus.mockResolvedValue(
                makeOrder({ status: "completed" }),
            );

            const result = await orderService.updateOrderStatus(
                "order-1",
                "completed",
                "emp-1",
                "barista",
            );

            expect(result.status).toBe("completed");
        });
    });

    describe("requestVoid", () => {
        it("creates void request", async () => {
            mockOrderRepo.findById.mockResolvedValue(makeOrder());
            mockOrderRepo.requestVoid.mockResolvedValue(
                makeOrder({ status: "void_requested" }),
            );

            const result = await orderService.requestVoid(
                "order-1",
                "emp-1",
                "wrong item",
            );

            expect(result.status).toBe("void_requested");
        });

        it("throws badRequest when already voided", async () => {
            mockOrderRepo.findById.mockResolvedValue(
                makeOrder({ status: "voided" }),
            );

            await expect(
                orderService.requestVoid("order-1", "emp-1", "reason"),
            ).rejects.toThrow("Order is already voided");
        });

        it("throws badRequest when void already requested", async () => {
            mockOrderRepo.findById.mockResolvedValue(
                makeOrder({ status: "void_requested" }),
            );

            await expect(
                orderService.requestVoid("order-1", "emp-1", "reason"),
            ).rejects.toThrow("Void request already pending");
        });
    });

    describe("approveVoid", () => {
        it("approves void and restores stock", async () => {
            const mockInsert = vi.fn().mockReturnValue({
                values: vi.fn().mockResolvedValue(undefined),
            });
            mockDb.transaction.mockImplementation(async (cb: any) => {
                mockOrderRepo.findByIdForUpdate.mockResolvedValue(
                    makeOrder({ status: "void_requested" }),
                );
                mockOrderRepo.approveVoid.mockResolvedValue(
                    makeOrder({ status: "voided" }),
                );
                // Mock for restoreStock — return original movements
                const mockWhere = vi
                    .fn()
                    .mockResolvedValue([
                        { ingredientId: "ing-1", quantityChange: "-2.00" },
                    ]);
                const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
                const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });
                const mockUpdate = vi.fn().mockReturnValue({
                    set: vi.fn().mockReturnValue({
                        where: vi.fn().mockResolvedValue(undefined),
                    }),
                });
                const mockTx = {
                    select: mockSelect,
                    insert: mockInsert,
                    update: mockUpdate,
                };
                return cb(mockTx);
            });
            mockOrderRepo.findById.mockResolvedValue(
                makeOrder({ status: "voided" }),
            );

            const result = await orderService.approveVoid("order-1", "mgr-1");

            expect(result.status).toBe("voided");
            // Verify stock restoration insert was called
            expect(mockInsert).toHaveBeenCalled();
        });

        it("throws notFound when order missing", async () => {
            mockDb.transaction.mockImplementation(async (cb: any) => {
                mockOrderRepo.findByIdForUpdate.mockResolvedValue(null);
                return cb({});
            });

            await expect(
                orderService.approveVoid("missing", "mgr-1"),
            ).rejects.toThrow("Order not found");
        });

        it("throws badRequest when not in void_requested status", async () => {
            mockDb.transaction.mockImplementation(async (cb: any) => {
                mockOrderRepo.findByIdForUpdate.mockResolvedValue(
                    makeOrder({ status: "pending" }),
                );
                return cb({});
            });

            await expect(
                orderService.approveVoid("order-1", "mgr-1"),
            ).rejects.toThrow("No pending void request for this order");
        });
    });

    describe("rejectVoid", () => {
        it("rejects void request", async () => {
            mockOrderRepo.findById.mockResolvedValue(
                makeOrder({ status: "void_requested" }),
            );
            mockOrderRepo.rejectVoid.mockResolvedValue(
                makeOrder({ status: "pending" }),
            );

            const result = await orderService.rejectVoid("order-1");

            expect(result.status).toBe("pending");
        });

        it("throws badRequest when not in void_requested status", async () => {
            mockOrderRepo.findById.mockResolvedValue(makeOrder());

            await expect(orderService.rejectVoid("order-1")).rejects.toThrow(
                "No pending void request for this order",
            );
        });
    });

    describe("processPayment", () => {
        it("delegates to paymentService and returns updated order", async () => {
            mockPaymentService.processPayment.mockResolvedValue({} as any);
            mockOrderRepo.findById.mockResolvedValue(
                makeOrder({ paymentStatus: "paid" }),
            );

            const result = await orderService.processPayment(
                "order-1",
                "cash",
                "emp-1",
                15,
            );

            expect(result.paymentStatus).toBe("paid");
            expect(mockPaymentService.processPayment).toHaveBeenCalledWith(
                "order-1",
                "cash",
                "emp-1",
                15,
            );
        });
    });

    describe("createOrder", () => {
        it("creates order with payment in transaction", async () => {
            const mockTxSelect = vi.fn().mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue([{ id: "mi-1" }]),
                }),
            });
            const mockTxInsert = vi.fn().mockReturnValue({
                values: vi.fn().mockResolvedValue(undefined),
            });

            mockDb.transaction.mockImplementation(async (cb: any) => {
                const tx = { select: mockTxSelect, insert: mockTxInsert };
                // First call: validate menu items
                // Second call: validate modifier options (empty)
                // Third call: deductStock recipes
                // Fourth call: deductStock modifier ingredients
                mockTxSelect
                    .mockReturnValueOnce({
                        from: vi.fn().mockReturnValue({
                            where: vi.fn().mockResolvedValue([{ id: "mi-1" }]),
                        }),
                    })
                    .mockReturnValueOnce({
                        from: vi.fn().mockReturnValue({
                            where: vi.fn().mockResolvedValue([]),
                        }),
                    })
                    .mockReturnValueOnce({
                        from: vi.fn().mockReturnValue({
                            where: vi.fn().mockResolvedValue([]),
                        }),
                    })
                    .mockReturnValueOnce({
                        from: vi.fn().mockReturnValue({
                            where: vi.fn().mockResolvedValue([]),
                        }),
                    });

                mockOrderRepo.create.mockResolvedValue(makeOrder());
                mockPaymentService.processPayment.mockResolvedValue({} as any);

                return cb(tx);
            });

            mockOrderRepo.findById.mockResolvedValue(makeOrder());

            const result = await orderService.createOrder(
                {
                    diningOption: "dine_in",
                    items: [
                        {
                            menuItemId: "mi-1",
                            quantity: 1,
                            unitPrice: 5,
                            modifierOptionIds: [],
                        },
                    ],
                    createdBy: "emp-1",
                },
                "cash",
                10,
            );

            expect(result.id).toBe("order-1");
            // Verify payment was processed
            expect(mockPaymentService.processPayment).toHaveBeenCalled();
        });

        it("throws notFound when menu item missing", async () => {
            mockDb.transaction.mockImplementation(async (cb: any) => {
                const mockTxSelect = vi.fn().mockReturnValue({
                    from: vi.fn().mockReturnValue({
                        where: vi.fn().mockResolvedValue([]),
                    }),
                });
                const tx = { select: mockTxSelect, insert: vi.fn() };
                return cb(tx);
            });

            await expect(
                orderService.createOrder({
                    diningOption: "dine_in",
                    items: [
                        {
                            menuItemId: "missing",
                            quantity: 1,
                            unitPrice: 5,
                            modifierOptionIds: [],
                        },
                    ],
                    createdBy: "emp-1",
                }),
            ).rejects.toThrow("Menu item with ID missing not found");
        });

        it("throws notFound when modifier option missing", async () => {
            mockDb.transaction.mockImplementation(async (cb: any) => {
                const mockTxSelect = vi.fn();
                // First: menu items found
                mockTxSelect.mockReturnValueOnce({
                    from: vi.fn().mockReturnValue({
                        where: vi.fn().mockResolvedValue([{ id: "mi-1" }]),
                    }),
                });
                // Second: modifier options not found
                mockTxSelect.mockReturnValueOnce({
                    from: vi.fn().mockReturnValue({
                        where: vi.fn().mockResolvedValue([]),
                    }),
                });
                const tx = { select: mockTxSelect, insert: vi.fn() };
                return cb(tx);
            });

            await expect(
                orderService.createOrder({
                    diningOption: "dine_in",
                    items: [
                        {
                            menuItemId: "mi-1",
                            quantity: 1,
                            unitPrice: 5,
                            modifierOptionIds: ["mod-missing"],
                        },
                    ],
                    createdBy: "emp-1",
                }),
            ).rejects.toThrow("Modifier option with ID mod-missing not found");
        });
    });
});
