import type { EmployeeRole, EmployeePayload } from "./index.ts";

interface TerminalPayload {
    id: string;
    name: string;
    isActive: boolean;
}

declare global {
    namespace Express {
        interface Request {
            employee?: EmployeePayload;
            terminal?: TerminalPayload;
        }
    }
}
