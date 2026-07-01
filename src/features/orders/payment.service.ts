import { AppError } from "../../shared/utils/AppError.ts";
import { paymentRepository, type Payment } from "./payment.repository.ts";
import { orderRepository } from "./order.repository.ts";
import { db } from "../../shared/models/index.ts";
import type { PaymentMethod } from "../../shared/types/index.ts";

export class PaymentService {
    async processPayment(
        orderId: string,
        method: PaymentMethod,
        createdBy: string,
        amountReceived?: number,
        tx?: any,
    ): Promise<Payment> {
        const run = async (client: any): Promise<Payment> => {
            const order = await orderRepository.findByIdForUpdate(
                orderId,
                client,
            );
            if (!order) {
                throw AppError.notFound("Order not found");
            }

            if (order.paymentStatus === "paid") {
                throw AppError.badRequest("Order is already paid");
            }

            const total = parseFloat(order.total);

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

            const payment = await paymentRepository.create(
                {
                    orderId,
                    method,
                    amount: total,
                    amountReceived:
                        method === "cash" ? amountReceived : undefined,
                    changeAmount:
                        method === "cash" && amountReceived
                            ? amountReceived - total
                            : undefined,
                    createdBy,
                },
                client,
            );

            await orderRepository.updatePaymentStatus(orderId, "paid", client);

            return payment;
        };

        // ponytail: if caller is already in a transaction, use it; otherwise wrap
        if (tx) {
            return run(tx);
        }
        return db.transaction(run);
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
        return db.transaction(async (tx) => {
            const payment = await paymentRepository.findById(id, tx);
            if (!payment) {
                throw AppError.notFound("Payment not found");
            }

            if (payment.status === "refunded") {
                throw AppError.badRequest("Payment is already refunded");
            }

            const order = await orderRepository.findByIdForUpdate(
                payment.orderId,
                tx,
            );
            if (!order) {
                throw AppError.notFound("Order not found");
            }

            const refunded = await paymentRepository.refund(id, tx);

            await orderRepository.updatePaymentStatus(
                payment.orderId,
                "refunded",
                tx,
            );

            return refunded!;
        });
    }
}

export const paymentService = new PaymentService();
