ALTER TABLE "employees" RENAME COLUMN "supabase_uid" TO "clerk_user_id";--> statement-breakpoint
DROP INDEX "employees_supabase_uid_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "employees_clerk_user_id_unique" ON "employees" USING btree ("clerk_user_id") WHERE "employees"."deleted_at" is null;