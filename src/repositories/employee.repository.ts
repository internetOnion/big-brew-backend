import { eq } from "drizzle-orm";
import { db } from "../models/index.ts";
import { employeesTable } from "../models/schema/index.ts";
import type { employeeRoleEnum } from "../models/schema/enums.ts";

type EmployeeRole = (typeof employeeRoleEnum.enumValues)[number];

export interface InsertEmployee {
    name: string;
    role: EmployeeRole;
    pin: string;
    supabaseUid: string;
}

export interface UpdateEmployee {
    name?: string;
    pin?: string;
}

export interface Employee {
    id: string;
    role: EmployeeRole;
    name: string;
    pin: string;
    supabaseUid: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export class EmployeeRepository {
    async findById(id: string): Promise<Employee | null> {
        const result = await db.query.employeesTable.findFirst({
            where: eq(employeesTable.id, id),
        });
        return result ?? null;
    }

    async findBySupabaseUid(supabaseUid: string): Promise<Employee | null> {
        const result = await db.query.employeesTable.findFirst({
            where: eq(employeesTable.supabaseUid, supabaseUid),
        });
        return result ?? null;
    }

    async findByPin(pin: string): Promise<Employee | null> {
        const result = await db.query.employeesTable.findFirst({
            where: eq(employeesTable.pin, pin),
        });
        return result ?? null;
    }

    async findActiveEmployees(): Promise<Employee[]> {
        return db
            .select()
            .from(employeesTable)
            .where(eq(employeesTable.isActive, true));
    }

    async insert(data: InsertEmployee): Promise<Employee> {
        const result = await db.insert(employeesTable).values(data).returning();
        return result[0];
    }

    async update(id: string, data: UpdateEmployee): Promise<Employee> {
        const result = await db
            .update(employeesTable)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(employeesTable.id, id))
            .returning();
        return result[0];
    }
}

export const employeeRepository = new EmployeeRepository();
