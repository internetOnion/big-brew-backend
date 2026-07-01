import { AppError } from "../utils/AppError.ts";
import {
    paymentRepository,
    type Payment,
} from "../repositories/payment.repository.ts";
import { orderRepository } from "../repositories/order.repository.ts";
import type { PaymentMethod } from "../types/index.ts";

export class PaymentService {
    async processPayment(
        orderId: string,
        method: PaymentMethod,
        createdBy: string,
        amountReceived?: number,
    ): Promise<Payment> {
        // Get the order to validate
        const order = await orderRepository.findById(orderId);
        if (!order) {
            throw AppError.notFound("Order not found");
        }

        if (order.paymentStatus === "paid") {
            throw AppError.badRequest("Order is already paid");
        }

        const total = parseFloat(order.total);

        // Validate cash payment
        if (method === "cash") {
            if (amountReceived === undefined || amountReceived === null) {
                throw AppError.badRequest(
                    "Amount received is required for cash payments",
                );
            }

            if (amountReceived < total) {
                throw AppError.badRequest(
                    "Amount received is less than the total",
                );
            }
        }

        // Create the payment
        const payment = await paymentRepository.create({
            orderId,
            method,
            amount: total,
            amountReceived: method === "cash" ? amountReceived : undefined,
            changeAmount:
                method === "cash" && amountReceived
                    ? amountReceived - total
                    : undefined,
            createdBy,
        });

        // Update order payment status
        await orderRepository.updatePaymentStatus(orderId, "paid");

        return payment;
    }

    async getPayment(id: string): Promise<Payment> {
        const payment = await paymentRepository.findById(id);
        if (!payment) {
            throw AppError.notFound("Payment not found");
        }
        return payment;
    }

    async getPaymentsByOrderId(orderId: string): Promise<Payment[]> {
        return paymentRepository.findByOrderId(orderId);
    }

    async refundPayment(id: string): Promise<Payment> {
        const payment = await paymentRepository.findById(id);
        if (!payment) {
            throw AppError.notFound("Payment not found");
        }

        if (payment.status === "refunded") {
            throw AppError.badRequest("Payment is already refunded");
        }

        const refunded = await paymentRepository.refund(id);

        // Update order payment status
        await orderRepository.updatePaymentStatus(payment.orderId, "refunded");

        return refunded!;
    }
}

export const paymentService = new PaymentService();
