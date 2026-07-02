ALTER TABLE "categories" DROP CONSTRAINT "categories_name_unique";--> statement-breakpoint
ALTER TABLE "employees" DROP CONSTRAINT "employees_pin_unique";--> statement-breakpoint
ALTER TABLE "employees" DROP CONSTRAINT "employees_supabase_uid_unique";--> statement-breakpoint
ALTER TABLE "menu_items" DROP CONSTRAINT "menu_items_name_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "categories_name_unique" ON "categories" USING btree ("name") WHERE "categories"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "employees_pin_unique" ON "employees" USING btree ("pin") WHERE "employees"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "employees_supabase_uid_unique" ON "employees" USING btree ("supabase_uid") WHERE "employees"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "menu_items_name_unique" ON "menu_items" USING btree ("name") WHERE "menu_items"."deleted_at" is null;