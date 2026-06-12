# Menu Item Creation Flow

## Overview

There are **two ways** to create a complete menu item:

1. **Atomic (single call)** — `POST /api/menu-items` with optional nested `recipes`, `modifierGroups`, `options`, and `ingredients`. Everything runs inside a single database transaction — all-or-nothing. Recommended for creating fully-configured items in one step.

2. **Multi-step** — create the menu item, then add recipes, modifier groups, options, and ingredient requirements through separate sub-resource endpoints. Useful for incremental edits after initial creation or for UIs that build up the item progressively.

Both approaches share the same sub-resource endpoints for subsequent CRUD operations.

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

#### Basic (scalar fields only — backward compatible)

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
        "imagePath": "string | null",
        "category": { "id": "uuid", "name": "string" }
    }
}
```

**Flow:**

- `src/routes/menuItem.routes.ts` → `authenticate` + `requireRole("manager", "owner")` + `validateBody`
- `src/controllers/menuItem.controller.ts` → detects no nested data → `addMenuItem(req.body)`
- `src/services/menuItem.service.ts` → validates category existence, inserts via `menuItemRepository.insert()`, formats basic response
- `src/repositories/menuItem.repository.ts` → `INSERT INTO menu_items`

#### Atomic (with nested recipes + modifier groups — single transaction)

```
POST /api/menu-items

Body:
{
    "name":         "Cappuccino",
    "basePrice":    3.50,
    "categoryId":   "<uuid>",
    "isAvailable":  true,
    "imageUrl":     "https://...",          (optional)

    "recipes": [                            (optional)
        { "ingredientId": "<uuid>", "quantity": 18 },
        { "ingredientId": "<uuid>", "quantity": 200 }
    ],

    "modifierGroups": [                     (optional)
        {
            "name": "Milk Options",
            "selectionType": "single",
            "isRequired": true,
            "sortOrder": 0,                 (optional, default 0)
            "options": [                    (optional)
                {
                    "name": "Oat Milk",
                    "price": 0.50,
                    "isAvailable": true,    (optional, default true)
                    "sortOrder": 0,         (optional, default 0)
                    "ingredients": [        (optional)
                        { "ingredientId": "<uuid>", "quantity": 200 }
                    ]
                }
            ]
        }
    ]
}

Response: 201
{
    "data": {
        "id": "uuid",
        "name": "Cappuccino",
        "basePrice": "3.50",
        "isAvailable": true,
        "imageUrl": null,
        "imagePath": null,
        "category": { "id": "uuid", "name": "string" },
        "modifierGroups": [
            {
                "id": "uuid",
                "name": "Milk Options",
                "selectionType": "single",
                "isRequired": true,
                "sortOrder": 0,
                "options": [
                    {
                        "id": "uuid",
                        "name": "Oat Milk",
                        "price": "0.50",
                        "isAvailable": true,
                        "sortOrder": 0,
                        "ingredients": [
                            {
                                "id": "uuid",
                                "quantity": "200",
                                "ingredient": { "id": "uuid", "name": "Oat Milk", "unit": "ml" }
                            }
                        ]
                    }
                ]
            }
        ],
        "recipes": [
            {
                "id": "uuid",
                "quantity": "18",
                "ingredient": { "id": "uuid", "name": "Espresso", "unit": "g" }
            },
            {
                "id": "uuid",
                "quantity": "200",
                "ingredient": { "id": "uuid", "name": "Milk", "unit": "ml" }
            }
        ]
    }
}
```

**Flow:**

- `src/routes/menuItem.routes.ts` → `authenticate` + `requireRole("manager", "owner")` + `validateBody(insertMenuItemBatchSchema)`
- `src/controllers/menuItem.controller.ts` → detects nested data → `addMenuItemWithRelations(req.body)`
- `src/services/menuItem.service.ts` → validates category existence, batch-validates all ingredients, calls `menuItemRepository.insertWithRelations()`, re-fetches full relations, formats full response
- `src/repositories/menuItem.repository.ts` → wraps all inserts in a single `db.transaction()` → `INSERT INTO menu_items, item_recipes, modifier_groups, modifier_options, modifier_option_ingredients`

**Validation:** Returns `400 Invalid category ID` for missing category, or `400 Ingredient not found: {id}` for any referenced ingredient that doesn't exist. All referenced ingredients are validated in a single batch query before the transaction begins.

---

### Step 2: Add recipes (base ingredients for the item) — multi-step only

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

- `src/routes/menuItemRecipe.routes.ts` → `authenticate` + `requireRole("manager", "owner")` + `validateBody(recipeSchema)`
- `src/controllers/menuItemRecipe.controller.ts` → `addRecipes(menuItemId, req.body)`
- `src/services/menuItemRecipe.service.ts` → validates each ingredient exists, builds `InsertItemRecipe[]`, calls `insertMany`
- `src/repositories/itemRecipe.repository.ts` → `INSERT INTO item_recipes`

**Validation:** Returns `400 Ingredient not found: {id}` for any missing ingredient.

---

### Step 3: Add modifier groups — multi-step only

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

- `src/routes/menuItemModifierGroup.routes.ts` → `authenticate` + `requireRole("manager", "owner")` + `validateBody(insertGroupSchema)`
- `src/controllers/menuItemModifierGroup.controller.ts` → `addGroup(menuItemId, req.body)`
- `src/services/menuItemModifierGroup.service.ts` → validates menu item exists, attaches `menuItemId`, inserts via `modifierGroupRepository`
- `src/repositories/modifierGroup.repository.ts` → `INSERT INTO modifier_groups`

---

### Step 4: Add modifier options to a group — multi-step only

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

### Step 5: Add ingredient requirements to a modifier option — multi-step only

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

### Image upload

Menu item images are managed through a dedicated sub-resource endpoint. The backend handles Supabase Storage upload and old-file cleanup automatically.

**Upload / replace image:**

```
PUT /api/menu-items/:id/image
Content-Type: multipart/form-data
Body: file (binary, image only, max 5 MB)

Response: 200
{
    "data": {
        "imageUrl": "https://<project>.supabase.co/storage/v1/object/public/assets/uploads/uuid.jpg",
        "imagePath": "uploads/uuid.jpg"
    }
}
```

The old image (if any) is automatically deleted from Supabase Storage. The `imageUrl` and `imagePath` are stored on the menu item and returned in `GET /api/menu-items`.

**Remove image:**

```
DELETE /api/menu-items/:id/image

Response: 204
```

Deletes the file from Supabase Storage and clears both `imageUrl` and `imagePath` on the menu item.

---

## Complete example: Creating a "Cappuccino"

### Atomic (single call — recommended)

```bash
curl -X POST /api/menu-items \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cappuccino",
    "basePrice": 3.50,
    "categoryId": "<category-uuid>",
    "recipes": [
      { "ingredientId": "<espresso-uuid>", "quantity": 18 },
      { "ingredientId": "<milk-uuid>", "quantity": 200 }
    ],
    "modifierGroups": [
      {
        "name": "Milk Options",
        "selectionType": "single",
        "isRequired": true,
        "options": [
          {
            "name": "Oat Milk",
            "price": 0.50,
            "ingredients": [
              { "ingredientId": "<oat-milk-uuid>", "quantity": 200 }
            ]
          }
        ]
      }
    ]
  }'
# → { "data": { "id": "item-1", ... full response with all relations } }

# 1.5. Upload an image (same as multi-step)
curl -X PUT /api/menu-items/item-1/image \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@cappuccino.jpg"
```

### Multi-step (5+ calls — for incremental builds)

```bash
# 1. Create the item
curl -X POST /api/menu-items \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Cappuccino","basePrice":3.50,"categoryId":"<category-uuid>"}'
# → { "data": { "id": "item-1", ... } }

# 1.5. Upload an image for the item
curl -X PUT /api/menu-items/item-1/image \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@cappuccino.jpg"
# → { "data": { "imageUrl": "https://...", "imagePath": "uploads/..." } }

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
| `/api/menu-items/:id/image`            | —          | ✓ (PUT)       | —                  | ✓                  |

The main menu item itself can be updated with `PUT /api/menu-items/:id` (scalar fields only) and soft-deleted with `DELETE /api/menu-items/:id` (sets `deletedAt`).
