import { eq } from "drizzle-orm";
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
        for (const item of input.items) {
            const menuItem = await db
                .select()
                .from(menuItemsTable)
                .where(eq(menuItemsTable.id, item.menuItemId))
                .limit(1);

            if (!menuItem[0]) {
                throw AppError.notFound(
                    `Menu item with ID ${item.menuItemId} not found`,
                );
            }
        }

        // Validate modifier options exist
        for (const item of input.items) {
            for (const modId of item.modifierOptionIds) {
                const modOption = await db
                    .select()
                    .from(modifierOptionsTable)
                    .where(eq(modifierOptionsTable.id, modId))
                    .limit(1);

                if (!modOption[0]) {
                    throw AppError.notFound(
                        `Modifier option with ID ${modId} not found`,
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

        for (const item of items) {
            // Get recipe ingredients for this menu item
            const recipeIngredients = await db
                .select()
                .from(itemRecipesTable)
                .where(eq(itemRecipesTable.itemId, item.menuItemId));

            // Deduct base recipe ingredients
            for (const recipe of recipeIngredients) {
                stockMovements.push({
                    ingredientId: recipe.ingredientId,
                    quantityChange: (
                        -parseFloat(recipe.quantity) * item.quantity
                    ).toString(),
                    reason: "order_placed",
                    referenceOrderId: orderId,
                });
            }

            // Deduct modifier option ingredients
            for (const modId of item.modifierOptionIds) {
                const modIngredients = await db
                    .select()
                    .from(modifierOptionIngredientsTable)
                    .where(
                        eq(
                            modifierOptionIngredientsTable.modifierOptionId,
                            modId,
                        ),
                    );

                for (const modIng of modIngredients) {
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

        // Insert all stock movements
        if (stockMovements.length > 0) {
            await db.insert(stockMovementsTable).values(stockMovements);
        }
    }

    private async restoreStock(orderId: string): Promise<void> {
        // Get the order with items
        const order = await orderRepository.findById(orderId);
        if (!order) return;

        const stockMovements: Array<{
            ingredientId: string;
            quantityChange: string;
            reason: "order_voided";
            referenceOrderId: string;
        }> = [];

        for (const item of order.items) {
            // Get recipe ingredients for this menu item
            const recipeIngredients = await db
                .select()
                .from(itemRecipesTable)
                .where(eq(itemRecipesTable.itemId, item.menuItemId));

            // Restore base recipe ingredients
            for (const recipe of recipeIngredients) {
                stockMovements.push({
                    ingredientId: recipe.ingredientId,
                    quantityChange: (
                        parseFloat(recipe.quantity) * item.quantity
                    ).toString(),
                    reason: "order_voided",
                    referenceOrderId: orderId,
                });
            }

            // Restore modifier option ingredients
            for (const mod of item.modifiers) {
                const modIngredients = await db
                    .select()
                    .from(modifierOptionIngredientsTable)
                    .where(
                        eq(
                            modifierOptionIngredientsTable.modifierOptionId,
                            mod.modifierOptionId,
                        ),
                    );

                for (const modIng of modIngredients) {
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

        // Insert all stock movements
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

    async listOrders(filters: ListOrdersFilters): Promise<Order[]> {
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
