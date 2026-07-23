# Big Brew - Backend

REST API for a craft coffee POS and operations management system. Handles authentication, menu management, order processing, inventory, analytics, and file storage.

## Features

**Authentication & Access Control**
- Email/password login backed by Clerk (user creation + password verification)
- Local JWT access tokens and refresh tokens in HTTP-only cookies
- Role-based authorization: `barista`, `manager`
- 6-digit PIN verification for sensitive actions
- Automatic token refresh via cookie

**Menu Management**
- CRUD for menu items with image upload to Supabase Storage
- Recipe management 
- Modifier groups with single/multi selection and pricing
- Category management with display ordering

**Order Processing**
- Order creation with items, modifier selections, and dining option
- Cash payment with amount-received and change calculation
- QR payment recording
- Void workflow
- Status tracking

**Inventory**
- Ingredient CRUD with stock quantity and unit tracking
- Stock adjustments with reason and history log
- Automatic stock deduction on order placement via item recipes

**Analytics & Reporting**
- Revenue over time with configurable grouping
- Top-selling items
- Expense breakdown
- Summary with aggregated metrics

**Operations**
- Employee management with role assignment and PIN resets
- Expense tracking with category classification
- Discount management 
- Terminal management for POS hardware config
- Store settings 
- Soft deletes

## Architecture

```
src/
├── index.ts                         # Server entry: Express start + graceful shutdown
├── app.ts                           # Express app: middleware stack, route mounting, Swagger
├── features/
│   ├── auth/                        # Login, refresh, logout, PIN verify, signup
│   ├── menu/                        # Menu items, recipes, modifier groups, options, ingredients
│   ├── orders/                      # Create, status, payment, void workflow
│   ├── categories/                  # Category CRUD
│   ├── ingredients/                 # Ingredient CRUD + stock adjustments
│   ├── employees/                   # Employee CRUD + PIN management
│   ├── discounts/                   # Discount CRUD
│   ├── expenses/                    # Expense CRUD + categories
│   ├── analytics/                   # Revenue, top items, expenses, summary
│   ├── settings/                    # Store settings + logo upload
│   ├── terminals/                   # Terminal CRUD
│   ├── stock/                       # Stock movement history
│   └── storage/                     # File upload to Supabase
└── shared/
    ├── config/                      # Typed env config (dotenv)
    ├── lib/                         # Clerk client
    ├── middlewares/                  # Auth (JWT verify, role gate), validation (Zod)
    ├── models/                      # Drizzle schema, migrations, seed, reset
    ├── types/                       # Derived Drizzle types
    └── utils/                       # Logger (Pino), Swagger schemas, response formatters
```

**Per-domain pattern:** `controller.ts` → `service.ts` → `repository.ts` → `routes.ts` with `@openapi` JSDoc for auto-generated Swagger docs.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js, TypeScript via **tsx** (no compile step) |
| Framework | Express 5 (async error auto-catch) |
| Database | Neon Postgres, Drizzle ORM + Drizzle Kit |
| Auth | Clerk, local JWT (jsonwebtoken), bcrypt |
| Validation | Zod 4 with `drizzle-zod` integration |
| Storage | Supabase Storage (raw HTTP, no SDK) |
| Uploads | Multer (memory, 5MB max, images only) |
| Docs | swagger-jsdoc + swagger-ui-express (`/api-docs`) |
| Logging | Pino with `pino-pretty` in dev |
| Security | helmet, express-rate-limit, CORS |
| Testing | Vitest |
| Linting | ESLint with typescript-eslint |
| Formatting | Prettier |
| CI | GitHub Actions |
