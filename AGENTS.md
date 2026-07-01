# AGENTS.md

## Commands

| Command                | Purpose                                                              |
| -------------------- | -------------------------------------------------------------------- |
| `npm run dev`          | Start dev server with hot reload (tsx watch)                           |
| `npm run build`        | Type-check only (noEmit: true — no JS output)                          |
| `npm start`            | Run via tsx for production                                             |
| `npm run format`       | Format all files with Prettier                                         |
| `npm run format:check` | Check formatting (CI)                                                  |
| `npm run db:generate`  | Generate Drizzle migrations from schema changes                        |
| `npm run db:migrate`   | Apply pending migrations                                               |
| `npm run db:push`      | Push schema directly (bypasses migrations)                             |
| `npm run db:seed`      | Seed dev data (employees, menu, modifiers, etc.)                       |
| `npm run db:reset`     | Truncate all tables **and** delete Supabase Auth users — destructive   |
| `npm run db:studio`    | Open Drizzle Studio GUI                                                |

Before committing, run: `npm run format && npm run build`

There are no tests.

## Setup

Copy `.env.example` and fill in real Supabase credentials. The critical two are `SUPABASE_DATABASE_URL` and `SUPABASE_URL`. `SUPABASE_SECRET_KEY` is also required for `db:seed` and `db:reset`.

Cookie `secure` defaults to `true`. For local HTTP dev, set `COOKIE_SECURE=false` in `.env`.

## Architecture

- **Runtime**: `tsx` runs TypeScript directly. `tsc` only type-checks (`noEmit: true`). No `dist/` JS output.
- **ESM**: `"type": "module"` — use `import`/`export`, never `require()`.
- **tsconfig**: `allowImportingTsExtensions: true` and `moduleResolution: "bundler"` enable `.ts` extensions in imports.
- **Entry point**: `src/index.ts` — starts Express, graceful shutdown (SIGTERM/SIGINT, uncaughtException, unhandledRejection) drains the pg pool with a 10-second forced timeout.
- **App setup**: `src/app.ts` — Express app with pino-http, cors, json, cookie-parser. Routes mounted at `/api` via `src/features/index.ts`. Swagger UI at `/api-docs`. `notFound` + `errorHandler` attached last.
- **Feature-based architecture**: Each domain has controller, service, repository, and routes co-located in `src/features/{domain}/`. Shared code lives in `src/shared/`.

| Directory               | Purpose                                             |
| ----------------------- | --------------------------------------------------- |
| `src/features/{domain}/`| Domain-specific controller, service, repo, routes   |
| `src/features/index.ts` | Route composer — imports and mounts all domain routers |
| `src/shared/models/`    | DB client, schema, migrations, seed, reset          |
| `src/shared/middlewares/`| Auth, validation, error handling                    |
| `src/shared/utils/`     | AppError, format helpers, logger, swagger           |
| `src/shared/types/`     | Shared TypeScript types                             |
| `src/shared/config/`    | Environment config                                  |
| `src/shared/lib/`       | Supabase clients                                    |

- **DB client**: `src/shared/models/index.ts` — exports `db` (Drizzle instance) and `pool` (pg Pool).
- **Schema**: `src/shared/models/schema/index.ts` — barrel re-exporting all Drizzle table/enum definitions.
- **Migrations**: Output to `src/shared/models/migrations/` (auto-generated, excluded from Prettier). `drizzle.config.ts` is at the repo root.
- **Config**: `src/shared/config/index.ts` — loads `dotenv`, exports typed config. Token expiry hardcoded (`"15m"` access, `"7d"` refresh). Cookie `path` is `"/api/auth"`. `CORS_ORIGIN` is comma-separated.
- **Supabase clients**: `src/shared/lib/supabase.ts` — `supabaseAdmin` (service role) and `supabaseAuth` (publishable key).
- **Auth middleware** (`src/shared/middlewares/auth.ts`): Tries local JWT first. Expired JWT throws immediately (no fallback). Other JWT failures fall back to Supabase `getUser(token)`. Sets `req.employee`. `requireRole()` gates by `barista` | `manager` | `owner`.
- **Refresh tokens**: SHA-256 hashes in `refresh_tokens` table. HTTP-only cookie on path `/api/auth` — auth endpoints (`/refresh`, `/logout`, `/me`) must stay under that path.
- **File uploads**: `multer` (memory storage) in storage routes. Images only (JPEG, PNG, GIF, WebP, SVG, BMP, TIFF), max 5MB. Files go to Supabase Storage.
- **Error handler** (`src/shared/middlewares/errorHandler.ts`): `AppError` → status + JSON. `MulterError` → 400. Unexpected → log stack + 500.
- **Logging**: Pino via `src/shared/utils/logger.ts`. Non-prod uses `pino-pretty`. Level from `LOG_LEVEL` env (default `"info"`).
- **Swagger/OpenAPI**: `@openapi` JSDoc annotations on route files (consumed by `swagger-jsdoc`). UI at `/api-docs`, spec at `/api-docs.json`. Shared schemas/responses in `src/shared/utils/swagger.ts`. New routes **must** include `@openapi` blocks.
- **Menu items + modifier groups**: `modifier_groups` has a `menu_item_id` FK directly (per-item, not shared). See `docs/menu-item-creation-flow.md` for the multi-step creation flow.

## Seed and reset

Both require `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (Supabase Admin API).

```
npm run db:reset && npm run db:seed
```

`db:seed` auto-creates Supabase Auth users. Override with `SEED_EMPLOYEES` env var (JSON array). `db:reset` truncates with `RESTART IDENTITY CASCADE` and deletes all Supabase Auth users. Destructive — never in production.

## Migration workflow

Use separate Supabase projects for dev and prod.

- **Dev iteration**: `npm run db:push` (sync schema directly, no migration file)
- **Lock in a change**: `npm run db:generate` then `npm run db:migrate`
- **Ship to production**: `npm run db:migrate` against production `SUPABASE_DATABASE_URL`

Drizzle tracks applied migrations in `__drizzle_migrations`.

**Rules**: Commit migration files. Never edit a production migration. Never `db:push` against production.

## File structure

Domain files are co-located in `src/features/{domain}/`. Each domain typically has:

- `*.routes.ts` — Zod schemas, route definitions, `@openapi` annotations
- `*.controller.ts` — Extract params, call service, send response
- `*.service.ts` — Business logic, orchestration
- `*.repository.ts` — Drizzle queries, typed results

Shared code lives in `src/shared/`:

- `src/shared/models/schema/` — one file per table, re-exported from `index.ts`
- `src/shared/middlewares/` — one file per middleware
- `src/shared/utils/` — each file is its own utility
- `src/shared/types/` — shared TypeScript types

Route mounting: `src/features/index.ts` imports each domain's router and mounts it under `/api`.

## Conventions

- **Arrow functions only** — `const foo = () => {}`, never `function foo() {}`.
- **Import extensions**: Always use `.ts` in relative imports — `import { db } from "../../shared/models/index.ts"`.
- **Prettier**: Semicolons, tab width 4, double quotes, trailing commas (`all`). `AGENTS.md`, `.agents/`, `src/shared/models/migrations/` excluded.
- **File suffixes**: `.routes.ts`, `.controller.ts`, `.service.ts`, `.repository.ts`.
- **Express 5**: Async handlers that throw are auto-caught — no `next(err)` needed.
- **Singletons**: Each controller/service/repository exports a named class AND an instantiated singleton. Always import the singleton.
- **Sensitive field stripping**: Use `formatEmployee()` from `src/shared/utils/formatEmployee.ts` to omit `pin` and internal fields.
- **Shared types**: `src/shared/types/index.ts` — `EmployeeRole`, `EmployeePayload`, `ApiResponse<T>`, `PaginatedResponse<T>`. Role types derived from Drizzle enums, not hand-written unions.
- **Route params**: Every route with path params must use `validateParams`. Use `z.uuid()` (Zod 4.x, not `z.string().uuid()`).
- **Zod schemas**: Define in route files, not inline. Always chain `.strict()`.
- **Skills**: `.agents/` directory has bundled OpenCode skills (Supabase, backend patterns, etc.).

## Error handling

**Never** call `res.status(xxx).json()` for errors. **Always** throw:

- `AppError.badRequest("msg")` → 400
- `AppError.unauthorized("msg")` → 401
- `AppError.forbidden("msg")` → 403
- `AppError.notFound("msg")` → 404
- `AppError.conflict("msg")` → 409
- `AppError.unprocessable("msg")` → 422
- `AppError.internal("msg")` → 500

Pass Zod errors as second arg: `AppError.badRequest("Validation failed", zodError.flatten())`.

## Validation

Use `validateBody`, `validateParams`, `validateQuery` from `src/shared/middlewares/index.ts`. They replace `req.body`/`req.params`/`req.query` with parsed data.

## Gotchas

- `src/shared/utils/swagger.ts` has a bare `import logger from "./logger"` (no `.ts` extension) — this is an existing inconsistency, not the norm.
- `src/features/ingredients/ingredient.respository.ts` has a typo ("respository") — it's consistent across the codebase, don't "fix" it.
- `src/shared/middlewares/validate.ts` imports `AppError` without `.ts` extension — another existing inconsistency.
- `src/features/menu/modifiers/modifierOptionIngredient.ts` does not follow the `.service.ts` naming convention — use `modifierGroup.service.ts` instead.
