# Menu Item Creation Flow

## Overview

Creating a full menu item is a multi-step API process. There is no single monolithic endpoint — each entity level has its own CRUD.

## Schema relationships

```
menu_items 1───* item_recipes *───1 ingredients
     │
     └──1 modifier_groups 1───* modifier_options 1───* modifier_option_ingredients *───1 ingredients
```

| Table                         | FK                   | References            | On Delete |
| ----------------------------- | -------------------- | --------------------- | --------- |
| `modifier_groups`             | `menu_item_id`       | `menu_items.id`       | CASCADE   |
| `modifier_options`            | `modifier_group_id`  | `modifier_groups.id`  | CASCADE   |
| `modifier_option_ingredients` | `modifier_option_id` | `modifier_options.id` | CASCADE   |
| `modifier_option_ingredients` | `ingredient_id`      | `ingredients.id`      | —         |
| `item_recipes`                | `item_id`            | `menu_items.id`       | CASCADE   |
| `item_recipes`                | `ingredient_id`      | `ingredients.id`      | —         |

## Endpoints

### Step 1: Create the menu item

```
POST /api/menu-items

Body:
{
    "name":         string   (required)
    "basePrice":    number   (required, >= 0)
    "categoryId":   uuid     (required)
    "isAvailable":  boolean  (optional, default true)
    "imageUrl":     string   (optional, URL)
}

Response: 201
{
    "data": {
        "id": "uuid",
        "name": "string",
        "basePrice": 0,
        "isAvailable": true,
        "imageUrl": "string | null",
        "category": { "id": "uuid", "name": "string" }
    }
}
```

**Flow:**

- `src/routes/menuItem.ts` → `authenticate` + `requireRole("manager", "owner")` + `validateBody`
- `src/controllers/menuItem.controller.ts` → `addMenuItem(req.body)`
- `src/services/menuItem.service.ts` → validates category existence, inserts via `menuItemRepository`, formats response
- `src/repositories/menuItem.repository.ts` → `INSERT INTO menu_items`

---

### Step 2: Add recipes (base ingredients for the item)

```
POST /api/menu-items/:menuItemId/recipes

Body:
[
    {
        "ingredientId":  uuid     (required)
        "quantity":      number   (required)
    }
]

Response: 201
{
    "data": [
        { "id": "uuid", "itemId": "uuid", "ingredientId": "uuid", "quantity": 0 }
    ]
}
```

**Flow:**

- `src/routes/menuItemRecipe.ts` → `authenticate` + `requireRole("manager", "owner")` + `validateBody(recipeSchema)`
- `src/controllers/menuItemRecipe.controller.ts` → `addRecipes(menuItemId, req.body)`
- `src/services/menuItemRecipe.service.ts` → validates each ingredient exists, builds `InsertItemRecipe[]`, calls `insertMany`
- `src/repositories/itemRecipe.repository.ts` → `INSERT INTO item_recipes`

**Validation:** Returns `400 Ingredient not found: {id}` for any missing ingredient.

---

### Step 3: Add modifier groups

```
POST /api/menu-items/:menuItemId/modifier-groups

Body:
{
    "name":          string   (required)
    "selectionType": string   (required, "single" | "multiple")
    "isRequired":    boolean  (required)
    "sortOrder":     integer  (optional, default 0)
}

Response: 201
{
    "data": {
        "id": "uuid",
        "menuItemId": "uuid",
        "name": "string",
        "selectionType": "single|multiple",
        "isRequired": true,
        "sortOrder": 0
    }
}
```

**Flow:**

- `src/routes/menuItemModifierGroup.ts` → `authenticate` + `requireRole("manager", "owner")` + `validateBody(insertGroupSchema)`
- `src/controllers/menuItemModifierGroup.controller.ts` → `addGroup(menuItemId, req.body)`
- `src/services/menuItemModifierGroup.service.ts` → validates menu item exists, attaches `menuItemId`, inserts via `modifierGroupRepository`
- `src/repositories/modifierGroup.repository.ts` → `INSERT INTO modifier_groups`

---

### Step 4: Add modifier options to a group

```
POST /api/menu-items/:menuItemId/modifier-groups/:groupId/options

Body:
{
    "name":        string   (required)
    "price":       number   (required)
    "isAvailable": boolean  (optional, default true)
    "sortOrder":   integer  (optional, default 0)
}

Response: 201
{
    "data": {
        "id": "uuid",
        "modifierGroupId": "uuid",
        "name": "string",
        "price": 0,
        "isAvailable": true,
        "sortOrder": 0
    }
}
```

**Flow:**

- Validates parent group belongs to the specified menu item (checks `group.menuItemId === menuItemId`)
- Attaches `modifierGroupId`, inserts via `modifierOptionRepository`

---

### Step 5: Add ingredient requirements to a modifier option

```
POST /api/menu-items/:menuItemId/modifier-groups/:groupId/options/:optionId/ingredients

Body:
{
    "ingredientId":  uuid     (required)
    "quantity":      number   (required)
}

Response: 201
{
    "data": {
        "id": "uuid",
        "modifierOptionId": "uuid",
        "ingredientId": "uuid",
        "quantity": 0
    }
}
```

**Flow:**

- Validates full parent chain (group → menu item, option → group)
- Validates ingredient exists → `400 Ingredient not found: {id}`
- Attaches `modifierOptionId`, inserts via `modifierOptionIngredientRepository`

---

## Complete example: Creating a "Cappuccino"

```bash
# 1. Create the item
curl -X POST /api/menu-items \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Cappuccino","basePrice":3.50,"categoryId":"<category-uuid>"}'
# → { "data": { "id": "item-1", ... } }

# 2. Add base recipe (espresso + milk)
curl -X POST /api/menu-items/item-1/recipes \
  -H "Authorization: Bearer $TOKEN" \
  -d '[{"ingredientId":"<espresso-uuid>","quantity":18},{"ingredientId":"<milk-uuid>","quantity":200}]'

# 3. Create "Milk Options" modifier group
curl -X POST /api/menu-items/item-1/modifier-groups \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Milk Options","selectionType":"single","isRequired":true}'
# → { "data": { "id": "group-1", ... } }

# 4. Add "Oat Milk" option
curl -X POST /api/menu-items/item-1/modifier-groups/group-1/options \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Oat Milk","price":0.50}'
# → { "data": { "id": "option-1", ... } }

# 5. Add ingredient requirement for the oat milk option
curl -X POST /api/menu-items/item-1/modifier-groups/group-1/options/option-1/ingredients \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"ingredientId":"<oat-milk-uuid>","quantity":200}'
```

## Also available

All sub-resources support full CRUD:

| Resource                               | GET (list) | POST (create) | PUT (update)       | DELETE (remove)    |
| -------------------------------------- | ---------- | ------------- | ------------------ | ------------------ |
| `/api/menu-items/:id/recipes`          | ✓          | ✓             | ✓ `/:ingredientId` | ✓ `/:ingredientId` |
| `/api/menu-items/:id/modifier-groups`  | ✓          | ✓             | ✓ `/:groupId`      | ✓ `/:groupId`      |
| `.../modifier-groups/:groupId/options` | ✓          | ✓             | ✓ `/:optionId`     | ✓ `/:optionId`     |
| `.../options/:optionId/ingredients`    | ✓          | ✓             | ✓ `/:ingredientId` | ✓ `/:ingredientId` |

The main menu item itself can be updated with `PUT /api/menu-items/:id` (scalar fields only) and soft-deleted with `DELETE /api/menu-items/:id` (sets `deletedAt`).
