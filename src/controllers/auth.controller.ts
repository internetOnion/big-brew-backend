import type { Request, Response } from "express";
import { authService } from "../services/index.ts";
import { config } from "../config/index.ts";
import { AppError } from "../utils/AppError.ts";

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
                accessToken: result.accessToken,
                employee: result.employee,
            },
        });
    }

    async pinLogin(req: Request, res: Response) {
        const { pin } = req.body;

        const result = await authService.pinLogin({ pin });

        res.cookie("refresh_token", result.refreshToken, config.cookie);

        return res.json({
            data: {
                accessToken: result.accessToken,
                employee: result.employee,
            },
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
                accessToken: result.accessToken,
            },
        });
    }

    async logout(req: Request, res: Response) {
        if (req.employee) {
            await authService.logout(req.employee.id);
        }

        res.clearCookie("refresh_token", { path: "/api/auth" });

        return res.status(204).send();
    }

    async me(req: Request, res: Response) {
        return res.json({
            data: req.employee,
        });
    }
}

export const authController = new AuthController();
