import type { Request, Response, Express } from "express";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import { version } from "../../package.json";
import logger from "./logger";

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Big Brew API Documentation",
            version: version,
        },
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
            schemas: {
                Error: {
                    type: "object",
                    properties: {
                        error: { type: "string" },
                        details: {},
                    },
                    required: ["error"],
                },
                Employee: {
                    type: "object",
                    properties: {
                        id: { type: "string", format: "uuid" },
                        role: {
                            type: "string",
                            enum: ["barista", "manager", "owner"],
                        },
                        name: { type: "string" },
                        supabaseUid: {
                            type: "string",
                            format: "uuid",
                            nullable: true,
                        },
                        email: { type: "string", format: "email" },
                    },
                    required: ["id", "role", "name", "supabaseUid"],
                },
                Ingredient: {
                    type: "object",
                    properties: {
                        id: { type: "string", format: "uuid" },
                        name: { type: "string" },
                        unit: {
                            type: "string",
                            enum: ["g", "ml"],
                        },
                        stockQuantity: { type: "number" },
                        lowStockThreshold: { type: "number" },
                        createdAt: { type: "string", format: "date-time" },
                        updatedAt: { type: "string", format: "date-time" },
                    },
                    required: [
                        "id",
                        "name",
                        "unit",
                        "stockQuantity",
                        "lowStockThreshold",
                        "createdAt",
                        "updatedAt",
                    ],
                },
                Category: {
                    type: "object",
                    properties: {
                        id: { type: "string", format: "uuid" },
                        name: { type: "string" },
                        sortOrder: { type: "integer", minimum: 0 },
                        createdAt: { type: "string", format: "date-time" },
                        updatedAt: { type: "string", format: "date-time" },
                    },
                    required: [
                        "id",
                        "name",
                        "sortOrder",
                        "createdAt",
                        "updatedAt",
                    ],
                },
                ModifierGroup: {
                    type: "object",
                    properties: {
                        id: { type: "string", format: "uuid" },
                        name: { type: "string" },
                        selectionType: {
                            type: "string",
                            enum: ["single", "multiple"],
                        },
                        isRequired: { type: "boolean" },
                        defaultOptionId: {
                            type: "string",
                            format: "uuid",
                            nullable: true,
                        },
                        sortOrder: { type: "integer", minimum: 0 },
                    },
                    required: [
                        "id",
                        "name",
                        "selectionType",
                        "isRequired",
                        "sortOrder",
                    ],
                },
                ModifierOption: {
                    type: "object",
                    properties: {
                        id: { type: "string", format: "uuid" },
                        modifierGroupId: { type: "string", format: "uuid" },
                        name: { type: "string" },
                        price: { type: "number" },
                        isAvailable: { type: "boolean" },
                        sortOrder: { type: "integer", minimum: 0 },
                    },
                    required: [
                        "id",
                        "modifierGroupId",
                        "name",
                        "price",
                        "isAvailable",
                        "sortOrder",
                    ],
                },
                OptionIngredient: {
                    type: "object",
                    properties: {
                        id: { type: "string", format: "uuid" },
                        modifierOptionId: {
                            type: "string",
                            format: "uuid",
                        },
                        ingredientId: { type: "string", format: "uuid" },
                        quantity: { type: "number" },
                    },
                    required: [
                        "id",
                        "modifierOptionId",
                        "ingredientId",
                        "quantity",
                    ],
                },
                ItemRecipe: {
                    type: "object",
                    properties: {
                        id: { type: "string", format: "uuid" },
                        itemId: { type: "string", format: "uuid" },
                        ingredientId: { type: "string", format: "uuid" },
                        quantity: { type: "number" },
                    },
                    required: ["id", "itemId", "ingredientId", "quantity"],
                },
                Settings: {
                    type: "object",
                    properties: {
                        id: { type: "integer" },
                        storeName: { type: "string" },
                        storeAddress: {
                            type: "string",
                            nullable: true,
                        },
                        currencySymbol: { type: "string" },
                        receiptHeader: {
                            type: "string",
                            nullable: true,
                        },
                        receiptFooter: {
                            type: "string",
                            nullable: true,
                        },
                        taxLabel: { type: "string" },
                        logoUrl: {
                            type: "string",
                            nullable: true,
                        },
                        qrCodeUrl: {
                            type: "string",
                            nullable: true,
                        },
                        khrRate: {
                            type: "integer",
                            minimum: 0,
                            nullable: true,
                        },
                        createdAt: { type: "string", format: "date-time" },
                        updatedAt: { type: "string", format: "date-time" },
                    },
                    required: [
                        "id",
                        "storeName",
                        "currencySymbol",
                        "taxLabel",
                        "createdAt",
                        "updatedAt",
                    ],
                },
                MenuItem: {
                    type: "object",
                    properties: {
                        id: { type: "string", format: "uuid" },
                        name: { type: "string" },
                        basePrice: { type: "number" },
                        isAvailable: { type: "boolean" },
                        imageUrl: {
                            type: "string",
                            format: "uri",
                            nullable: true,
                        },
                        imagePath: {
                            type: "string",
                            nullable: true,
                        },
                        category: {
                            type: "object",
                            properties: {
                                id: { type: "string", format: "uuid" },
                                name: { type: "string" },
                            },
                            required: ["id", "name"],
                        },
                        modifierGroups: {
                            type: "array",
                            items: {
                                $ref: "#/components/schemas/ModifierGroupWithOptions",
                            },
                        },
                        recipes: {
                            type: "array",
                            items: {
                                $ref: "#/components/schemas/ItemRecipeWithIngredient",
                            },
                        },
                    },
                    required: [
                        "id",
                        "name",
                        "basePrice",
                        "isAvailable",
                        "imageUrl",
                        "imagePath",
                        "category",
                        "modifierGroups",
                        "recipes",
                    ],
                },
                MenuItemBasic: {
                    type: "object",
                    properties: {
                        id: { type: "string", format: "uuid" },
                        name: { type: "string" },
                        basePrice: { type: "number" },
                        isAvailable: { type: "boolean" },
                        imageUrl: {
                            type: "string",
                            format: "uri",
                            nullable: true,
                        },
                        imagePath: {
                            type: "string",
                            nullable: true,
                        },
                        category: {
                            type: "object",
                            properties: {
                                id: { type: "string", format: "uuid" },
                                name: { type: "string" },
                            },
                            required: ["id", "name"],
                        },
                    },
                    required: [
                        "id",
                        "name",
                        "basePrice",
                        "isAvailable",
                        "imageUrl",
                        "imagePath",
                        "category",
                    ],
                },
                ModifierGroupWithOptions: {
                    type: "object",
                    properties: {
                        id: { type: "string", format: "uuid" },
                        name: { type: "string" },
                        selectionType: {
                            type: "string",
                            enum: ["single", "multiple"],
                        },
                        isRequired: { type: "boolean" },
                        sortOrder: { type: "integer", minimum: 0 },
                        options: {
                            type: "array",
                            items: {
                                $ref: "#/components/schemas/ModifierOptionWithIngredients",
                            },
                        },
                    },
                    required: [
                        "id",
                        "name",
                        "selectionType",
                        "isRequired",
                        "sortOrder",
                        "options",
                    ],
                },
                ModifierOptionWithIngredients: {
                    type: "object",
                    properties: {
                        id: { type: "string", format: "uuid" },
                        name: { type: "string" },
                        price: { type: "number" },
                        isAvailable: { type: "boolean" },
                        sortOrder: { type: "integer", minimum: 0 },
                        ingredients: {
                            type: "array",
                            items: {
                                $ref: "#/components/schemas/OptionIngredientWithIngredient",
                            },
                        },
                    },
                    required: [
                        "id",
                        "name",
                        "price",
                        "isAvailable",
                        "sortOrder",
                        "ingredients",
                    ],
                },
                OptionIngredientWithIngredient: {
                    type: "object",
                    properties: {
                        id: { type: "string", format: "uuid" },
                        quantity: { type: "number" },
                        ingredient: {
                            type: "object",
                            properties: {
                                id: { type: "string", format: "uuid" },
                                name: { type: "string" },
                                unit: {
                                    type: "string",
                                    enum: ["g", "ml"],
                                },
                            },
                            required: ["id", "name", "unit"],
                        },
                    },
                    required: ["id", "quantity", "ingredient"],
                },
                ItemRecipeWithIngredient: {
                    type: "object",
                    properties: {
                        id: { type: "string", format: "uuid" },
                        quantity: { type: "number" },
                        ingredient: {
                            type: "object",
                            properties: {
                                id: { type: "string", format: "uuid" },
                                name: { type: "string" },
                                unit: {
                                    type: "string",
                                    enum: ["g", "ml"],
                                },
                            },
                            required: ["id", "name", "unit"],
                        },
                    },
                    required: ["id", "quantity", "ingredient"],
                },
                LoginResponse: {
                    type: "object",
                    properties: {
                        data: {
                            type: "object",
                            properties: {
                                access_token: { type: "string" },
                                user: {
                                    $ref: "#/components/schemas/Employee",
                                },
                            },
                            required: ["access_token", "user"],
                        },
                    },
                    required: ["data"],
                },
                RefreshResponse: {
                    type: "object",
                    properties: {
                        data: {
                            type: "object",
                            properties: {
                                access_token: { type: "string" },
                            },
                            required: ["access_token"],
                        },
                    },
                    required: ["data"],
                },
                OrderEmployee: {
                    type: "object",
                    properties: {
                        id: { type: "string", format: "uuid" },
                        name: { type: "string" },
                    },
                    required: ["id", "name"],
                },
                OrderItemModifier: {
                    type: "object",
                    properties: {
                        id: { type: "string", format: "uuid" },
                        modifierOptionId: {
                            type: "string",
                            format: "uuid",
                        },
                        modifierGroupId: {
                            type: "string",
                            format: "uuid",
                        },
                        groupName: { type: "string" },
                        name: { type: "string" },
                        price: { type: "string" },
                    },
                    required: [
                        "id",
                        "modifierOptionId",
                        "modifierGroupId",
                        "groupName",
                        "name",
                        "price",
                    ],
                },
                OrderItem: {
                    type: "object",
                    properties: {
                        id: { type: "string", format: "uuid" },
                        menuItemId: {
                            type: "string",
                            format: "uuid",
                        },
                        name: { type: "string" },
                        unitPrice: { type: "string" },
                        quantity: { type: "integer" },
                        modifiers: {
                            type: "array",
                            items: {
                                $ref: "#/components/schemas/OrderItemModifier",
                            },
                        },
                    },
                    required: [
                        "id",
                        "menuItemId",
                        "name",
                        "unitPrice",
                        "quantity",
                        "modifiers",
                    ],
                },
                Order: {
                    type: "object",
                    properties: {
                        id: { type: "string", format: "uuid" },
                        orderNumber: { type: "integer" },
                        receiptNumber: { type: "integer" },
                        status: {
                            type: "string",
                            enum: [
                                "pending",
                                "completed",
                                "void_requested",
                                "voided",
                            ],
                        },
                        diningOption: {
                            type: "string",
                            enum: ["dine_in", "take_away"],
                        },
                        subtotal: { type: "string" },
                        discountId: {
                            type: "string",
                            format: "uuid",
                            nullable: true,
                        },
                        discountAmount: { type: "string" },
                        total: { type: "string" },
                        paymentStatus: {
                            type: "string",
                            enum: ["pending", "paid", "refunded"],
                        },
                        createdBy: {
                            $ref: "#/components/schemas/OrderEmployee",
                        },
                        voidRequestedBy: {
                            allOf: [
                                {
                                    $ref: "#/components/schemas/OrderEmployee",
                                },
                            ],
                            nullable: true,
                        },
                        voidRequestedAt: {
                            type: "string",
                            format: "date-time",
                            nullable: true,
                        },
                        voidApprovedBy: {
                            allOf: [
                                {
                                    $ref: "#/components/schemas/OrderEmployee",
                                },
                            ],
                            nullable: true,
                        },
                        voidApprovedAt: {
                            type: "string",
                            format: "date-time",
                            nullable: true,
                        },
                        voidRejectedAt: {
                            type: "string",
                            format: "date-time",
                            nullable: true,
                        },
                        voidReason: {
                            type: "string",
                            nullable: true,
                        },
                        items: {
                            type: "array",
                            items: {
                                $ref: "#/components/schemas/OrderItem",
                            },
                        },
                        payments: {
                            type: "array",
                            items: {
                                $ref: "#/components/schemas/Payment",
                            },
                        },
                        createdAt: {
                            type: "string",
                            format: "date-time",
                        },
                        updatedAt: {
                            type: "string",
                            format: "date-time",
                        },
                    },
                    required: [
                        "id",
                        "orderNumber",
                        "receiptNumber",
                        "status",
                        "diningOption",
                        "subtotal",
                        "discountAmount",
                        "total",
                        "paymentStatus",
                        "createdBy",
                        "items",
                        "payments",
                        "createdAt",
                        "updatedAt",
                    ],
                },
                CreateOrderRequest: {
                    type: "object",
                    required: ["dining_option", "items"],
                    properties: {
                        dining_option: {
                            type: "string",
                            enum: ["dine_in", "take_away"],
                        },
                        discount_id: {
                            type: "string",
                            format: "uuid",
                        },
                        items: {
                            type: "array",
                            minItems: 1,
                            items: {
                                type: "object",
                                required: [
                                    "menu_item_id",
                                    "quantity",
                                    "unit_price",
                                ],
                                properties: {
                                    menu_item_id: {
                                        type: "string",
                                        format: "uuid",
                                    },
                                    quantity: {
                                        type: "integer",
                                        minimum: 1,
                                    },
                                    unit_price: {
                                        type: "number",
                                        minimum: 0,
                                    },
                                    modifier_option_ids: {
                                        type: "array",
                                        items: {
                                            type: "string",
                                            format: "uuid",
                                        },
                                    },
                                },
                            },
                        },
                        payment_method: {
                            type: "string",
                            enum: ["cash", "qr"],
                            description:
                                "Optional - process payment with order creation",
                        },
                        amount_received: {
                            type: "number",
                            description: "Required when payment_method is cash",
                        },
                    },
                },
                ProcessPaymentRequest: {
                    type: "object",
                    required: ["payment_method"],
                    properties: {
                        payment_method: {
                            type: "string",
                            enum: ["cash", "qr"],
                        },
                        amount_received: {
                            type: "number",
                            description: "Required for cash payments",
                        },
                        notes: {
                            type: "string",
                        },
                    },
                },
                UpdateOrderStatusRequest: {
                    type: "object",
                    required: ["status"],
                    properties: {
                        status: {
                            type: "string",
                            enum: ["pending", "completed"],
                        },
                    },
                },
                RequestVoidRequest: {
                    type: "object",
                    required: ["reason"],
                    properties: {
                        reason: { type: "string" },
                    },
                },
                Discount: {
                    type: "object",
                    properties: {
                        id: { type: "string", format: "uuid" },
                        name: { type: "string" },
                        type: {
                            type: "string",
                            enum: ["percentage", "fixed_amount", "bogo"],
                        },
                        value: {
                            type: "string",
                            nullable: true,
                        },
                        buyItemId: {
                            type: "string",
                            format: "uuid",
                            nullable: true,
                        },
                        freeItemId: {
                            type: "string",
                            format: "uuid",
                            nullable: true,
                        },
                        isActive: { type: "boolean" },
                        startsAt: {
                            type: "string",
                            format: "date-time",
                            nullable: true,
                        },
                        endsAt: {
                            type: "string",
                            format: "date-time",
                            nullable: true,
                        },
                        createdAt: {
                            type: "string",
                            format: "date-time",
                        },
                        updatedAt: {
                            type: "string",
                            format: "date-time",
                        },
                    },
                    required: [
                        "id",
                        "name",
                        "type",
                        "isActive",
                        "createdAt",
                        "updatedAt",
                    ],
                },
                Payment: {
                    type: "object",
                    properties: {
                        id: { type: "string", format: "uuid" },
                        orderId: {
                            type: "string",
                            format: "uuid",
                        },
                        method: {
                            type: "string",
                            enum: ["cash", "qr"],
                        },
                        amount: { type: "string" },
                        amountReceived: {
                            type: "string",
                            nullable: true,
                        },
                        changeAmount: {
                            type: "string",
                            nullable: true,
                        },
                        status: {
                            type: "string",
                            enum: ["pending", "completed", "refunded"],
                        },
                        createdBy: {
                            $ref: "#/components/schemas/OrderEmployee",
                        },
                        createdAt: {
                            type: "string",
                            format: "date-time",
                        },
                        updatedAt: {
                            type: "string",
                            format: "date-time",
                        },
                    },
                    required: [
                        "id",
                        "orderId",
                        "method",
                        "amount",
                        "status",
                        "createdBy",
                        "createdAt",
                        "updatedAt",
                    ],
                },
            },
            responses: {
                Unauthorized: {
                    description: "Missing or invalid authentication token",
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/Error",
                            },
                        },
                    },
                },
                Forbidden: {
                    description: "Insufficient role permissions",
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/Error",
                            },
                        },
                    },
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ["./src/routes/*.ts"],
};

const swaggerSpec = swaggerJsdoc(options);

const swaggerDocs = (app: Express, port: number) => {
    // swagger page
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    // docs in json format
    app.get("/api-docs.json", (_: Request, res: Response) => {
        res.setHeader("Content-Type", "application/json");
        res.send(swaggerSpec);
    });

    logger.info(`Swagger docs available at http://localhost:${port}/api-docs`);
};

export default swaggerDocs;
export { swaggerDocs };
