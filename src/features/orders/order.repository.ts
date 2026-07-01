import { eq, inArray, desc, and, sql, gte, lte, count } from "drizzle-orm";
import { db } from "../../shared/models/index.ts";
import {
    ordersTable,
    orderItemsTable,
    orderItemModifiersTable,
    menuItemsTable,
    modifierOptionsTable,
    modifierGroupsTable,
    employeesTable,
    discountsTable,
} from "../../shared/models/schema/index.ts";
import { paymentRepository, type Payment } from "./payment.repository.ts";
import type {
    OrderStatus,
    PaymentStatus,
    DiningOption,
} from "../../shared/types/index.ts";

export interface OrderItemInput {
    menuItemId: string;
    quantity: number;
    unitPrice: number;
    modifierOptionIds: string[];
}

export interface CreateOrderInput {
    diningOption: DiningOption;
    discountId?: string;
    items: OrderItemInput[];
    createdBy: string;
    confirmedBy: string;
}

export interface OrderItemModifier {
    id: string;
    modifierOptionId: string;
    modifierGroupId: string;
    groupName: string;
    name: string;
    price: string;
}

export interface OrderItem {
    id: string;
    menuItemId: string;
    name: string;
    unitPrice: string;
    quantity: number;
    modifiers: OrderItemModifier[];
}

export interface Order {
    id: string;
    orderNumber: number;
    receiptNumber: number;
    status: OrderStatus;
    diningOption: DiningOption;
    subtotal: string;
    discountId: string | null;
    discountAmount: string;
    total: string;
    paymentStatus: PaymentStatus;
    createdBy: { id: string; name: string };
    confirmedBy: { id: string; name: string };
    voidRequestedBy: { id: string; name: string } | null;
    voidRequestedAt: Date | null;
    voidApprovedBy: { id: string; name: string } | null;
    voidApprovedAt: Date | null;
    voidRejectedAt: Date | null;
    voidReason: string | null;
    items: OrderItem[];
    payments: Payment[];
    createdAt: Date;
    updatedAt: Date;
}

export interface ListOrdersFilters {
    status?: OrderStatus[];
    createdById?: string;
    limit?: number;
    offset?: number;
    from?: Date;
    to?: Date;
}

export interface PaginatedOrdersResult {
    data: Order[];
    total: number;
    page: number;
    limit: number;
}

export class OrderRepository {
    async create(input: CreateOrderInput): Promise<Order> {
        return await db.transaction(async (tx) => {
            // Calculate subtotal from items
            let subtotal = 0;
            for (const item of input.items) {
                subtotal += item.unitPrice * item.quantity;
            }

            // Calculate discount if applicable
            let discountAmount = 0;
            if (input.discountId) {
                const discount = await tx
                    .select()
                    .from(discountsTable)
                    .where(eq(discountsTable.id, input.discountId))
                    .limit(1);

                if (discount[0] && discount[0].isActive) {
                    const now = new Date();
                    const startsAt = discount[0].startsAt;
                    const endsAt = discount[0].endsAt;

                    if (
                        (!startsAt || now >= startsAt) &&
                        (!endsAt || now <= endsAt)
                    ) {
                        if (discount[0].type === "percentage") {
                            discountAmount =
                                subtotal *
                                (parseFloat(discount[0].value!) / 100);
                        } else if (discount[0].type === "fixed_amount") {
                            discountAmount = parseFloat(discount[0].value!);
                        }
                    }
                }
            }

            const total = subtotal - discountAmount;

            // Create the order
            const [order] = await tx
                .insert(ordersTable)
                .values({
                    diningOption: input.diningOption,
                    subtotal: subtotal.toFixed(2),
                    discountId: input.discountId || null,
                    discountAmount: discountAmount.toFixed(2),
                    total: total.toFixed(2),
                    paymentStatus: "pending",
                    createdBy: input.createdBy,
                    confirmedBy: input.confirmedBy,
                })
                .returning();

            // Create order items and modifiers
            for (const item of input.items) {
                const [orderItem] = await tx
                    .insert(orderItemsTable)
                    .values({
                        orderId: order.id,
                        menuItemId: item.menuItemId,
                        unitPrice: item.unitPrice.toFixed(2),
                        quantity: item.quantity,
                    })
                    .returning();

                // Insert modifiers
                if (item.modifierOptionIds.length > 0) {
                    // Get modifier prices
                    const modifiers = await tx
                        .select()
                        .from(modifierOptionsTable)
                        .where(
                            inArray(
                                modifierOptionsTable.id,
                                item.modifierOptionIds,
                            ),
                        );

                    const modifierValues = modifiers.map((mod) => ({
                        orderItemId: orderItem.id,
                        modifierOptionId: mod.id,
                        price: mod.price || "0",
                    }));

                    await tx
                        .insert(orderItemModifiersTable)
                        .values(modifierValues);
                }
            }

            // Return the complete order
            return this.findById(order.id, tx) as Promise<Order>;
        });
    }

    async findByIdForUpdate(id: string, tx: any): Promise<Order | null> {
        // Lock the order row first — FOR UPDATE can't be combined with outer joins
        const [locked] = await tx
            .select({ id: ordersTable.id })
            .from(ordersTable)
            .where(eq(ordersTable.id, id))
            .for("update")
            .limit(1);

        if (!locked) return null;

        const order = await tx
            .select({
                id: ordersTable.id,
                orderNumber: ordersTable.orderNumber,
                receiptNumber: ordersTable.receiptNumber,
                status: ordersTable.status,
                diningOption: ordersTable.diningOption,
                subtotal: ordersTable.subtotal,
                discountId: ordersTable.discountId,
                discountAmount: ordersTable.discountAmount,
                total: ordersTable.total,
                paymentStatus: ordersTable.paymentStatus,
                voidRequestedAt: ordersTable.voidRequestedAt,
                voidApprovedAt: ordersTable.voidApprovedAt,
                voidRejectedAt: ordersTable.voidRejectedAt,
                voidReason: ordersTable.voidReason,
                createdAt: ordersTable.createdAt,
                updatedAt: ordersTable.updatedAt,
                createdById: ordersTable.createdBy,
                createdByName: employeesTable.name,
                confirmedById: ordersTable.confirmedBy,
                confirmedByName: sql<string>`cb.name`,
                voidRequestedById: ordersTable.voidRequestedBy,
                voidRequestedByName: sql<string>`vr.name`,
                voidApprovedById: ordersTable.voidApprovedBy,
                voidApprovedByName: sql<string>`va.name`,
            })
            .from(ordersTable)
            .leftJoin(
                employeesTable,
                eq(ordersTable.createdBy, employeesTable.id),
            )
            .leftJoin(
                sql`employees AS cb`,
                sql`${ordersTable.confirmedBy} = cb.id`,
            )
            .leftJoin(
                sql`employees AS vr`,
                sql`${ordersTable.voidRequestedBy} = vr.id`,
            )
            .leftJoin(
                sql`employees AS va`,
                sql`${ordersTable.voidApprovedBy} = va.id`,
            )
            .where(eq(ordersTable.id, id))
            .limit(1);

        // Get order items with menu item names
        const items = await tx
            .select({
                id: orderItemsTable.id,
                menuItemId: orderItemsTable.menuItemId,
                name: menuItemsTable.name,
                unitPrice: orderItemsTable.unitPrice,
                quantity: orderItemsTable.quantity,
            })
            .from(orderItemsTable)
            .leftJoin(
                menuItemsTable,
                eq(orderItemsTable.menuItemId, menuItemsTable.id),
            )
            .where(eq(orderItemsTable.orderId, id));

        // Batch-load modifiers for all items at once
        const itemIds: string[] = [];
        for (const item of items) {
            itemIds.push(item.id);
        }
        const modifiersByItem = new Map<string, OrderItemModifier[]>();
        if (itemIds.length > 0) {
            const allModifiers = await tx
                .select({
                    id: orderItemModifiersTable.id,
                    orderItemId: orderItemModifiersTable.orderItemId,
                    modifierOptionId: orderItemModifiersTable.modifierOptionId,
                    modifierGroupId: modifierGroupsTable.id,
                    groupName: modifierGroupsTable.name,
                    name: modifierOptionsTable.name,
                    price: orderItemModifiersTable.price,
                })
                .from(orderItemModifiersTable)
                .leftJoin(
                    modifierOptionsTable,
                    eq(
                        orderItemModifiersTable.modifierOptionId,
                        modifierOptionsTable.id,
                    ),
                )
                .leftJoin(
                    modifierGroupsTable,
                    eq(
                        modifierOptionsTable.modifierGroupId,
                        modifierGroupsTable.id,
                    ),
                )
                .where(inArray(orderItemModifiersTable.orderItemId, itemIds));

            for (const modifier of allModifiers) {
                const list = modifiersByItem.get(modifier.orderItemId) || [];
                list.push({
                    id: modifier.id,
                    modifierOptionId: modifier.modifierOptionId,
                    modifierGroupId: modifier.modifierGroupId!,
                    groupName: modifier.groupName!,
                    name: modifier.name!,
                    price: modifier.price,
                });
                modifiersByItem.set(modifier.orderItemId, list);
            }
        }

        const itemsWithModifiers: OrderItem[] = [];
        for (const item of items) {
            itemsWithModifiers.push({
                ...item,
                modifiers: modifiersByItem.get(item.id) || [],
            });
        }

        // Get payments for this order
        const payments = await paymentRepository.findByOrderId(id, tx);

        const o = order[0];
        return {
            id: o.id,
            orderNumber: o.orderNumber,
            receiptNumber: o.receiptNumber,
            status: o.status as OrderStatus,
            diningOption: o.diningOption as DiningOption,
            subtotal: o.subtotal,
            discountId: o.discountId,
            discountAmount: o.discountAmount,
            total: o.total,
            paymentStatus: o.paymentStatus as PaymentStatus,
            createdBy: { id: o.createdById, name: o.createdByName },
            confirmedBy: { id: o.confirmedById, name: o.confirmedByName! },
            voidRequestedBy: o.voidRequestedById
                ? { id: o.voidRequestedById, name: o.voidRequestedByName! }
                : null,
            voidRequestedAt: o.voidRequestedAt,
            voidApprovedBy: o.voidApprovedById
                ? { id: o.voidApprovedById, name: o.voidApprovedByName! }
                : null,
            voidApprovedAt: o.voidApprovedAt,
            voidRejectedAt: o.voidRejectedAt,
            voidReason: o.voidReason,
            items: itemsWithModifiers,
            payments,
            createdAt: o.createdAt,
            updatedAt: o.updatedAt,
        };
    }

    async findById(id: string, tx?: any): Promise<Order | null> {
        const dbClient = tx || db;

        const order = await dbClient
            .select({
                id: ordersTable.id,
                orderNumber: ordersTable.orderNumber,
                receiptNumber: ordersTable.receiptNumber,
                status: ordersTable.status,
                diningOption: ordersTable.diningOption,
                subtotal: ordersTable.subtotal,
                discountId: ordersTable.discountId,
                discountAmount: ordersTable.discountAmount,
                total: ordersTable.total,
                paymentStatus: ordersTable.paymentStatus,
                voidRequestedAt: ordersTable.voidRequestedAt,
                voidApprovedAt: ordersTable.voidApprovedAt,
                voidRejectedAt: ordersTable.voidRejectedAt,
                voidReason: ordersTable.voidReason,
                createdAt: ordersTable.createdAt,
                updatedAt: ordersTable.updatedAt,
                createdById: ordersTable.createdBy,
                createdByName: employeesTable.name,
                confirmedById: ordersTable.confirmedBy,
                confirmedByName: sql<string>`cb.name`,
                voidRequestedById: ordersTable.voidRequestedBy,
                voidRequestedByName: sql<string>`vr.name`,
                voidApprovedById: ordersTable.voidApprovedBy,
                voidApprovedByName: sql<string>`va.name`,
            })
            .from(ordersTable)
            .leftJoin(
                employeesTable,
                eq(ordersTable.createdBy, employeesTable.id),
            )
            .leftJoin(
                sql`employees AS cb`,
                sql`${ordersTable.confirmedBy} = cb.id`,
            )
            .leftJoin(
                sql`employees AS vr`,
                sql`${ordersTable.voidRequestedBy} = vr.id`,
            )
            .leftJoin(
                sql`employees AS va`,
                sql`${ordersTable.voidApprovedBy} = va.id`,
            )
            .where(eq(ordersTable.id, id))
            .limit(1);

        if (!order[0]) return null;

        // Get order items with menu item names
        const items = await dbClient
            .select({
                id: orderItemsTable.id,
                menuItemId: orderItemsTable.menuItemId,
                name: menuItemsTable.name,
                unitPrice: orderItemsTable.unitPrice,
                quantity: orderItemsTable.quantity,
            })
            .from(orderItemsTable)
            .leftJoin(
                menuItemsTable,
                eq(orderItemsTable.menuItemId, menuItemsTable.id),
            )
            .where(eq(orderItemsTable.orderId, id));

        // Batch-load modifiers for all items at once
        const itemIds: string[] = [];
        for (const item of items) {
            itemIds.push(item.id);
        }
        const modifiersByItem = new Map<string, OrderItemModifier[]>();
        if (itemIds.length > 0) {
            const allModifiers = await dbClient
                .select({
                    id: orderItemModifiersTable.id,
                    orderItemId: orderItemModifiersTable.orderItemId,
                    modifierOptionId: orderItemModifiersTable.modifierOptionId,
                    modifierGroupId: modifierGroupsTable.id,
                    groupName: modifierGroupsTable.name,
                    name: modifierOptionsTable.name,
                    price: orderItemModifiersTable.price,
                })
                .from(orderItemModifiersTable)
                .leftJoin(
                    modifierOptionsTable,
                    eq(
                        orderItemModifiersTable.modifierOptionId,
                        modifierOptionsTable.id,
                    ),
                )
                .leftJoin(
                    modifierGroupsTable,
                    eq(
                        modifierOptionsTable.modifierGroupId,
                        modifierGroupsTable.id,
                    ),
                )
                .where(inArray(orderItemModifiersTable.orderItemId, itemIds));

            for (const modifier of allModifiers) {
                const list = modifiersByItem.get(modifier.orderItemId) || [];
                list.push({
                    id: modifier.id,
                    modifierOptionId: modifier.modifierOptionId,
                    modifierGroupId: modifier.modifierGroupId!,
                    groupName: modifier.groupName!,
                    name: modifier.name!,
                    price: modifier.price,
                });
                modifiersByItem.set(modifier.orderItemId, list);
            }
        }

        const itemsWithModifiers: OrderItem[] = [];
        for (const item of items) {
            itemsWithModifiers.push({
                ...item,
                modifiers: modifiersByItem.get(item.id) || [],
            });
        }

        // Get payments for this order
        const payments = await paymentRepository.findByOrderId(id, dbClient);

        const o = order[0];
        return {
            id: o.id,
            orderNumber: o.orderNumber,
            receiptNumber: o.receiptNumber,
            status: o.status as OrderStatus,
            diningOption: o.diningOption as DiningOption,
            subtotal: o.subtotal,
            discountId: o.discountId,
            discountAmount: o.discountAmount,
            total: o.total,
            paymentStatus: o.paymentStatus as PaymentStatus,
            createdBy: { id: o.createdById, name: o.createdByName },
            confirmedBy: { id: o.confirmedById, name: o.confirmedByName! },
            voidRequestedBy: o.voidRequestedById
                ? { id: o.voidRequestedById, name: o.voidRequestedByName! }
                : null,
            voidRequestedAt: o.voidRequestedAt,
            voidApprovedBy: o.voidApprovedById
                ? { id: o.voidApprovedById, name: o.voidApprovedByName! }
                : null,
            voidApprovedAt: o.voidApprovedAt,
            voidRejectedAt: o.voidRejectedAt,
            voidReason: o.voidReason,
            items: itemsWithModifiers,
            payments,
            createdAt: o.createdAt,
            updatedAt: o.updatedAt,
        };
    }

    async list(filters: ListOrdersFilters): Promise<PaginatedOrdersResult> {
        const conditions = [];

        if (filters.status && filters.status.length > 0) {
            conditions.push(inArray(ordersTable.status, filters.status));
        }

        if (filters.createdById) {
            conditions.push(eq(ordersTable.createdBy, filters.createdById));
        }

        if (filters.from) {
            conditions.push(gte(ordersTable.createdAt, filters.from));
        }

        if (filters.to) {
            conditions.push(lte(ordersTable.createdAt, filters.to));
        }

        const whereClause =
            conditions.length > 0 ? and(...conditions) : undefined;

        const limit = filters.limit ?? 20;
        const offset = filters.offset ?? 0;

        // Run count and paginated header query in parallel
        const [countResult, ordersHeaders] = await Promise.all([
            db.select({ total: count() }).from(ordersTable).where(whereClause),
            db
                .select({
                    id: ordersTable.id,
                    orderNumber: ordersTable.orderNumber,
                    receiptNumber: ordersTable.receiptNumber,
                    status: ordersTable.status,
                    diningOption: ordersTable.diningOption,
                    subtotal: ordersTable.subtotal,
                    discountId: ordersTable.discountId,
                    discountAmount: ordersTable.discountAmount,
                    total: ordersTable.total,
                    paymentStatus: ordersTable.paymentStatus,
                    voidRequestedAt: ordersTable.voidRequestedAt,
                    voidApprovedAt: ordersTable.voidApprovedAt,
                    voidRejectedAt: ordersTable.voidRejectedAt,
                    voidReason: ordersTable.voidReason,
                    createdAt: ordersTable.createdAt,
                    updatedAt: ordersTable.updatedAt,
                    createdById: ordersTable.createdBy,
                    createdByName: employeesTable.name,
                    confirmedById: ordersTable.confirmedBy,
                    confirmedByName: sql<string>`cb.name`,
                    voidRequestedById: ordersTable.voidRequestedBy,
                    voidRequestedByName: sql<string>`vr.name`,
                    voidApprovedById: ordersTable.voidApprovedBy,
                    voidApprovedByName: sql<string>`va.name`,
                })
                .from(ordersTable)
                .leftJoin(
                    employeesTable,
                    eq(ordersTable.createdBy, employeesTable.id),
                )
                .leftJoin(
                    sql`employees AS cb`,
                    sql`${ordersTable.confirmedBy} = cb.id`,
                )
                .leftJoin(
                    sql`employees AS vr`,
                    sql`${ordersTable.voidRequestedBy} = vr.id`,
                )
                .leftJoin(
                    sql`employees AS va`,
                    sql`${ordersTable.voidApprovedBy} = va.id`,
                )
                .where(whereClause)
                .orderBy(desc(ordersTable.createdAt))
                .limit(limit)
                .offset(offset),
        ]);

        const total = countResult[0]?.total ?? 0;

        if (ordersHeaders.length === 0) {
            return {
                data: [],
                total,
                page: Math.floor(offset / limit) + 1,
                limit,
            };
        }

        const orderIds = ordersHeaders.map((o) => o.id);

        // Batch-load items, modifiers, and payments in parallel
        const [items, modifiersByItem, paymentsByOrder] = await Promise.all([
            db
                .select({
                    id: orderItemsTable.id,
                    orderId: orderItemsTable.orderId,
                    menuItemId: orderItemsTable.menuItemId,
                    name: menuItemsTable.name,
                    unitPrice: orderItemsTable.unitPrice,
                    quantity: orderItemsTable.quantity,
                })
                .from(orderItemsTable)
                .leftJoin(
                    menuItemsTable,
                    eq(orderItemsTable.menuItemId, menuItemsTable.id),
                )
                .where(inArray(orderItemsTable.orderId, orderIds)),
            this.batchLoadModifiers(db, orderIds),
            paymentRepository.findByOrderIds(orderIds),
        ]);

        // Group items by order and build ordered items list
        const itemsByOrder = new Map<string, (typeof items)[number][]>();
        for (const item of items) {
            const list = itemsByOrder.get(item.orderId) || [];
            list.push(item);
            itemsByOrder.set(item.orderId, list);
        }

        const data = ordersHeaders.map((o) => {
            const orderItems = itemsByOrder.get(o.id) || [];
            const itemsWithModifiers = orderItems.map((item) => ({
                ...item,
                name: item.name!,
                modifiers: modifiersByItem.get(item.id) || [],
            }));

            return {
                id: o.id,
                orderNumber: o.orderNumber,
                receiptNumber: o.receiptNumber,
                status: o.status as OrderStatus,
                diningOption: o.diningOption as DiningOption,
                subtotal: o.subtotal,
                discountId: o.discountId,
                discountAmount: o.discountAmount,
                total: o.total,
                paymentStatus: o.paymentStatus as PaymentStatus,
                createdBy: { id: o.createdById, name: o.createdByName! },
                confirmedBy: {
                    id: o.confirmedById,
                    name: o.confirmedByName!,
                },
                voidRequestedBy: o.voidRequestedById
                    ? {
                          id: o.voidRequestedById,
                          name: o.voidRequestedByName!,
                      }
                    : null,
                voidRequestedAt: o.voidRequestedAt,
                voidApprovedBy: o.voidApprovedById
                    ? {
                          id: o.voidApprovedById,
                          name: o.voidApprovedByName!,
                      }
                    : null,
                voidApprovedAt: o.voidApprovedAt,
                voidRejectedAt: o.voidRejectedAt,
                voidReason: o.voidReason,
                items: itemsWithModifiers,
                payments: paymentsByOrder.get(o.id) || [],
                createdAt: o.createdAt,
                updatedAt: o.updatedAt,
            };
        });

        return {
            data,
            total,
            page: Math.floor(offset / limit) + 1,
            limit,
        };
    }

    private async batchLoadModifiers(
        client: typeof db,
        orderIds: string[],
    ): Promise<Map<string, OrderItemModifier[]>> {
        const modifiersByItem = new Map<string, OrderItemModifier[]>();
        if (orderIds.length === 0) return modifiersByItem;

        // Get item IDs for these orders
        const itemRows = await client
            .select({ id: orderItemsTable.id })
            .from(orderItemsTable)
            .where(inArray(orderItemsTable.orderId, orderIds));

        const itemIds = itemRows.map((i) => i.id);
        if (itemIds.length === 0) return modifiersByItem;

        const allModifiers = await client
            .select({
                id: orderItemModifiersTable.id,
                orderItemId: orderItemModifiersTable.orderItemId,
                modifierOptionId: orderItemModifiersTable.modifierOptionId,
                modifierGroupId: modifierGroupsTable.id,
                groupName: modifierGroupsTable.name,
                name: modifierOptionsTable.name,
                price: orderItemModifiersTable.price,
            })
            .from(orderItemModifiersTable)
            .leftJoin(
                modifierOptionsTable,
                eq(
                    orderItemModifiersTable.modifierOptionId,
                    modifierOptionsTable.id,
                ),
            )
            .leftJoin(
                modifierGroupsTable,
                eq(
                    modifierOptionsTable.modifierGroupId,
                    modifierGroupsTable.id,
                ),
            )
            .where(inArray(orderItemModifiersTable.orderItemId, itemIds));

        for (const modifier of allModifiers) {
            const list = modifiersByItem.get(modifier.orderItemId) || [];
            list.push({
                id: modifier.id,
                modifierOptionId: modifier.modifierOptionId,
                modifierGroupId: modifier.modifierGroupId!,
                groupName: modifier.groupName!,
                name: modifier.name!,
                price: modifier.price,
            });
            modifiersByItem.set(modifier.orderItemId, list);
        }

        return modifiersByItem;
    }

    async updateStatus(id: string, status: OrderStatus): Promise<Order | null> {
        await db
            .update(ordersTable)
            .set({ status, updatedAt: new Date() })
            .where(eq(ordersTable.id, id));

        return this.findById(id);
    }

    async updatePaymentStatus(
        id: string,
        paymentStatus: PaymentStatus,
        tx?: any,
    ): Promise<void> {
        const dbClient = tx || db;
        await dbClient
            .update(ordersTable)
            .set({ paymentStatus, updatedAt: new Date() })
            .where(eq(ordersTable.id, id));
    }

    async requestVoid(
        id: string,
        requestedBy: string,
        reason: string,
    ): Promise<Order | null> {
        await db
            .update(ordersTable)
            .set({
                status: "void_requested",
                voidRequestedBy: requestedBy,
                voidRequestedAt: new Date(),
                voidReason: reason,
                updatedAt: new Date(),
            })
            .where(eq(ordersTable.id, id));

        return this.findById(id);
    }

    async approveVoid(
        id: string,
        approvedBy: string,
        tx?: any,
    ): Promise<Order | null> {
        const dbClient = tx || db;
        await dbClient
            .update(ordersTable)
            .set({
                status: "voided",
                voidApprovedBy: approvedBy,
                voidApprovedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(ordersTable.id, id));

        return this.findById(id, dbClient);
    }

    async rejectVoid(id: string): Promise<Order | null> {
        await db
            .update(ordersTable)
            .set({
                status: "pending",
                voidRejectedAt: new Date(),
                voidRequestedBy: null,
                voidRequestedAt: null,
                voidReason: null,
                updatedAt: new Date(),
            })
            .where(eq(ordersTable.id, id));

        return this.findById(id);
    }
}

export const orderRepository = new OrderRepository();
