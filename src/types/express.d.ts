import type { employeeRoleEnum } from "../models/schema/enums.ts";

type EmployeeRole = (typeof employeeRoleEnum.enumValues)[number];

declare global {
    namespace Express {
        interface Request {
            employee?: {
                id: string;
                role: EmployeeRole;
                name: string;
                supabaseUid: string | null;
            };
        }
    }
}
