import bcrypt from "bcrypt";
import { clerkClient } from "../../shared/lib/clerk.ts";
import { AppError } from "../../shared/utils/AppError.ts";
import { logger } from "../../shared/utils/logger.ts";
import { formatEmployee } from "../../shared/utils/formatEmployee.ts";
import {
    employeeRepository,
    type UpdateEmployee,
} from "./employee.repository.ts";
import type { EmployeePayload } from "../../shared/types/index.ts";

const SALT_ROUNDS = 10;

interface UpdateEmployeeInput {
    name?: string;
    email?: string;
    pin?: string;
    password?: string;
    isActive?: boolean;
}

export class EmployeeService {
    async listEmployees(): Promise<EmployeePayload[]> {
        const employees = await employeeRepository.findAll();
        const results: EmployeePayload[] = [];
        for (const emp of employees) {
            let email: string | undefined;
            if (emp.clerkUserId) {
                try {
                    const clerkUser = await clerkClient.users.getUser(
                        emp.clerkUserId,
                    );
                    email = clerkUser.emailAddresses?.find(
                        (e) => e.id === clerkUser.primaryEmailAddressId,
                    )?.emailAddress;
                } catch {
                    // ponytail: clerk fetch failure is non-critical
                }
            }
            results.push(formatEmployee(emp, email));
        }
        return results;
    }

    async getEmployeeById(id: string): Promise<EmployeePayload> {
        const employee = await employeeRepository.findById(id);
        if (!employee || !employee.isActive) {
            throw AppError.notFound("Employee not found");
        }

        let email: string | undefined;
        if (employee.clerkUserId) {
            try {
                const clerkUser = await clerkClient.users.getUser(
                    employee.clerkUserId,
                );
                email = clerkUser.emailAddresses?.find(
                    (e) => e.id === clerkUser.primaryEmailAddressId,
                )?.emailAddress;
            } catch {
                // ponytail: clerk fetch failure is non-critical
            }
        }

        return formatEmployee(employee, email);
    }

    async updateEmployee(
        id: string,
        input: UpdateEmployeeInput,
    ): Promise<EmployeePayload> {
        const employee = await employeeRepository.findById(id);
        if (!employee) {
            throw AppError.notFound("Employee not found");
        }

        const { name, email, pin, password, isActive } = input;

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
        if ((email || password) && employee.clerkUserId) {
            try {
                const clerkUser = await clerkClient.users.getUser(
                    employee.clerkUserId,
                );
                originalEmail = clerkUser.emailAddresses?.find(
                    (e) => e.id === clerkUser.primaryEmailAddressId,
                )?.emailAddress;
            } catch {
                // ponytail: clerk fetch failure is non-critical
            }
        }

        if (email || password) {
            if (!employee.clerkUserId) {
                throw AppError.badRequest(
                    "Employee has no linked auth account",
                );
            }

            try {
                if (password) {
                    await clerkClient.users.updateUser(employee.clerkUserId, {
                        password,
                    });
                }
                if (email) {
                    const newEmail =
                        await clerkClient.emailAddresses.createEmailAddress({
                            userId: employee.clerkUserId,
                            emailAddress: email,
                        });
                    await clerkClient.users.updateUser(employee.clerkUserId, {
                        primaryEmailAddressID: newEmail.id,
                    });
                }
            } catch (err: any) {
                if (err?.errors?.[0]?.code === "form_identifier_exists") {
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
            if (isActive !== undefined) dbUpdate.isActive = isActive;

            let resultEmployee: typeof employee;
            if (Object.keys(dbUpdate).length > 0) {
                resultEmployee = await employeeRepository.update(id, dbUpdate);
            } else {
                resultEmployee = employee;
            }

            let finalEmail = email ?? originalEmail;
            if (finalEmail === undefined && employee.clerkUserId) {
                try {
                    const clerkUser = await clerkClient.users.getUser(
                        employee.clerkUserId,
                    );
                    finalEmail = clerkUser.emailAddresses?.find(
                        (e) => e.id === clerkUser.primaryEmailAddressId,
                    )?.emailAddress;
                } catch {
                    // ponytail: clerk fetch failure is non-critical
                }
            }

            return formatEmployee(resultEmployee, finalEmail);
        } catch (err) {
            if (email && originalEmail && employee.clerkUserId) {
                try {
                    const rollbackEmail =
                        await clerkClient.emailAddresses.createEmailAddress({
                            userId: employee.clerkUserId,
                            emailAddress: originalEmail,
                        });
                    await clerkClient.users.updateUser(employee.clerkUserId, {
                        primaryEmailAddressID: rollbackEmail.id,
                    });
                } catch (rollbackErr) {
                    logger.error(
                        rollbackErr as Error,
                        "Failed to rollback Clerk email after DB update failure",
                    );
                }
            }

            throw err;
        }
    }

    async deleteEmployee(id: string): Promise<void> {
        const employee = await employeeRepository.findById(id);
        if (!employee) {
            throw AppError.notFound("Employee not found");
        }
        await employeeRepository.delete(id);

        if (employee.clerkUserId) {
            try {
                await clerkClient.users.deleteUser(employee.clerkUserId);
            } catch (err) {
                logger.error(
                    err as Error,
                    "Failed to delete Clerk user during employee deletion",
                );
            }
        }
    }
}

export const employeeService = new EmployeeService();
