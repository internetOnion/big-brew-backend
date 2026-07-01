import { eq, inArray, and } from "drizzle-orm";
import { AppError } from "../utils/AppError.ts";
import { db } from "../models/index.ts";
import {
    itemRecipesTable,
    modifierOptionIngredientsTable,
    stockMovementsTable,
    menuItemsTable,
    modifierOptionsTable,
} from "../models/schema/index.ts";
import {
    orderRepository,
    type Order,
    type CreateOrderInput,
    type ListOrdersFilters,
    type PaginatedOrdersResult,
} from "../repositories/index.ts";
import { paymentService } from "./payment.service.ts";
import type { PaymentMethod, EmployeeRole } from "../types/index.ts";

export class OrderService {
    async createOrder(
        input: CreateOrderInput,
        paymentMethod?: PaymentMethod,
        amountReceived?: number,
    ): Promise<Order> {
        const orderId = await db.transaction(async (tx) => {
            // Validate menu items exist
            const menuItemIds = [
                ...new Set(input.items.map((item) => item.menuItemId)),
            ];
            const existingMenuItems = await tx
                .select({ id: menuItemsTable.id })
                .from(menuItemsTable)
                .where(inArray(menuItemsTable.id, menuItemIds));
            const existingMenuItemIds = new Set(
                existingMenuItems.map((m) => m.id),
            );
            for (const id of menuItemIds) {
                if (!existingMenuItemIds.has(id)) {
                    throw AppError.notFound(
                        `Menu item with ID ${id} not found`,
                    );
                }
            }

            // Validate modifier options exist
            const modifierOptionIds = [
                ...new Set(
                    input.items.flatMap((item) => item.modifierOptionIds),
                ),
            ];
            if (modifierOptionIds.length > 0) {
                const existingModOptions = await tx
                    .select({ id: modifierOptionsTable.id })
                    .from(modifierOptionsTable)
                    .where(inArray(modifierOptionsTable.id, modifierOptionIds));
                const existingModOptionIds = new Set(
                    existingModOptions.map((m) => m.id),
                );
                for (const id of modifierOptionIds) {
                    if (!existingModOptionIds.has(id)) {
                        throw AppError.notFound(
                            `Modifier option with ID ${id} not found`,
                        );
                    }
                }
            }

            // Create the order (uses internal tx/savepoint — Drizzle handles nesting)
            const order = await orderRepository.create(input);

            // Deduct stock for each item
            await this.deductStock(order.id, input.items, tx);

            // Process payment if provided
            if (paymentMethod) {
                await paymentService.processPayment(
                    order.id,
                    paymentMethod,
                    input.createdBy,
                    amountReceived,
                    tx,
                );
            }

            return order.id;
        });

        return this.getOrder(orderId);
    }

    private async deductStock(
        orderId: string,
        items: CreateOrderInput["items"],
        tx?: any,
    ): Promise<void> {
        const dbClient = tx || db;

        const menuItemIds = [...new Set(items.map((i) => i.menuItemId))];
        const modifierOptionIds = [
            ...new Set(items.flatMap((i) => i.modifierOptionIds)),
        ];

        // Batch-load recipes and modifier ingredients in parallel
        const [recipes, modIngredients] = await Promise.all([
            menuItemIds.length > 0
                ? dbClient
                      .select()
                      .from(itemRecipesTable)
                      .where(inArray(itemRecipesTable.itemId, menuItemIds))
                : ([] as (typeof itemRecipesTable.$inferSelect)[]),
            modifierOptionIds.length > 0
                ? dbClient
                      .select()
                      .from(modifierOptionIngredientsTable)
                      .where(
                          inArray(
                              modifierOptionIngredientsTable.modifierOptionId,
                              modifierOptionIds,
                          ),
                      )
                : ([] as (typeof modifierOptionIngredientsTable.$inferSelect)[]),
        ]);

        // Build lookup maps
        const recipesByItemId = new Map<string, typeof recipes>();
        for (const r of recipes) {
            const list = recipesByItemId.get(r.itemId) || [];
            list.push(r);
            recipesByItemId.set(r.itemId, list);
        }

        const modIngredientsByOptionId = new Map<
            string,
            typeof modIngredients
        >();
        for (const mi of modIngredients) {
            const list =
                modIngredientsByOptionId.get(mi.modifierOptionId) || [];
            list.push(mi);
            modIngredientsByOptionId.set(mi.modifierOptionId, list);
        }

        // ponytail: aggregate per ingredient so stock_movements has one row per unique ingredient
        const totalsByIngredient = new Map<string, number>();

        for (const item of items) {
            const itemRecipes = recipesByItemId.get(item.menuItemId) || [];
            for (const recipe of itemRecipes) {
                const current =
                    totalsByIngredient.get(recipe.ingredientId) || 0;
                totalsByIngredient.set(
                    recipe.ingredientId,
                    current + parseFloat(recipe.quantity) * item.quantity,
                );
            }

            for (const modId of item.modifierOptionIds) {
                const optionIngredients =
                    modIngredientsByOptionId.get(modId) || [];
                for (const modIng of optionIngredients) {
                    const current =
                        totalsByIngredient.get(modIng.ingredientId) || 0;
                    totalsByIngredient.set(
                        modIng.ingredientId,
                        current + parseFloat(modIng.quantity) * item.quantity,
                    );
                }
            }
        }

        if (totalsByIngredient.size > 0) {
            const stockMovements = [...totalsByIngredient].map(
                ([ingredientId, quantity]) => ({
                    ingredientId,
                    quantityChange: (-quantity).toString(),
                    reason: "order_placed" as const,
                    referenceOrderId: orderId,
                }),
            );

            await dbClient.insert(stockMovementsTable).values(stockMovements);
        }
    }

    // ponytail: restores by negating original order_placed movements instead of re-reading recipes
    private async restoreStock(orderId: string, tx?: any): Promise<void> {
        const dbClient = tx || db;

        const originalMovements = await dbClient
            .select({
                ingredientId: stockMovementsTable.ingredientId,
                quantityChange: stockMovementsTable.quantityChange,
            })
            .from(stockMovementsTable)
            .where(
                and(
                    eq(stockMovementsTable.referenceOrderId, orderId),
                    eq(stockMovementsTable.reason, "order_placed"),
                ),
            );

        if (originalMovements.length > 0) {
            const stockMovements = originalMovements.map(
                (m: { ingredientId: string; quantityChange: string }) => ({
                    ingredientId: m.ingredientId,
                    quantityChange: (-parseFloat(m.quantityChange)).toString(),
                    reason: "order_voided" as const,
                    referenceOrderId: orderId,
                }),
            );

            await dbClient.insert(stockMovementsTable).values(stockMovements);
        }
    }

    async getOrder(id: string): Promise<Order> {
        const order = await orderRepository.findById(id);
        if (!order) {
            throw AppError.notFound("Order not found");
        }
        return order;
    }

    async listOrders(
        filters: ListOrdersFilters,
    ): Promise<PaginatedOrdersResult> {
        return orderRepository.list(filters);
    }

    async updateOrderStatus(
        id: string,
        status: "pending" | "completed",
        employeeId: string,
        employeeRole: EmployeeRole,
    ): Promise<Order> {
        const order = await this.getOrder(id);

        // Only baristas can mark orders as completed
        if (status === "completed" && employeeRole === "barista") {
            // Baristas can only complete their own orders
            if (order.createdBy.id !== employeeId) {
                throw AppError.forbidden(
                    "You can only complete your own orders",
                );
            }
        }

        // Validate status transition
        if (order.status !== "pending") {
            throw AppError.badRequest(
                `Cannot update order with status "${order.status}"`,
            );
        }

        const updated = await orderRepository.updateStatus(id, status);
        if (!updated) {
            throw AppError.notFound("Order not found");
        }
        return updated;
    }

    async processPayment(
        id: string,
        paymentMethod: PaymentMethod,
        createdBy: string,
        amountReceived?: number,
    ): Promise<Order> {
        // Delegate to payment service
        await paymentService.processPayment(
            id,
            paymentMethod,
            createdBy,
            amountReceived,
        );

        // Return the updated order
        return this.getOrder(id);
    }

    async requestVoid(
        id: string,
        requestedBy: string,
        reason: string,
    ): Promise<Order> {
        const order = await this.getOrder(id);

        if (order.status === "voided") {
            throw AppError.badRequest("Order is already voided");
        }

        if (order.status === "void_requested") {
            throw AppError.badRequest("Void request already pending");
        }

        const updated = await orderRepository.requestVoid(
            id,
            requestedBy,
            reason,
        );
        if (!updated) {
            throw AppError.notFound("Order not found");
        }
        return updated;
    }

    async approveVoid(id: string, approvedBy: string): Promise<Order> {
        return db.transaction(async (tx) => {
            // Lock the order row to prevent concurrent void approvals
            const order = await orderRepository.findByIdForUpdate(id, tx);
            if (!order) {
                throw AppError.notFound("Order not found");
            }

            if (order.status !== "void_requested") {
                throw AppError.badRequest(
                    "No pending void request for this order",
                );
            }

            // Update status to voided BEFORE restoring stock —
            // if restoreStock fails, the entire transaction rolls back
            await orderRepository.approveVoid(id, approvedBy, tx);

            await this.restoreStock(id, tx);

            return orderRepository.findById(id, tx) as Promise<Order>;
        });
    }

    async rejectVoid(id: string): Promise<Order> {
        const order = await this.getOrder(id);

        if (order.status !== "void_requested") {
            throw AppError.badRequest("No pending void request for this order");
        }

        const updated = await orderRepository.rejectVoid(id);
        if (!updated) {
            throw AppError.notFound("Order not found");
        }
        return updated;
    }
}

export const orderService = new OrderService();
