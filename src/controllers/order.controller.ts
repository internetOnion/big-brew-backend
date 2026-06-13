import type { Request, Response } from "express";
import { orderService, paymentService } from "../services/index.ts";

export class OrderController {
    async createOrder(req: Request, res: Response) {
        const {
            dining_option,
            discount_id,
            items,
            payment_method,
            amount_received,
        } = req.body;
        const employeeId = req.employee!.id;

        const order = await orderService.createOrder(
            {
                diningOption: dining_option,
                discountId: discount_id,
                items: items.map((item: any) => ({
                    menuItemId: item.menu_item_id,
                    quantity: item.quantity,
                    unitPrice: item.unit_price,
                    modifierOptionIds: item.modifier_option_ids || [],
                })),
                createdBy: employeeId,
            },
            payment_method,
            amount_received,
        );

        return res.status(201).json(order);
    }

    async getOrder(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const order = await orderService.getOrder(id);
        return res.json(order);
    }

    async listOrders(req: Request, res: Response) {
        const { status, created_by_id, limit, offset } = req.query;

        const filters: any = {};
        if (status) {
            filters.status = (status as string).split(",");
        }
        if (created_by_id) {
            filters.createdById = created_by_id as string;
        }
        if (limit) {
            filters.limit = parseInt(limit as string, 10);
        }
        if (offset) {
            filters.offset = parseInt(offset as string, 10);
        }

        const orders = await orderService.listOrders(filters);
        return res.json(orders);
    }

    async updateOrderStatus(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const { status } = req.body;
        const employeeId = req.employee!.id;
        const employeeRole = req.employee!.role;

        const order = await orderService.updateOrderStatus(
            id,
            status,
            employeeId,
            employeeRole,
        );

        return res.json(order);
    }

    async processPayment(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const { payment_method, amount_received, notes } = req.body;
        const employeeId = req.employee!.id;

        const order = await orderService.processPayment(
            id,
            payment_method,
            employeeId,
            amount_received,
        );

        return res.json(order);
    }

    async requestVoid(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const { reason } = req.body;
        const employeeId = req.employee!.id;

        const order = await orderService.requestVoid(id, employeeId, reason);
        return res.json(order);
    }

    async approveVoid(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const employeeId = req.employee!.id;

        const order = await orderService.approveVoid(id, employeeId);
        return res.json(order);
    }

    async rejectVoid(req: Request, res: Response) {
        const { id } = req.params as { id: string };

        const order = await orderService.rejectVoid(id);
        return res.json(order);
    }

    async getPayments(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const payments = await paymentService.getPaymentsByOrderId(id);
        return res.json(payments);
    }
}

export const orderController = new OrderController();
