import { baseModifierOptionSchema } from "../models/schema/modifier-options.ts";
import { baseModifierOptionIngredientSchema } from "../models/schema/modifier-option-ingredients.ts";

export const insertModifierOptionValidationSchema = baseModifierOptionSchema.pick({
    modifierGroupId: true,
    name: true,
    price: true,
    isAvailable: true,
    sortOrder: true,
}).strict();

export const insertModifierOptionIngredientValidationSchema = baseModifierOptionIngredientSchema.pick({
    modifierOptionId: true,
    ingredientId: true,
    quantity: true,
}).strict();