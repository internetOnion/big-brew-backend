import { date } from "drizzle-orm/mysql-core";
import { Ingredient } from "../repositories/ingredient.respositoy";

export const formatIngredient = (ingredient: Ingredient) => ({
    id: ingredient.id,
    name: ingredient.name,
    unit: ingredient.unit,
    stockQuantity: ingredient.stockQuantity,
    lowStockThreshold: ingredient.lowStockThreshold,
});