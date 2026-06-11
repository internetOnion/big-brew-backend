import { baseModifierOptionSchema } from "../models/schema/modifier-options.ts";
import { baseModifierOptionIngredientSchema } from "../models/schema/modifier-option-ingredients.ts";
import { baseItemRecipeSchema } from "../models/schema/item-recipes.ts";
import { baseMenuItemSchema } from "../models/schema/menu-items.ts";
import { baseMenuItemModifierGroupSchema } from "../models/schema/menu-item-modifier-groups.ts";
import { insertModifierGroupValidationSchema } from "./modifierGroup.ts";
import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";
import { menuItemController } from "../controllers/menuItem.controller.ts";
import { authenticate, requireRole, validateBody } from "../middlewares/index.ts";

export const insertModifierOptionValidationSchema = baseModifierOptionSchema.pick({
    modifierGroupId: true,
    name: true,
    price: true,
    isAvailable: true,
    sortOrder: true,
}).partial({
    isAvailable: true,
    sortOrder: true,
}).strict();

export const insertModifierOptionIngredientValidationSchema = baseModifierOptionIngredientSchema.pick({
    modifierOptionId: true,
    ingredientId: true,
    quantity: true,
}).strict();

export const insertItemRecipeValidationSchema = baseItemRecipeSchema.pick({
    itemId: true,
    ingredientId: true,
    quantity: true,
}).strict();

export const insertMenuItemModifierGroupValidationSchema = baseMenuItemModifierGroupSchema.pick({
    menuItemId: true,
    modifierGroupId: true,
    sortOrder: true,
}).partial({
    sortOrder: true,
}).strict();
export const insertMenuItemValidationSchema = baseMenuItemSchema.pick({
    categoryId: true,
    name: true,
    basePrice: true,
    isAvailable: true,
    imageUrl: true,
}).strict();

export const requestMenuItemValidationSchema = baseMenuItemSchema.pick({
    categoryId: true,
    name: true,
    basePrice: true,
    isAvailable: true,
    imageUrl: true,
}).strict().extend({
    ingredients: z.array((insertItemRecipeValidationSchema).pick({
        ingredientId: true,
        quantity: true,
    })).optional(),
    modifierGroups: z.array(
        insertModifierGroupValidationSchema.pick({
            name: true,
            isRequired: true,
            selectionType: true,
        }).extend({
            modifierOptions: z.array(
                insertModifierOptionValidationSchema.pick({
                    name: true,
                    price: true,
                }).extend({
                    insertModifierOptionIngredients: z.array(
                        insertModifierOptionIngredientValidationSchema.pick({
                            ingredientId: true,
                            quantity: true,
                        }),
                    ).optional(),
                }),
            ),
        }),
    ).optional(),
});

export const updateMenuItemValidationSchema = baseMenuItemSchema.pick({
    categoryId: true,
    name: true,
    basePrice: true,
    isAvailable: true,
    imageUrl: true,
}).strict().partial().extend({
    ingredients: z.array((insertItemRecipeValidationSchema).pick({
        ingredientId: true,
        quantity: true,
    }).partial()),
    modifierGroups: z.array(
        insertModifierGroupValidationSchema.pick({
            name: true,
            isRequired: true,
            selectionType: true,
        }).partial().extend({
            modifierOptions: z.array(
                insertModifierOptionValidationSchema.pick({
                    name: true,
                    price: true,
                }).partial().extend({
                    insertModifierOptionIngredients: z.array(
                        insertModifierOptionIngredientValidationSchema.pick({
                            ingredientId: true,
                            quantity: true,
                        }).partial(),
                    ).optional(),
                }),
            ),
        }),
    ).optional(),
});

const router = Router();

router.get("/",
    authenticate,
    async (req: Request, res: Response) => {
    await menuItemController.getMenuItems(req, res);
});

/*
req payload for adding manu item:
{
    "name": "Cappuccino",
    "basePrice": 3.5,
    "isAvailable": true,
    "imageUrl": "https://example.com/cappuccino.jpg",
    "categoryId": "123e4567-e89b-12d3-a456-426614174000"
    "ingredients": [
        {
            "ingredientId": "123e4567-e89b-12d3-a456-426614174000",
            "quantity": 250
        }
    ],
    "modifierGroups": [
        {
            "name": "Milk Options",
            "isRequired": false,
            "selectionType": "single",
            "modifierOptions": [
                {
                    "name": "Whole Milk",
                    "price": 0.5,
                    "ingredients": [
                        {
                            "ingredientId": "123e4567-e89b-12d3-a456-426614174001",
                            "quantity": 200
                        }
                    ]
                },
            ],
        },     
    ]
}
*/
router.post("/",
    authenticate,
    requireRole("manager", "owner"),
    validateBody(requestMenuItemValidationSchema),
    async (req: Request, res: Response) => {
    await menuItemController.addMenuItem(req, res);
});

router.put("/:id",
    authenticate,
    requireRole("manager", "owner"),
    validateBody(insertMenuItemValidationSchema.partial()),
    async (req: Request, res: Response) => {
    await menuItemController.updateMenuItem(req, res);
});

router.delete("/:id",
    authenticate,
    requireRole("manager", "owner"),
    async (req: Request, res: Response) => {
    await menuItemController.deleteMenuItem(req, res);
});

export default router;