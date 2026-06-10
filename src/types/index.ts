import type { employeeRoleEnum, ingredientUnitEnum } from "../models/schema/enums.ts";

export type EmployeeRole = (typeof employeeRoleEnum.enumValues)[number];
export type IngredientUnit = (typeof ingredientUnitEnum.enumValues)[number];

export interface EmployeePayload {
    id: string;
    role: EmployeeRole;
    name: string;
    supabaseUid: string | null;
    email?: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
}

export interface PaginationParams {
    page: number;
    limit: number;
}

export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
