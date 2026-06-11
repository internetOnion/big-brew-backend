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
                Settings: {
                    type: "object",
                    properties: {
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
                    },
                },
                LoginResponse: {
                    type: "object",
                    properties: {
                        employee: {
                            $ref: "#/components/schemas/Employee",
                        },
                        accessToken: { type: "string" },
                    },
                },
                RefreshResponse: {
                    type: "object",
                    properties: {
                        accessToken: { type: "string" },
                    },
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
