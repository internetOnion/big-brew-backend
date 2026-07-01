ALTER TABLE "orders" ADD COLUMN "confirmed_by" uuid;--> statement-breakpoint
UPDATE "orders" SET "confirmed_by" = "created_by" WHERE "confirmed_by" IS NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "confirmed_by" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "khr_rate" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_confirmed_by_employees_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" DROP COLUMN "notes";
