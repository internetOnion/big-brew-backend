import { ModifierGroup } from "../repositories/modifierGroup.repository.ts";

export type ModifierGroupResponse = Omit<ModifierGroup, "createdAt" | "updatedAt">;

export const formatModifierGroup = (modifierGroup: ModifierGroup): ModifierGroupResponse => ({
    id: modifierGroup.id,
    name: modifierGroup.name,
    selectionType: modifierGroup.selectionType,
    isRequired: modifierGroup.isRequired,
    defaultOptionId: modifierGroup.defaultOptionId,
    sortOrder: modifierGroup.sortOrder,
})