import type {
    MenuItemWithCategory,
    MenuItemWithRelations,
} from "../repositories/menuItem.repository.ts";

export type MenuItemResponse = {
    id: string;
    name: string;
    basePrice: string;
    isAvailable: boolean | null;
    imageUrl: string | null;
    imagePath: string | null;
    category: {
        id: string;
        name: string;
    };
    modifierGroups: {
        id: string;
        name: string;
        selectionType: string;
        isRequired: boolean | null;
        sortOrder: number | null;
        options: {
            id: string;
            name: string;
            price: string;
            isAvailable: boolean | null;
            sortOrder: number | null;
            ingredients: {
                id: string;
                quantity: string;
                ingredient: {
                    id: string;
                    name: string;
                    unit: string;
                };
            }[];
        }[];
    }[];
    recipes: {
        id: string;
        quantity: string;
        ingredient: {
            id: string;
            name: string;
            unit: string;
        };
    }[];
};

export const formatMenuItem = (
    item: MenuItemWithRelations,
): MenuItemResponse => ({
    id: item.menuItems.id!,
    name: item.menuItems.name!,
    basePrice: item.menuItems.basePrice!,
    isAvailable: item.menuItems.isAvailable ?? null,
    imageUrl: item.menuItems.imageUrl ?? null,
    imagePath: item.menuItems.imagePath ?? null,
    category: {
        id: item.categories.id!,
        name: item.categories.name!,
    },
    modifierGroups: item.modifierGroups.map((group) => ({
        id: group.id!,
        name: group.name!,
        selectionType: group.selectionType!,
        isRequired: group.isRequired ?? null,
        sortOrder: group.sortOrder ?? null,
        options: group.options.map((option) => ({
            id: option.id!,
            name: option.name!,
            price: option.price!,
            isAvailable: option.isAvailable ?? null,
            sortOrder: option.sortOrder ?? null,
            ingredients: option.ingredients.map((moi) => ({
                id: moi.id!,
                quantity: moi.quantity!,
                ingredient: {
                    id: moi.ingredient.id,
                    name: moi.ingredient.name,
                    unit: moi.ingredient.unit,
                },
            })),
        })),
    })),
    recipes: item.recipes.map((recipe) => ({
        id: recipe.id!,
        quantity: recipe.quantity!,
        ingredient: {
            id: recipe.ingredient.id,
            name: recipe.ingredient.name,
            unit: recipe.ingredient.unit,
        },
    })),
});

/** Stripped version for create/update responses (no modifier groups or recipes). */
export const formatMenuItemBasic = (
    item: MenuItemWithCategory,
): Omit<MenuItemResponse, "modifierGroups" | "recipes"> => ({
    id: item.menu_items.id!,
    name: item.menu_items.name!,
    basePrice: item.menu_items.basePrice!,
    isAvailable: item.menu_items.isAvailable ?? null,
    imageUrl: item.menu_items.imageUrl ?? null,
    imagePath: item.menu_items.imagePath ?? null,
    category: {
        id: item.categories.id!,
        name: item.categories.name!,
    },
});
