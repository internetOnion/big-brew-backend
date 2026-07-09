import type { Employee } from "../../features/employees/employee.repository.ts";
import type { EmployeePayload } from "../types/index.ts";

export const formatEmployee = (
    employee: Employee,
    email?: string,
): EmployeePayload => ({
    id: employee.id,
    role: employee.role,
    name: employee.name,
    clerkUserId: employee.clerkUserId,
    isActive: employee.isActive,
    ...(email !== undefined && { email }),
});
