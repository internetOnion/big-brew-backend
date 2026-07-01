CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"method" "payment_method" NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"amount_received" numeric(10, 2),
	"change_amount" numeric(10, 2),
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_payment_amount_positive" CHECK ("payments"."amount" > 0),
	CONSTRAINT "chk_cash_fields" CHECK ((
                "payments"."method" != 'cash' OR
                ("payments"."amount_received" IS NOT NULL AND "payments"."change_amount" IS NOT NULL)
            ))
);
--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "chk_cash_fields";--> statement-breakpoint
DROP INDEX "idx_orders_payment_method";--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_employees_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_payments_order" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_payments_created_at" ON "payments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_payments_created_by" ON "payments" USING btree ("created_by");--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "payment_method";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "amount_received";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "change_amount";