# AGENTS.md

## Commands

| Command                | Purpose                                         |
| ---------------------- | ----------------------------------------------- |
| `npm run dev`          | Start dev server with hot reload (tsx watch)    |
| `npm run build`        | Type-check only (noEmit: true — no JS output)   |
| `npm start`            | Run via tsx for production                      |
| `npm run format`       | Format all files with Prettier                  |
| `npm run format:check` | Check formatting (CI)                           |
| `npm run db:generate`  | Generate Drizzle migrations from schema changes |
| `npm run db:migrate`   | Apply pending migrations                        |
| `npm run db:push`      | Push schema directly (bypasses migrations)      |
| `npm run db:studio`    | Open Drizzle Studio GUI                         |

Before committing, run: `npm run format && npm run build`

## Architecture

- **Runtime**: `tsx` runs TypeScript directly. `tsc` only type-checks (`noEmit: true`). No `dist/` JS output exists at runtime.
- **ESM**: `"type": "module"` — use `import`/`export`, never `require()`.
- **Entry point**: `src/index.ts` — creates Express app, attaches middleware, mounts routes at `/api`, starts server.
- **Routes**: `src/routes/index.ts` — all routes registered on a single `Router`, exported as default.
- **DB**: PostgreSQL via Drizzle ORM (`drizzle-orm/node-postgres`) with `pg` driver. Supabase-hosted. Connection string from `SUPABASE_DATABASE_URL` env var.
- **Schema**: Drizzle table definitions in `src/db/schema/index.ts`. Add new tables here and import from this barrel.
- **DB client**: Export `db` from `src/db/index.ts`. Import and use directly in route handlers — no repository layer.
- **Migrations**: Output to `src/db/migrations/` (auto-generated, ignored by Prettier).

## Migration workflow

Use a separate Supabase project for dev and production. Both read `SUPABASE_DATABASE_URL` — just point each environment at its own project.

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

Drizzle tracks applied migrations in a `__drizzle_migrations` table — it only runs what hasn't been applied.

### Rules

- **Commit** migration files to git — they are the schema history
- **Never** edit a migration that has been applied to production — create a new one
- **Never** run `db:push` against production — it bypasses versioning
- The same migration files work on both dev and prod — Drizzle's tracking table handles the difference

## Barrel files (`index.ts`)

Every folder's `index.ts` is a **public barrel** — it re-exports everything consumers outside the folder should use. Imports always point at the barrel path, never at individual files inside a folder.

When a folder grows past these thresholds, extract to separate files and turn the `index.ts` into a pure re-export barrel:

| Folder            | Keep inline until                                 | Split strategy                                                       |
| ----------------- | ------------------------------------------------- | -------------------------------------------------------------------- |
| `src/routes/`     | ~4 route groups                                   | One file per domain (`routes/settings.ts`), merge in `index.ts`      |
| `src/db/schema/`  | ~5 tables                                         | One file per table (`schema/settings.ts`), re-export from `index.ts` |
| `src/middleware/` | Related logic fits together                       | One file per unrelated middleware                                    |
| `src/util/`       | _Never_ — each utility is its own file, no barrel |
| `src/db/`         | _Never_ — only the client + connection setup      |

When splitting, consumers should **never need to change their imports** — they continue importing from the barrel:

```ts
// src/db/schema/index.ts
export { settings } from "./settings.ts";
export { orders } from "./orders.ts";
```

## Conventions

- **Arrow functions only** — use `const foo = () => {}`, never `function foo() {}`.
- **Import extensions**: Always use `.ts` extensions in relative imports — e.g. `import { db } from "../db/index.ts"`. Enabled by `allowImportingTsExtensions` + `moduleResolution: "bundler"`.
- **Prettier**: Semicolons on, tab width 4, double quotes, trailing commas.
- **Express 5**: Async route handlers that throw errors are automatically caught by the error handler — no need for `next(err)`.

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

- Use `validateBody(schema)`, `validateParams(schema)`, `validateQuery(schema)` from `src/middleware/index.ts`.
- They return parsed data (with Zod coercion/defaults applied) via `req.body` / `req.params` / `req.query`.
- Do not inline `safeParse` in route handlers — apply as middleware.
