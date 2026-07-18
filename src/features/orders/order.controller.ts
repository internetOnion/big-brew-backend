import type { Request, Response } from "express";
import { authService } from "../auth/auth.service.ts";
import { orderService } from "./order.service.ts";
import { paymentService } from "./payment.service.ts";
import { AppError } from "../../shared/utils/AppError.ts";

export class OrderController {
    // ponytail: terminal or employee can place orders. Hold the actor
    // identity once per handler instead of repeating req.employee!.
    private getActor(req: Request): {
        id: string;
        role: "barista" | "manager" | "terminal";
        type: "employee" | "terminal";
    } {
        if (req.terminal) {
            return { id: req.terminal.id, role: "terminal", type: "terminal" };
        }
        if (req.employee) {
            return {
                id: req.employee.id,
                role: req.employee.role,
                type: "employee",
            };
        }
        throw AppError.unauthorized("Authentication required");
    }

    async createOrder(req: Request, res: Response) {
        const {
            dining_option,
            discount_id,
            items,
            payment_method,
            amount_received,
            pin,
        } = req.body;

        // PIN verification: barista/manager identity per order
        const employee = await authService.verifyPin(pin, req.ip ?? "unknown");

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
                createdBy: employee.id,
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
        const { status, created_by_id, limit, offset, from, to } = req.query;

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
        if (from) {
            filters.from = new Date(from as string);
        }
        if (to) {
            filters.to = new Date(to as string);
        }

        const result = await orderService.listOrders(filters);
        return res.json({
            data: result.data,
            pagination: {
                page: result.page,
                limit: result.limit,
                total: result.total,
                totalPages: Math.ceil(result.total / result.limit),
            },
        });
    }

    async updateOrderStatus(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const { status } = req.body;
        const actor = this.getActor(req);

        const order = await orderService.updateOrderStatus(
            id,
            status,
            actor.id,
            actor.role,
        );

        return res.json(order);
    }

    async processPayment(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const { payment_method, amount_received, notes: _notes } = req.body;
        const actor = this.getActor(req);

        const order = await orderService.processPayment(
            id,
            payment_method,
            actor.id,
            amount_received,
        );

        return res.json(order);
    }

    async requestVoid(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const { reason, verified_employee_id } = req.body;
        const actor = this.getActor(req);
        const requestedById = verified_employee_id || actor.id;

        const order = await orderService.requestVoid(id, requestedById, reason);
        return res.json(order);
    }

    async approveVoid(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const actor = this.getActor(req);

        const order = await orderService.approveVoid(id, actor.id);
        return res.json(order);
    }

    async voidWithPin(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const { pin, reason } = req.body;

        const employee = await authService.verifyPin(pin, req.ip ?? "unknown");

        if (employee.role === "manager") {
            await orderService.requestVoid(id, employee.id, reason);
            const order = await orderService.approveVoid(id, employee.id);
            return res.json(order);
        }

        const order = await orderService.requestVoid(id, employee.id, reason);
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
