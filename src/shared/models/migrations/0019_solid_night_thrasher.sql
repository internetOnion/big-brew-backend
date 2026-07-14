ALTER TABLE "employees" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."employee_role";--> statement-breakpoint
CREATE TYPE "public"."employee_role" AS ENUM('barista', 'manager');--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "role" SET DATA TYPE "public"."employee_role" USING "role"::"public"."employee_role";--> statement-breakpoint
DROP INDEX "idx_expenses_category_recorded";--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "expense_category_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_expense_category_id_expense_categories_id_fk" FOREIGN KEY ("expense_category_id") REFERENCES "public"."expense_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_expenses_category_recorded" ON "expenses" USING btree ("expense_category_id","recorded_at");--> statement-breakpoint
ALTER TABLE "expenses" DROP COLUMN "category";