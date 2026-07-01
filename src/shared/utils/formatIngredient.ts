import type { Ingredient } from "../../features/ingredients/ingredient.respository.ts";

export const formatIngredient = (ingredient: Ingredient) => ({
    id: ingredient.id,
    name: ingredient.name,
    unit: ingredient.unit,
    stockQuantity: ingredient.stockQuantity,
    lowStockThreshold: ingredient.lowStockThreshold,
});
