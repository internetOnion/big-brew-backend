import type { Request, Response } from "express";
import { terminalService } from "./terminal.service.ts";

export class TerminalController {
    async listTerminals(_req: Request, res: Response) {
        const terminals = await terminalService.listTerminals();
        return res.json(terminals);
    }

    async getTerminalById(req: Request, res: Response) {
        const id = req.params.id as string;
        const result = await terminalService.getTerminalById(id);
        return res.json({ data: result });
    }

    async createTerminal(req: Request, res: Response) {
        const { name, email, password } = req.body;
        const result = await terminalService.createTerminal({
            name,
            email,
            password,
        });
        return res.status(201).json({ data: result });
    }

    async updateTerminal(req: Request, res: Response) {
        const id = req.params.id as string;
        const { name, password, isActive } = req.body;
        const result = await terminalService.updateTerminal(id, {
            name,
            password,
            isActive,
        });
        return res.json({ data: result });
    }

    async deleteTerminal(req: Request, res: Response) {
        const id = req.params.id as string;
        await terminalService.deleteTerminal(id);
        return res.status(204).send();
    }
}

export const terminalController = new TerminalController();
