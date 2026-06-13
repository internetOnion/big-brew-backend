import { pgEnum } from "drizzle-orm/pg-core";
import { z } from "zod";
import { createSelectSchema } from "drizzle-zod";

export const employeeRoleEnum = pgEnum("employee_role", [
    "barista",
    "manager",
    "owner",
]);

export const ingredientUnitEnum = pgEnum("ingredient_unit", ["g", "ml"]);

export const discountTypeEnum = pgEnum("discount_type", [
    "percentage",
    "fixed_amount",
    "bogo",
]);

export const orderStatusEnum = pgEnum("order_status", [
    "pending",
    "completed",
    "void_requested",
    "voided",
]);

export const diningOptionEnum = pgEnum("dining_option", [
    "dine_in",
    "take_away",
]);

export const paymentMethodEnum = pgEnum("payment_method", ["cash", "qr"]);

export const paymentStatusEnum = pgEnum("payment_status", [
    "pending",
    "paid",
    "refunded",
]);

export const stockReasonEnum = pgEnum("stock_reason", [
    "order_placed",
    "order_voided",
    "manual_restock",
    "manual_deduction",
    "manual_adjustment",
]);

export const selectionTypeEnum = pgEnum("selection_type", [
    "single",
    "multiple",
]);

export const ingredientUnitEnumSchema = createSelectSchema(ingredientUnitEnum);
export const selectionTypeEnumSchema = createSelectSchema(selectionTypeEnum);
