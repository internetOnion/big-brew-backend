ALTER TABLE "menu_item_modifier_groups" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "menu_item_modifier_option_overrides" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "menu_item_modifier_groups" CASCADE;--> statement-breakpoint
DROP TABLE "menu_item_modifier_option_overrides" CASCADE;--> statement-breakpoint
ALTER TABLE "categories" DROP CONSTRAINT "categories_sort_order_unique";--> statement-breakpoint
ALTER TABLE "modifier_option_ingredients" DROP CONSTRAINT "modifier_option_ingredients_item_id_modifier_option_id_ingredient_id_unique";--> statement-breakpoint
ALTER TABLE "modifier_option_ingredients" DROP CONSTRAINT "modifier_option_ingredients_item_id_menu_items_id_fk";
--> statement-breakpoint
DROP INDEX "idx_moi_item_option";--> statement-breakpoint
ALTER TABLE "modifier_groups" ADD COLUMN "menu_item_id" uuid;--> statement-breakpoint
ALTER TABLE "modifier_groups" ADD CONSTRAINT "modifier_groups_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_modifier_groups_menu_item" ON "modifier_groups" USING btree ("menu_item_id");--> statement-breakpoint
ALTER TABLE "categories" DROP COLUMN "color";--> statement-breakpoint
ALTER TABLE "modifier_option_ingredients" DROP COLUMN "item_id";--> statement-breakpoint
ALTER TABLE "modifier_option_ingredients" ADD CONSTRAINT "modifier_option_ingredients_modifier_option_id_ingredient_id_unique" UNIQUE("modifier_option_id","ingredient_id");