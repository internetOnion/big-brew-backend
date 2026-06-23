import { eq, inArray } from "drizzle-orm";
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
        // Validate menu items exist
        const menuItemIds = [
            ...new Set(input.items.map((item) => item.menuItemId)),
        ];
        const existingMenuItems = await db
            .select({ id: menuItemsTable.id })
            .from(menuItemsTable)
            .where(inArray(menuItemsTable.id, menuItemIds));
        const existingMenuItemIds = new Set(existingMenuItems.map((m) => m.id));
        for (const id of menuItemIds) {
            if (!existingMenuItemIds.has(id)) {
                throw AppError.notFound(`Menu item with ID ${id} not found`);
            }
        }

        // Validate modifier options exist
        const modifierOptionIds = [
            ...new Set(input.items.flatMap((item) => item.modifierOptionIds)),
        ];
        if (modifierOptionIds.length > 0) {
            const existingModOptions = await db
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

        // Create the order
        const order = await orderRepository.create(input);

        // Deduct stock for each item
        await this.deductStock(order.id, input.items);

        // Process payment if provided
        if (paymentMethod) {
            await paymentService.processPayment(
                order.id,
                paymentMethod,
                input.createdBy,
                amountReceived,
            );
        }

        // Return the order with payments
        return this.getOrder(order.id);
    }

    private async deductStock(
        orderId: string,
        items: CreateOrderInput["items"],
    ): Promise<void> {
        const stockMovements: Array<{
            ingredientId: string;
            quantityChange: string;
            reason: "order_placed";
            referenceOrderId: string;
        }> = [];

        const menuItemIds = [...new Set(items.map((i) => i.menuItemId))];
        const modifierOptionIds = [
            ...new Set(items.flatMap((i) => i.modifierOptionIds)),
        ];

        // Batch-load recipes and modifier ingredients in parallel
        const [recipes, modIngredients] = await Promise.all([
            menuItemIds.length > 0
                ? db
                      .select()
                      .from(itemRecipesTable)
                      .where(inArray(itemRecipesTable.itemId, menuItemIds))
                : ([] as (typeof itemRecipesTable.$inferSelect)[]),
            modifierOptionIds.length > 0
                ? db
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

        for (const item of items) {
            const itemRecipes = recipesByItemId.get(item.menuItemId) || [];
            for (const recipe of itemRecipes) {
                stockMovements.push({
                    ingredientId: recipe.ingredientId,
                    quantityChange: (
                        -parseFloat(recipe.quantity) * item.quantity
                    ).toString(),
                    reason: "order_placed",
                    referenceOrderId: orderId,
                });
            }

            for (const modId of item.modifierOptionIds) {
                const optionIngredients =
                    modIngredientsByOptionId.get(modId) || [];
                for (const modIng of optionIngredients) {
                    stockMovements.push({
                        ingredientId: modIng.ingredientId,
                        quantityChange: (
                            -parseFloat(modIng.quantity) * item.quantity
                        ).toString(),
                        reason: "order_placed",
                        referenceOrderId: orderId,
                    });
                }
            }
        }

        if (stockMovements.length > 0) {
            await db.insert(stockMovementsTable).values(stockMovements);
        }
    }

    private async restoreStock(orderId: string): Promise<void> {
        const order = await orderRepository.findById(orderId);
        if (!order) return;

        const stockMovements: Array<{
            ingredientId: string;
            quantityChange: string;
            reason: "order_voided";
            referenceOrderId: string;
        }> = [];

        const menuItemIds = [...new Set(order.items.map((i) => i.menuItemId))];
        const modifierOptionIds = [
            ...new Set(
                order.items.flatMap((i) =>
                    i.modifiers.map((m) => m.modifierOptionId),
                ),
            ),
        ];

        const [recipes, modIngredients] = await Promise.all([
            menuItemIds.length > 0
                ? db
                      .select()
                      .from(itemRecipesTable)
                      .where(inArray(itemRecipesTable.itemId, menuItemIds))
                : ([] as (typeof itemRecipesTable.$inferSelect)[]),
            modifierOptionIds.length > 0
                ? db
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

        for (const item of order.items) {
            const itemRecipes = recipesByItemId.get(item.menuItemId) || [];
            for (const recipe of itemRecipes) {
                stockMovements.push({
                    ingredientId: recipe.ingredientId,
                    quantityChange: (
                        parseFloat(recipe.quantity) * item.quantity
                    ).toString(),
                    reason: "order_voided",
                    referenceOrderId: orderId,
                });
            }

            for (const mod of item.modifiers) {
                const optionIngredients =
                    modIngredientsByOptionId.get(mod.modifierOptionId) || [];
                for (const modIng of optionIngredients) {
                    stockMovements.push({
                        ingredientId: modIng.ingredientId,
                        quantityChange: (
                            parseFloat(modIng.quantity) * item.quantity
                        ).toString(),
                        reason: "order_voided",
                        referenceOrderId: orderId,
                    });
                }
            }
        }

        if (stockMovements.length > 0) {
            await db.insert(stockMovementsTable).values(stockMovements);
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
        const order = await this.getOrder(id);

        if (order.status !== "void_requested") {
            throw AppError.badRequest("No pending void request for this order");
        }

        // Restore stock
        await this.restoreStock(id);

        const updated = await orderRepository.approveVoid(id, approvedBy);
        if (!updated) {
            throw AppError.notFound("Order not found");
        }
        return updated;
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
