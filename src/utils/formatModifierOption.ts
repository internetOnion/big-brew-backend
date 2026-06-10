import type { ModifierOption } from "../repositories/modifierOption.repository.ts";

export type ModifierOptionResponse = Omit<ModifierOption, "deletedAt" | "createdAt" | "updatedAt">;

export const formatModifierOption = (modifierOption: ModifierOption): ModifierOptionResponse => ({
    id: modifierOption.id,
    modifierGroupId: modifierOption.modifierGroupId,
    name: modifierOption.name,
    price: modifierOption.price,
    isAvailable: modifierOption.isAvailable,
    sortOrder: modifierOption.sortOrder
});