DROP INDEX "idx_expenses_recorded_at";--> statement-breakpoint
DROP INDEX "idx_expenses_category";--> statement-breakpoint
DROP INDEX "idx_item_recipes_item";--> statement-breakpoint
DROP INDEX "idx_menu_items_deleted";--> statement-breakpoint
DROP INDEX "idx_modifier_groups_menu_item";--> statement-breakpoint
DROP INDEX "idx_modifier_options_group";--> statement-breakpoint
DROP INDEX "idx_orders_status";--> statement-breakpoint
DROP INDEX "idx_orders_created_at";--> statement-breakpoint
DROP INDEX "idx_orders_order_number";--> statement-breakpoint
DROP INDEX "idx_stock_movements_ingredient";--> statement-breakpoint
DROP INDEX "idx_stock_movements_created";--> statement-breakpoint
CREATE INDEX "idx_expenses_active_recorded" ON "expenses" USING btree ("recorded_at") WHERE "expenses"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "idx_expenses_category_recorded" ON "expenses" USING btree ("category","recorded_at");--> statement-breakpoint
CREATE INDEX "idx_menu_items_active" ON "menu_items" USING btree ("deleted_at") WHERE "menu_items"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "idx_modifier_groups_active" ON "modifier_groups" USING btree ("menu_item_id") WHERE "modifier_groups"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "idx_modifier_options_active" ON "modifier_options" USING btree ("modifier_group_id") WHERE "modifier_options"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "idx_orders_status_created" ON "orders" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "idx_stock_movements_ingredient_created" ON "stock_movements" USING btree ("ingredient_id","created_at");