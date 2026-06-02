import type { Employee } from "../repositories/index.ts";
import type { EmployeePayload } from "../types/index.ts";

export const formatEmployee = (employee: Employee): EmployeePayload => ({
    id: employee.id,
    role: employee.role,
    name: employee.name,
    supabaseUid: employee.supabaseUid,
});
