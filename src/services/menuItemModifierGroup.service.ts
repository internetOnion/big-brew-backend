import {
    modifierGroupRepository,
    modifierOptionRepository,
    modifierOptionIngredientRepository,
} from "../repositories/index.ts";
import { menuItemRepository } from "../repositories/index.ts";
import { ingredientRepository } from "../repositories/ingredient.respository.ts";
import { AppError } from "../utils/AppError.ts";
import type {
    InsertModifierGroup,
    UpdateModifierGroup,
    InsertModifierOption,
    UpdateModifierOption,
    InsertModifierOptionIngredient,
    UpdateModifierOptionIngredient,
} from "../repositories/index.ts";

export class MenuItemModifierGroupService {
    async getGroups(menuItemId: string) {
        return await modifierGroupRepository.findByMenuItemId(menuItemId);
    }

    async addGroup(menuItemId: string, input: InsertModifierGroup) {
        const menuItem = await menuItemRepository.findById(menuItemId);
        if (!menuItem) {
            throw AppError.notFound("Menu item not found");
        }

        const groupData = { ...input, menuItemId };
        return await modifierGroupRepository.insert(groupData);
    }

    async updateGroup(
        menuItemId: string,
        groupId: string,
        input: UpdateModifierGroup,
    ) {
        const group = await modifierGroupRepository.findById(groupId);
        if (!group || group.menuItemId !== menuItemId) {
            throw AppError.notFound(
                "Modifier group not found for this menu item",
            );
        }

        return await modifierGroupRepository.update(groupId, input);
    }

    async deleteGroup(menuItemId: string, groupId: string) {
        const group = await modifierGroupRepository.findById(groupId);
        if (!group || group.menuItemId !== menuItemId) {
            throw AppError.notFound(
                "Modifier group not found for this menu item",
            );
        }

        await modifierGroupRepository.delete(groupId);
    }

    async getOptions(groupId: string) {
        return await modifierOptionRepository.findByModifierGroupId(groupId);
    }

    async addOption(
        menuItemId: string,
        groupId: string,
        input: InsertModifierOption,
    ) {
        const group = await modifierGroupRepository.findById(groupId);
        if (!group || group.menuItemId !== menuItemId) {
            throw AppError.notFound(
                "Modifier group not found for this menu item",
            );
        }

        const optionData = { ...input, modifierGroupId: groupId };
        return await modifierOptionRepository.insert(optionData);
    }

    async updateOption(
        menuItemId: string,
        groupId: string,
        optionId: string,
        input: UpdateModifierOption,
    ) {
        const group = await modifierGroupRepository.findById(groupId);
        if (!group || group.menuItemId !== menuItemId) {
            throw AppError.notFound(
                "Modifier group not found for this menu item",
            );
        }

        const option = await modifierOptionRepository.findById(optionId);
        if (!option || option.modifierGroupId !== groupId) {
            throw AppError.notFound("Modifier option not found for this group");
        }

        return await modifierOptionRepository.update(optionId, input);
    }

    async deleteOption(menuItemId: string, groupId: string, optionId: string) {
        const group = await modifierGroupRepository.findById(groupId);
        if (!group || group.menuItemId !== menuItemId) {
            throw AppError.notFound(
                "Modifier group not found for this menu item",
            );
        }

        const option = await modifierOptionRepository.findById(optionId);
        if (!option || option.modifierGroupId !== groupId) {
            throw AppError.notFound("Modifier option not found for this group");
        }

        await modifierOptionRepository.delete(optionId);
    }

    async getOptionIngredients(optionId: string) {
        return await modifierOptionIngredientRepository.findByModifierOptionId(
            optionId,
        );
    }

    async addOptionIngredient(
        menuItemId: string,
        groupId: string,
        optionId: string,
        input: InsertModifierOptionIngredient,
    ) {
        const group = await modifierGroupRepository.findById(groupId);
        if (!group || group.menuItemId !== menuItemId) {
            throw AppError.notFound(
                "Modifier group not found for this menu item",
            );
        }

        const option = await modifierOptionRepository.findById(optionId);
        if (!option || option.modifierGroupId !== groupId) {
            throw AppError.notFound("Modifier option not found for this group");
        }

        const ingredient = await ingredientRepository.findById(
            input.ingredientId,
        );
        if (!ingredient) {
            throw AppError.badRequest(
                `Ingredient not found: ${input.ingredientId}`,
            );
        }

        const ingredientData = {
            ...input,
            modifierOptionId: optionId,
        };
        return await modifierOptionIngredientRepository.insert(ingredientData);
    }

    async updateOptionIngredient(
        menuItemId: string,
        groupId: string,
        optionId: string,
        ingredientId: string,
        input: UpdateModifierOptionIngredient,
    ) {
        const group = await modifierGroupRepository.findById(groupId);
        if (!group || group.menuItemId !== menuItemId) {
            throw AppError.notFound(
                "Modifier group not found for this menu item",
            );
        }

        const option = await modifierOptionRepository.findById(optionId);
        if (!option || option.modifierGroupId !== groupId) {
            throw AppError.notFound("Modifier option not found for this group");
        }

        const moi =
            await modifierOptionIngredientRepository.findByModifierOptionIdAndIngredientId(
                optionId,
                ingredientId,
            );
        if (!moi || !moi.id) {
            throw AppError.notFound(
                `Option ingredient not found for ingredient: ${ingredientId}`,
            );
        }

        return await modifierOptionIngredientRepository.update(moi.id, input);
    }

    async deleteOptionIngredient(
        menuItemId: string,
        groupId: string,
        optionId: string,
        ingredientId: string,
    ) {
        const group = await modifierGroupRepository.findById(groupId);
        if (!group || group.menuItemId !== menuItemId) {
            throw AppError.notFound(
                "Modifier group not found for this menu item",
            );
        }

        const option = await modifierOptionRepository.findById(optionId);
        if (!option || option.modifierGroupId !== groupId) {
            throw AppError.notFound("Modifier option not found for this group");
        }

        const moi =
            await modifierOptionIngredientRepository.findByModifierOptionIdAndIngredientId(
                optionId,
                ingredientId,
            );
        if (!moi || !moi.id) {
            throw AppError.notFound(
                `Option ingredient not found for ingredient: ${ingredientId}`,
            );
        }

        await modifierOptionIngredientRepository.delete(moi.id);
    }
}

export const menuItemModifierGroupService = new MenuItemModifierGroupService();
