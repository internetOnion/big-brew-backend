import type { Request, Response } from "express";
import { employeeService } from "../services/index.ts";

export class EmployeeController {
    async getEmployeeById(req: Request, res: Response) {
        const id = req.params.id as string;

        const result = await employeeService.getEmployeeById(id);

        return res.json({
            data: result,
        });
    }

    async updateEmployee(req: Request, res: Response) {
        const id = req.params.id as string;
        const { name, email, pin, password } = req.body;

        const result = await employeeService.updateEmployee(id, {
            name,
            email,
            pin,
            password,
        });

        return res.json({
            data: result,
        });
    }

    async deleteEmployee(req: Request, res: Response) {
        const id = req.params.id as string;

        await employeeService.deleteEmployee(id);

        return res.status(204).send();
    }
}

export const employeeController = new EmployeeController();
