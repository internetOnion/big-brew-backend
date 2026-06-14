import type {
    employeeRoleEnum,
    ingredientUnitEnum,
    orderStatusEnum,
    paymentMethodEnum,
    paymentStatusEnum,
    diningOptionEnum,
    stockReasonEnum,
} from "../models/schema/enums.ts";

export type EmployeeRole = (typeof employeeRoleEnum.enumValues)[number];
export type IngredientUnit = (typeof ingredientUnitEnum.enumValues)[number];
export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
export type PaymentMethod = (typeof paymentMethodEnum.enumValues)[number];
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];
export type DiningOption = (typeof diningOptionEnum.enumValues)[number];
export type StockReason = (typeof stockReasonEnum.enumValues)[number];

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
