ALTER TABLE "discounts" DROP CONSTRAINT "chk_discount_bogo_items";--> statement-breakpoint
ALTER TABLE "discounts" ADD CONSTRAINT "chk_discount_bogo_items" CHECK ((
                "discounts"."type" != 'bogo' OR
                ("discounts"."buy_item_id" IS NOT NULL OR "discounts"."free_item_id" IS NOT NULL)
            ));