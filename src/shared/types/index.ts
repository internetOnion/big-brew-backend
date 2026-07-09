import type {
    employeeRoleEnum,
    ingredientUnitEnum,
    discountTypeEnum,
    orderStatusEnum,
    paymentMethodEnum,
    paymentStatusEnum,
    diningOptionEnum,
    stockReasonEnum,
    selectionTypeEnum,
} from "../models/schema/enums.ts";

export type EmployeeRole = (typeof employeeRoleEnum.enumValues)[number];
export type IngredientUnit = (typeof ingredientUnitEnum.enumValues)[number];
export type DiscountType = (typeof discountTypeEnum.enumValues)[number];
export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
export type PaymentMethod = (typeof paymentMethodEnum.enumValues)[number];
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];
export type DiningOption = (typeof diningOptionEnum.enumValues)[number];
export type StockReason = (typeof stockReasonEnum.enumValues)[number];
export type SelectionType = (typeof selectionTypeEnum.enumValues)[number];

export interface EmployeePayload {
    id: string;
    role: EmployeeRole;
    name: string;
    clerkUserId: string | null;
    isActive: boolean;
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
