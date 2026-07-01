import type { EmployeeRole, EmployeePayload } from "./index.ts";

declare global {
    namespace Express {
        interface Request {
            employee?: EmployeePayload;
        }
    }
}
