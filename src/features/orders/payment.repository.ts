import { eq, inArray } from "drizzle-orm";
import { db } from "../../shared/models/index.ts";
import {
    paymentsTable,
    employeesTable,
} from "../../shared/models/schema/index.ts";
import type { PaymentMethod, PaymentStatus } from "../../shared/types/index.ts";

export interface Payment {
    id: string;
    orderId: string;
    method: PaymentMethod;
    amount: string;
    amountReceived: string | null;
    changeAmount: string | null;
    status: PaymentStatus;
    createdBy: { id: string; name: string | null };
    createdAt: Date;
    updatedAt: Date;
}

export interface CreatePaymentInput {
    orderId: string;
    method: PaymentMethod;
    amount: number;
    amountReceived?: number;
    changeAmount?: number;
    createdBy: string;
}

export class PaymentRepository {
    async create(input: CreatePaymentInput, tx?: any): Promise<Payment> {
        const dbClient = tx || db;
        const [payment] = await dbClient
            .insert(paymentsTable)
            .values({
                orderId: input.orderId,
                method: input.method,
                amount: input.amount.toFixed(2),
                amountReceived: input.amountReceived?.toFixed(2),
                changeAmount: input.changeAmount?.toFixed(2),
                createdBy: input.createdBy,
                status: "paid",
            })
            .returning();

        return this.findById(payment.id, dbClient) as Promise<Payment>;
    }

    async findById(id: string, tx?: any): Promise<Payment | null> {
        const dbClient = tx || db;
        const result = await dbClient
            .select({
                id: paymentsTable.id,
                orderId: paymentsTable.orderId,
                method: paymentsTable.method,
                amount: paymentsTable.amount,
                amountReceived: paymentsTable.amountReceived,
                changeAmount: paymentsTable.changeAmount,
                status: paymentsTable.status,
                createdAt: paymentsTable.createdAt,
                updatedAt: paymentsTable.updatedAt,
                createdById: paymentsTable.createdBy,
                createdByName: employeesTable.name,
            })
            .from(paymentsTable)
            .leftJoin(
                employeesTable,
                eq(paymentsTable.createdBy, employeesTable.id),
            )
            .where(eq(paymentsTable.id, id))
            .limit(1);

        if (!result[0]) return null;

        const p = result[0];
        return {
            id: p.id,
            orderId: p.orderId,
            method: p.method as PaymentMethod,
            amount: p.amount,
            amountReceived: p.amountReceived,
            changeAmount: p.changeAmount,
            status: p.status as PaymentStatus,
            createdBy: { id: p.createdById, name: p.createdByName },
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
        };
    }

    async findByOrderId(orderId: string): Promise<Payment[]> {
        const results = await db
            .select({
                id: paymentsTable.id,
                orderId: paymentsTable.orderId,
                method: paymentsTable.method,
                amount: paymentsTable.amount,
                amountReceived: paymentsTable.amountReceived,
                changeAmount: paymentsTable.changeAmount,
                status: paymentsTable.status,
                createdAt: paymentsTable.createdAt,
                updatedAt: paymentsTable.updatedAt,
                createdById: paymentsTable.createdBy,
                createdByName: employeesTable.name,
            })
            .from(paymentsTable)
            .leftJoin(
                employeesTable,
                eq(paymentsTable.createdBy, employeesTable.id),
            )
            .where(eq(paymentsTable.orderId, orderId));

        return results.map((p) => ({
            id: p.id,
            orderId: p.orderId,
            method: p.method as PaymentMethod,
            amount: p.amount,
            amountReceived: p.amountReceived,
            changeAmount: p.changeAmount,
            status: p.status as PaymentStatus,
            createdBy: { id: p.createdById, name: p.createdByName },
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
        }));
    }

    async findByOrderIds(orderIds: string[]): Promise<Map<string, Payment[]>> {
        if (orderIds.length === 0) {
            return new Map();
        }

        const results = await db
            .select({
                id: paymentsTable.id,
                orderId: paymentsTable.orderId,
                method: paymentsTable.method,
                amount: paymentsTable.amount,
                amountReceived: paymentsTable.amountReceived,
                changeAmount: paymentsTable.changeAmount,
                status: paymentsTable.status,
                createdAt: paymentsTable.createdAt,
                updatedAt: paymentsTable.updatedAt,
                createdById: paymentsTable.createdBy,
                createdByName: employeesTable.name,
            })
            .from(paymentsTable)
            .leftJoin(
                employeesTable,
                eq(paymentsTable.createdBy, employeesTable.id),
            )
            .where(inArray(paymentsTable.orderId, orderIds));

        const paymentsByOrder = new Map<string, Payment[]>();
        for (const p of results) {
            const payment: Payment = {
                id: p.id,
                orderId: p.orderId,
                method: p.method as PaymentMethod,
                amount: p.amount,
                amountReceived: p.amountReceived,
                changeAmount: p.changeAmount,
                status: p.status as PaymentStatus,
                createdBy: { id: p.createdById, name: p.createdByName },
                createdAt: p.createdAt,
                updatedAt: p.updatedAt,
            };
            const list = paymentsByOrder.get(p.orderId) || [];
            list.push(payment);
            paymentsByOrder.set(p.orderId, list);
        }

        return paymentsByOrder;
    }

    async refund(id: string, tx?: any): Promise<Payment | null> {
        const dbClient = tx || db;
        await dbClient
            .update(paymentsTable)
            .set({ status: "refunded", updatedAt: new Date() })
            .where(eq(paymentsTable.id, id));

        return this.findById(id, dbClient);
    }
}

export const paymentRepository = new PaymentRepository();
