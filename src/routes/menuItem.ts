import { baseModifierOptionSchema } from "../models/schema/modifier-options.ts";


export const insertModifierOptionValidationSchema = baseModifierOptionSchema.pick({
    modifierGroupId: true,
    name: true,
    price: true,
    isAvailable: true,
    sortOrder: true,
}).strict();