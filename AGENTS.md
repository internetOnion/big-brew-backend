# AGENTS.md

## Commands

| Command                | Purpose                                                                   |
| ---------------------- | ------------------------------------------------------------------------- |
| `npm run dev`          | Start dev server with hot reload (tsx watch)                              |
| `npm run build`        | Type-check only (noEmit: true — no JS output)                             |
| `npm start`            | Run via tsx for production                                                |
| `npm run format`       | Format all files with Prettier                                            |
| `npm run format:check` | Check formatting (CI)                                                     |
| `npm run db:generate`  | Generate Drizzle migrations from schema changes                           |
| `npm run db:migrate`   | Apply pending migrations                                                  |
| `npm run db:push`      | Push schema directly (bypasses migrations)                                |
| `npm run db:seed`      | Seed dev data (employees, menu, modifiers, etc.)                          |
| `npm run db:reset`     | Truncate all tables **and** delete Supabase Auth users — destructive      |
| `npm run db:studio`    | Open Drizzle Studio GUI                                                   |

Before committing, run: `npm run format && npm run build`

There are no tests.

## Architecture

- **Runtime**: `tsx` runs TypeScript directly. `tsc` only type-checks (`noEmit: true`). No `dist/` JS output.
- **ESM**: `"type": "module"` — use `import`/`export`, never `require()`.
- **Entry point**: `src/index.ts` — starts Express on the configured port.
- **App setup**: `src/app.ts` — creates Express app, attaches middleware (pino-http, cors, json, cookie-parser), mounts routes at `/api`, attaches `notFound` + `errorHandler`.
- **Layered architecture**: Routes → Controllers → Services → Repositories → DB (Models)

| Layer            | Directory              | Responsibility                         |
| ---------------- | ---------------------- | -------------------------------------- |
| Routes           | `src/routes/`          | Zod schemas, wire middleware, delegate  |
| Controllers      | `src/controllers/`     | Extract params, call service, send res  |
| Services         | `src/services/`        | Business logic, auth orchestration      |
| Repositories     | `src/repositories/`    | Drizzle queries, return typed results   |
| Models           | `src/models/`          | DB client (`index.ts`), schema, migrations, seed/reset |

- **DB client**: `src/models/index.ts` — exports `db` (Drizzle instance) and `pool` (pg Pool). Connection from `SUPABASE_DATABASE_URL`.
- **Schema**: `src/models/schema/index.ts` — barrel re-exporting all Drizzle table/enum definitions. Tables are PostgreSQL, hosted on Supabase.
- **Migrations**: Output to `src/models/migrations/` (auto-generated, ignored by Prettier).
- **Config**: `src/config/index.ts` — loads `dotenv` and exports typed config object (port, secrets, JWT expiry, cookie options).
- **Supabase clients**: `src/lib/supabase.ts` — `supabaseAdmin` (service role) and `supabaseAuth` (publishable key). Used by auth middleware and seed/reset.
- **Auth middleware** (`src/middlewares/auth.ts`): Dual-mode. Tries local JWT (issued by this server) first; if that fails with expiry, falls back to verifying as a Supabase access token. Sets `req.employee` on success. `requireRole()` gates by employee role (`barista`, `manager`, `owner`). Refresh tokens use HTTP-only cookies scoped to `path: "/api/auth"` — new auth endpoints must stay under `/api/auth` or the cookie won't be sent.
- **Error handler** (`src/middlewares/errorHandler.ts`): Catches all thrown errors. `AppError` instances return their status code + JSON body. Unexpected errors log the stack and return 500.

## Seed and reset

Both require `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (Supabase Admin API for creating/deleting auth users). Useful workflow:

```
npm run db:reset && npm run db:seed
```

`db:seed` auto-creates Supabase Auth users for each employee. In production, set `SEED_EMPLOYEES` env var to a JSON array to override the hardcoded dev data:

```
SEED_EMPLOYEES='[{"id":"...","name":"Owner","role":"owner","email":"owner@example.com","password":"Pass123","pin":"000000"}]'
```

`db:reset` truncates all tables with `RESTART IDENTITY CASCADE` **and** deletes all Supabase Auth users. Destructive — never run against production.

## Migration workflow

Use a separate Supabase project for dev and production. Both read `SUPABASE_DATABASE_URL`.

### Dev iteration

```
npm run db:push       # sync schema directly (no migration file — fast)
```

### Lock in a change

```
npm run db:generate   # diff schema vs dev DB → creates SQL migration file
npm run db:migrate    # apply the new migration to dev (marks it done)
```

### Ship to production

```
# CI or deployment step (against production SUPABASE_DATABASE_URL)
npm run db:migrate    # applies only pending migrations
```

Drizzle tracks applied migrations in a `__drizzle_migrations` table.

### Rules

- **Commit** migration files to git
- **Never** edit a migration applied to production — create a new one
- **Never** run `db:push` against production
- The same migration files work on both dev and prod

## Barrel files (`index.ts`)

Every folder's `index.ts` is a **public barrel** — it re-exports everything consumers outside the folder should use. Imports always point at the barrel path, never at individual files.

When a folder grows past these thresholds, extract to separate files and turn the `index.ts` into a pure re-export barrel:

| Folder                 | Keep inline until    | Split strategy                                                       |
| ---------------------- | -------------------- | -------------------------------------------------------------------- |
| `src/routes/`          | ~4 route groups      | One file per domain (`routes/settings.ts`), merge in `index.ts`      |
| `src/models/schema/`   | ~5 tables            | One file per table (`schema/settings.ts`), re-export from `index.ts` |
| `src/middlewares/`     | Related logic fits   | One file per unrelated middleware                                    |
| `src/utils/`           | _Never_ — each file is its own utility                                |

When splitting, consumers should **never need to change their imports** — they continue importing from the barrel.

## Conventions

- **Arrow functions only** — `const foo = () => {}`, never `function foo() {}`.
- **Import extensions**: Always use `.ts` extensions in relative imports — e.g. `import { db } from "../models/index.ts"`.
- **Prettier**: Semicolons on, tab width 4, double quotes, trailing commas (`all`).
- **Express 5**: Async route handlers that throw errors are automatically caught by the error handler — no need for `next(err)`.
- **Singletons**: Controllers, services, and repositories export a named class AND an instantiated singleton (`export const settingsService = new SettingsService()`). Always import the singleton.

## Error handling

- **Never** call `res.status(xxx).json()` for errors. **Always** throw using factory methods:
    - `AppError.badRequest("message")` (400)
    - `AppError.notFound("message")` (404)
    - `AppError.unauthorized("message")` (401)
    - `AppError.forbidden("message")` (403)
    - `AppError.conflict("message")` (409)
    - `AppError.unprocessable("message")` (422)
    - `AppError.internal("message")` (500)
- Pass validation errors as second argument: `AppError.badRequest("Validation failed", zodError.flatten())`.
- The global `errorHandler` middleware logs the stack for non-`AppError` errors and returns 500.

## Validation

- Use `validateBody(schema)`, `validateParams(schema)`, `validateQuery(schema)` from `src/middlewares/index.ts`.
- They return parsed data (with Zod coercion/defaults applied) via `req.body` / `req.params` / `req.query`.
- Define Zod schemas in route files, not inline in `safeParse` calls.
