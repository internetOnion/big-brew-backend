# AGENTS.md

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server with hot reload (tsx watch) |
| `npm run build` | Type-check only (`noEmit: true` — no JS output) |
| `npm start` | Run via tsx for production |
| `npm run format` | Format all files with Prettier |
| `npm run format:check` | Check formatting (CI) |
| `npm run db:generate` | Generate Drizzle migrations from schema changes |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:push` | Push schema directly (bypasses migrations) |
| `npm run db:seed` | Seed dev data (employees, menu, modifiers, etc.) |
| `npm run db:reset` | Truncate all tables **and** delete Clerk auth users — destructive |
| `npm run db:studio` | Open Drizzle Studio GUI |
| `npx vitest run` | Run all unit tests |
| `npx vitest run src/path/to/file.test.ts` | Run a single test file |

Before committing: `npm run format && npm run build && npx vitest run`

No CI for build/test/lint. `npm test` runs vitest in **watch** mode — use `npx vitest run` for one-shot. Only `.github/workflows/nightly-backup.yml` exists (DB backup, not a build gate). Stale `dist/` may exist despite `noEmit: true` — ignore it, `build` never emits.

## Setup

Copy `.env.example`, fill in `NEON_DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `CLERK_SECRET_KEY`. For local HTTP, set `COOKIE_SECURE=false`.

## Architecture

- **Runtime**: `tsx` runs TypeScript directly. `tsc` only type-checks (`noEmit: true`).
- **ESM**: `"type": "module"` — `.ts` extensions required in relative imports (tsconfig `allowImportingTsExtensions` + `moduleResolution: "bundler"`).
- **Express 5**: Async handlers auto-catch thrown errors — no `next(err)` needed.
- **Entry**: `src/index.ts` — starts Express, graceful shutdown drains pg pool with 10s forced timeout.
- **App**: `src/app.ts` — pino-http, cors (comma-separated `CORS_ORIGIN`), json, cookie-parser. Routes at `/api`. Swagger at `/api-docs`.
- **Features**: controller/service/repository/routes per domain in `src/features/{domain}/`. Shared code in `src/shared/`.
- **DB**: Drizzle ORM + pg Pool via `src/shared/models/index.ts` (exports `db` and `pool`). Uses `NEON_DATABASE_URL`.
- **Schema**: `src/shared/models/schema/index.ts` barrel re-exports all table/enum definitions. Enums defined in `enums.ts`.
- **Migrations**: `src/shared/models/migrations/` (auto-generated, excluded from Prettier). `drizzle.config.ts` at root.
- **Config**: `src/shared/config/index.ts` loads dotenv, typed config. Token expiry hardcoded (`"15m"` access, `"7d"` refresh). Cookie `path: "/api/auth"`.
- **Auth**: Clerk (`src/shared/lib/clerk.ts`) handles user creation and password verification. Local JWT for API auth (`src/shared/middlewares/auth.ts`). No Supabase Auth.
- **Auth middleware**: Verifies local JWT, looks up employee by ID in DB. Expired JWT throws immediately. Sets `req.employee`. `requireRole("barista" | "manager" | "owner")` gates endpoints.
- **Refresh tokens**: SHA-256 hashed in `refresh_tokens` table. HTTP-only cookie on path `/api/auth`.
- **Error handler**: `AppError.badRequest/unauthorized/forbidden/notFound/conflict/unprocessable/internal` — always throw, never `res.status().json()`. Pass Zod errors as second arg: `AppError.badRequest("msg", zodError.flatten())`.
- **Validation**: `validateBody`, `validateParams`, `validateQuery` from `src/shared/middlewares/index.ts` replace `req.body`/`req.params`/`req.query` with parsed data.
- **Logging**: Pino via `src/shared/utils/logger.ts`. Non-prod uses `pino-pretty`. Log level from `LOG_LEVEL` (default `"info"`).
- **Swagger**: `@openapi` JSDoc on route files, consumed by `swagger-jsdoc`. New routes **must** include `@openapi` blocks. Shared schemas in `src/shared/utils/swagger.ts`.
- **File uploads**: `multer` (memory storage). Images only (JPEG, PNG, GIF, WebP, SVG, BMP, TIFF), max 5MB. Files go to Supabase Storage (raw HTTP, no SDK).
- **Soft deletes**: Most tables use `deletedAt` timestamp — queries should filter `isNull(deletedAt)`.

## Seed and reset

Both require `NEON_DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `CLERK_SECRET_KEY`.

```
npm run db:reset && npm run db:seed
```

`db:seed` is idempotent (`onConflictDoNothing`), auto-creates Clerk auth users. Override employees with `SEED_EMPLOYEES` env var (JSON array). `db:reset` truncates `RESTART IDENTITY CASCADE` and deletes all Clerk users — destructive, never in production.

## Migration workflow

- **Dev iteration**: `npm run db:push` (sync schema directly, no migration file)
- **Lock in**: `npm run db:generate` then `npm run db:migrate`
- **Ship to production**: `npm run db:migrate` against production `NEON_DATABASE_URL`

Commit migration files. Never edit a production migration. Never `db:push` against production.

## Conventions

- Only arrow functions (`const foo = () => {}`).
- `.ts` extension in all relative imports (with known exceptions in gotchas).
- File suffixes: `.routes.ts`, `.controller.ts`, `.service.ts`, `.repository.ts`.
- Singletons: each class file exports a named class AND an instantiated singleton. Import the singleton.
- Zod schemas defined in route files, not inline. Always `.strict()`.
- Path params: `z.uuid()` (Zod 4.x), validated via `validateParams`.
- Types derived from Drizzle enums, not hand-written unions. See `src/shared/types/index.ts`.
- Use `formatEmployee/formatCategory/formatIngredient/formatMenuItem/formatModifierGroup/formatModifierOption` from `src/shared/utils/` to strip internal fields from responses.
- `AppError` for all errors — never direct `res.status().json()`.
- Settings routes apply `authenticate` + `requireRole` **per-route** (the `// ── Protected ──` comment in `features/index.ts` is approximate).
- vitest has `globals: true` — no need to import `describe`/`it`/`expect`.

## Gotchas

- `src/features/ingredients/ingredient.respository.ts` has a typo ("respository") — consistent across the codebase, don't fix it.
- Three known imports missing `.ts` extension: `swagger.ts` → logger, `validate.ts` → AppError, `logger.ts` → config. Don't fix.
- `src/features/menu/modifiers/modifierOptionIngredient.ts` doesn't follow `.service.ts` naming — use `modifierGroup.service.ts` instead.
- Menu sub-resources: recipes at `/menu-items/:menuItemId/recipes`, modifier-groups at `/menu-items/:menuItemId/modifier-groups` (both use `mergeParams: true`).
- `POST /menu-items` supports batch creation (menu item + recipes + modifier groups + options + ingredients in one atomic transaction).
- Categories use `router.use(authenticate)` at router level; ingredients and most other domains apply auth per-route.
- Auth routes (`/api/auth/*`) are public except `POST /auth/signup` (requires owner or manager).
- Employee routes are **public** at the router level (no `authenticate` in the mount) — each route applies its own auth.
- `.prettierignore` excludes `AGENTS.md`, `.agents/`, `src/shared/models/migrations/`. Note: `.prettierignore` has a stale path `src/models/migrations/` but the real dir is `src/shared/models/migrations/`.
