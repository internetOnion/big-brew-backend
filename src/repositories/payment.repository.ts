import { eq } from "drizzle-orm";
import { db } from "../models/index.ts";
import { paymentsTable, employeesTable } from "../models/schema/index.ts";
import type { PaymentMethod, PaymentStatus } from "../types/index.ts";

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
    async create(input: CreatePaymentInput): Promise<Payment> {
        const [payment] = await db
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

        return this.findById(payment.id) as Promise<Payment>;
    }

    async findById(id: string): Promise<Payment | null> {
        const result = await db
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

    async refund(id: string): Promise<Payment | null> {
        await db
            .update(paymentsTable)
            .set({ status: "refunded", updatedAt: new Date() })
            .where(eq(paymentsTable.id, id));

        return this.findById(id);
    }
}

export const paymentRepository = new PaymentRepository();
