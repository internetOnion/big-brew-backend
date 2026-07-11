CREATE TYPE "public"."discount_applies_to" AS ENUM('order', 'item');--> statement-breakpoint
ALTER TABLE "discounts" ADD COLUMN "applies_to" "discount_applies_to" DEFAULT 'order' NOT NULL;--> statement-breakpoint
ALTER TABLE "discounts" ADD COLUMN "item_id" uuid;--> statement-breakpoint
ALTER TABLE "discounts" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_item_id_menu_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."menu_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_discounts_item" ON "discounts" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "idx_discounts_deleted" ON "discounts" USING btree ("deleted_at");--> statement-breakpoint
ALTER TABLE "discounts" ADD CONSTRAINT "chk_discount_bogo_items" CHECK ((
                "discounts"."type" != 'bogo' OR
                ("discounts"."buy_item_id" IS NOT NULL AND "discounts"."free_item_id" IS NOT NULL)
            ));--> statement-breakpoint
ALTER TABLE "discounts" ADD CONSTRAINT "chk_discount_applies_to" CHECK ((
                ("discounts"."type" = 'bogo' AND "discounts"."applies_to" = 'item') OR
                ("discounts"."type" IN ('percentage', 'fixed_amount'))
            ));--> statement-breakpoint
ALTER TABLE "discounts" ADD CONSTRAINT "chk_discount_item_id" CHECK ((
                ("discounts"."applies_to" = 'order' AND "discounts"."item_id" IS NULL) OR
                ("discounts"."applies_to" = 'item' AND "discounts"."type" = 'bogo' AND "discounts"."item_id" IS NULL) OR
                ("discounts"."applies_to" = 'item' AND "discounts"."type" IN ('percentage', 'fixed_amount') AND "discounts"."item_id" IS NOT NULL)
            ));