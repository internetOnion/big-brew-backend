import bcrypt from "bcrypt";
import { supabaseAdmin } from "../lib/supabase.ts";
import { AppError } from "../utils/AppError.ts";
import { logger } from "../utils/logger.ts";
import { formatEmployee } from "../utils/formatEmployee.ts";
import {
    employeeRepository,
    type UpdateEmployee,
} from "../repositories/index.ts";
import type { EmployeePayload } from "../types/index.ts";

const SALT_ROUNDS = 10;

interface UpdateEmployeeInput {
    name?: string;
    email?: string;
    pin?: string;
    password?: string;
}

export class EmployeeService {
    async getEmployeeById(id: string): Promise<EmployeePayload> {
        const employee = await employeeRepository.findById(id);
        if (!employee || !employee.isActive) {
            throw AppError.notFound("Employee not found");
        }

        let email: string | undefined;
        if (employee.supabaseUid) {
            const { data: userData } =
                await supabaseAdmin.auth.admin.getUserById(
                    employee.supabaseUid,
                );
            email = userData?.user?.email;
        }

        return formatEmployee(employee, email);
    }

    async updateEmployee(
        id: string,
        input: UpdateEmployeeInput,
    ): Promise<EmployeePayload> {
        const employee = await employeeRepository.findById(id);
        if (!employee || !employee.isActive) {
            throw AppError.notFound("Employee not found");
        }

        const { name, email, pin, password } = input;

        if (pin) {
            const employees = await employeeRepository.findActiveEmployees();
            for (const emp of employees) {
                if (!emp.pin || emp.id === id) continue;
                const match = await bcrypt.compare(pin, emp.pin);
                if (match) {
                    throw AppError.conflict("PIN already in use");
                }
            }
        }

        let originalEmail: string | undefined;
        if ((email || password) && employee.supabaseUid) {
            const { data: userData } =
                await supabaseAdmin.auth.admin.getUserById(
                    employee.supabaseUid,
                );
            originalEmail = userData?.user?.email;
        }

        if (email || password) {
            if (!employee.supabaseUid) {
                throw AppError.badRequest(
                    "Employee has no linked auth account",
                );
            }

            const updateData: { email?: string; password?: string } = {};
            if (email) updateData.email = email;
            if (password) updateData.password = password;

            const { error } = await supabaseAdmin.auth.admin.updateUserById(
                employee.supabaseUid,
                updateData,
            );

            if (error) {
                if (error.status === 422) {
                    throw AppError.conflict("Email already registered");
                }
                throw AppError.internal("Failed to update auth user");
            }
        }

        try {
            const dbUpdate: UpdateEmployee = {};
            if (name !== undefined) dbUpdate.name = name;
            if (pin !== undefined) {
                dbUpdate.pin = await bcrypt.hash(pin, SALT_ROUNDS);
            }

            let resultEmployee: typeof employee;
            if (Object.keys(dbUpdate).length > 0) {
                resultEmployee = await employeeRepository.update(id, dbUpdate);
            } else {
                resultEmployee = employee;
            }

            let finalEmail = email ?? originalEmail;
            if (finalEmail === undefined && employee.supabaseUid) {
                const { data: userData } =
                    await supabaseAdmin.auth.admin.getUserById(
                        employee.supabaseUid,
                    );
                finalEmail = userData?.user?.email;
            }

            return formatEmployee(resultEmployee, finalEmail);
        } catch (err) {
            if (email && originalEmail && employee.supabaseUid) {
                try {
                    await supabaseAdmin.auth.admin.updateUserById(
                        employee.supabaseUid,
                        { email: originalEmail },
                    );
                } catch (rollbackErr) {
                    logger.error(
                        rollbackErr as Error,
                        "Failed to rollback Supabase email after DB update failure",
                    );
                }
            }

            throw err;
        }
    }

    async deleteEmployee(id: string): Promise<void> {
        const employee = await employeeRepository.findById(id);
        if (!employee || !employee.isActive) {
            throw AppError.notFound("Employee not found");
        }
        await employeeRepository.delete(id);

        if (employee.supabaseUid) {
            try {
                await supabaseAdmin.auth.admin.deleteUser(employee.supabaseUid);
            } catch (err) {
                logger.error(
                    err as Error,
                    "Failed to delete Supabase auth user during employee deletion",
                );
            }
        }
    }
}

export const employeeService = new EmployeeService();
