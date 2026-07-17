import type { Request, Response } from "express";
import { authService } from "./auth.service.ts";
import { employeeService } from "../employees/employee.service.ts";
import { config } from "../../shared/config/index.ts";
import { AppError } from "../../shared/utils/AppError.ts";

export class AuthController {
    async signup(req: Request, res: Response) {
        const { email, password, name, pin, role } = req.body;

        const result = await authService.signup(
            { email, password, name, pin, role },
            req.employee!.role,
        );

        return res.status(201).json({
            data: result,
        });
    }

    async login(req: Request, res: Response) {
        const { email, password } = req.body;

        const result = await authService.login({ email, password });

        res.cookie("refresh_token", result.refreshToken, config.cookie);

        return res.json({
            data: {
                access_token: result.accessToken,
                user: result.employee,
            },
        });
    }

    async terminalLogin(req: Request, res: Response) {
        const { email, password } = req.body;

        const result = await authService.terminalLogin({ email, password });

        res.cookie("refresh_token", result.refreshToken, config.cookie);

        return res.json({
            data: {
                access_token: result.accessToken,
                terminal: result.terminal,
            },
        });
    }

    async verifyPin(req: Request, res: Response) {
        const { pin } = req.body;

        const result = await authService.verifyPin(pin, req.ip ?? "unknown");

        return res.json({
            data: result,
        });
    }

    async refresh(req: Request, res: Response) {
        const refreshToken = req.cookies.refresh_token;
        if (!refreshToken) {
            throw AppError.unauthorized("No refresh token provided");
        }

        const result = await authService.refresh(refreshToken);

        res.cookie("refresh_token", result.refreshToken, config.cookie);

        return res.json({
            data: {
                access_token: result.accessToken,
                entity_type: result.entityType,
            },
        });
    }

    async logout(req: Request, res: Response) {
        if (req.employee) {
            await authService.logout(req.employee.id, "employee");
        } else if (req.terminal) {
            await authService.logout(req.terminal.id, "terminal");
        }

        res.clearCookie("refresh_token", { path: "/api/auth" });

        return res.status(204).send();
    }

    async me(req: Request, res: Response) {
        if (req.terminal) {
            return res.json({
                data: {
                    id: req.terminal.id,
                    name: req.terminal.name,
                    type: "terminal",
                },
            });
        }

        const result = await employeeService.getEmployeeById(req.employee!.id);

        return res.json({
            data: { ...result, type: "employee" },
        });
    }
}

export const authController = new AuthController();
