ALTER TABLE "modifier_option_ingredients" DROP CONSTRAINT "modifier_option_ingredients_modifier_option_id_ingredient_id_un";--> statement-breakpoint
ALTER TABLE "modifier_option_ingredients" DROP CONSTRAINT "chk_moi_quantity_positive";--> statement-breakpoint
ALTER TABLE "item_recipes" DROP CONSTRAINT "chk_recipe_quantity_positive";--> statement-breakpoint
ALTER TABLE "order_items" DROP CONSTRAINT "chk_unit_price_positive";--> statement-breakpoint
ALTER TABLE "order_items" DROP CONSTRAINT "chk_quantity_positive";--> statement-breakpoint
ALTER TABLE "expenses" DROP CONSTRAINT "chk_expense_amount_positive";--> statement-breakpoint
ALTER TABLE "discounts" DROP CONSTRAINT "chk_discount_value";--> statement-breakpoint
ALTER TABLE "discounts" DROP CONSTRAINT "chk_discount_dates";--> statement-breakpoint
ALTER TABLE "discounts" DROP CONSTRAINT "chk_discount_bogo_items";--> statement-breakpoint
ALTER TABLE "discounts" DROP CONSTRAINT "chk_discount_applies_to";--> statement-breakpoint
ALTER TABLE "discounts" DROP CONSTRAINT "chk_discount_item_id";--> statement-breakpoint
ALTER TABLE "ingredients" DROP CONSTRAINT "chk_stock_non_negative";--> statement-breakpoint
ALTER TABLE "settings" DROP CONSTRAINT "chk_settings_single_row";--> statement-breakpoint
ALTER TABLE "payments" DROP CONSTRAINT "chk_payment_amount_positive";--> statement-breakpoint
ALTER TABLE "payments" DROP CONSTRAINT "chk_cash_fields";--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "chk_subtotal_non_negative";--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "chk_total_non_negative";--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "chk_discount_non_negative";--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "chk_void_approved_fields";--> statement-breakpoint
ALTER TABLE "menu_items" DROP CONSTRAINT "chk_base_price_positive";--> statement-breakpoint
ALTER TABLE "modifier_option_ingredients" DROP CONSTRAINT "modifier_option_ingredients_modifier_option_id_modifier_options";
--> statement-breakpoint
DROP INDEX "idx_moi_ingredient";--> statement-breakpoint
DROP INDEX "idx_item_recipes_ingredient";--> statement-breakpoint
DROP INDEX "terminals_clerk_user_id_unique";--> statement-breakpoint
DROP INDEX "idx_order_items_order";--> statement-breakpoint
DROP INDEX "idx_expenses_active_recorded";--> statement-breakpoint
DROP INDEX "idx_expenses_category_recorded";--> statement-breakpoint
DROP INDEX "idx_modifier_options_active";--> statement-breakpoint
DROP INDEX "idx_modifier_groups_active";--> statement-breakpoint
DROP INDEX "idx_discounts_buy_item";--> statement-breakpoint
DROP INDEX "idx_discounts_deleted";--> statement-breakpoint
DROP INDEX "idx_discounts_free_item";--> statement-breakpoint
DROP INDEX "idx_discounts_item";--> statement-breakpoint
DROP INDEX "idx_oim_order_item";--> statement-breakpoint
DROP INDEX "expense_categories_name_unique";--> statement-breakpoint
DROP INDEX "categories_name_unique";--> statement-breakpoint
DROP INDEX "idx_payments_created_at";--> statement-breakpoint
DROP INDEX "idx_payments_created_by";--> statement-breakpoint
DROP INDEX "idx_payments_order";--> statement-breakpoint
DROP INDEX "idx_orders_created_by";--> statement-breakpoint
DROP INDEX "idx_orders_status_created";--> statement-breakpoint
DROP INDEX "idx_stock_movements_ingredient_created";--> statement-breakpoint
DROP INDEX "idx_stock_movements_order";--> statement-breakpoint
DROP INDEX "idx_menu_items_active";--> statement-breakpoint
DROP INDEX "idx_menu_items_category";--> statement-breakpoint
DROP INDEX "menu_items_name_unique";--> statement-breakpoint
DROP INDEX "employees_clerk_user_id_unique";--> statement-breakpoint
DROP INDEX "employees_pin_unique";--> statement-breakpoint
DROP INDEX "idx_employees_pin";--> statement-breakpoint
DROP INDEX "idx_refresh_tokens_entity";--> statement-breakpoint
DROP INDEX "idx_refresh_tokens_hash";--> statement-breakpoint
ALTER TABLE "modifier_option_ingredients" ADD CONSTRAINT "modifier_option_ingredients_modifier_option_id_modifier_options_id_fk" FOREIGN KEY ("modifier_option_id") REFERENCES "public"."modifier_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_orders_created_at" ON "orders" USING btree ("created_at" desc);--> statement-breakpoint
CREATE INDEX "idx_moi_ingredient" ON "modifier_option_ingredients" USING btree ("ingredient_id");--> statement-breakpoint
CREATE INDEX "idx_item_recipes_ingredient" ON "item_recipes" USING btree ("ingredient_id");--> statement-breakpoint
CREATE UNIQUE INDEX "terminals_clerk_user_id_unique" ON "terminals" USING btree ("clerk_user_id") WHERE "terminals"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "idx_order_items_order" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_expenses_active_recorded" ON "expenses" USING btree ("recorded_at") WHERE "expenses"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "idx_expenses_category_recorded" ON "expenses" USING btree ("expense_category_id","recorded_at");--> statement-breakpoint
CREATE INDEX "idx_modifier_options_active" ON "modifier_options" USING btree ("modifier_group_id") WHERE "modifier_options"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "idx_modifier_groups_active" ON "modifier_groups" USING btree ("menu_item_id") WHERE "modifier_groups"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "idx_discounts_buy_item" ON "discounts" USING btree ("buy_item_id");--> statement-breakpoint
CREATE INDEX "idx_discounts_deleted" ON "discounts" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "idx_discounts_free_item" ON "discounts" USING btree ("free_item_id");--> statement-breakpoint
CREATE INDEX "idx_discounts_item" ON "discounts" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "idx_oim_order_item" ON "order_item_modifiers" USING btree ("order_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "expense_categories_name_unique" ON "expense_categories" USING btree ("name") WHERE "expense_categories"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_name_unique" ON "categories" USING btree ("name") WHERE "categories"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "idx_payments_created_at" ON "payments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_payments_created_by" ON "payments" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_payments_order" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_orders_created_by" ON "orders" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_orders_status_created" ON "orders" USING btree ("status","created_at" desc);--> statement-breakpoint
CREATE INDEX "idx_stock_movements_ingredient_created" ON "stock_movements" USING btree ("ingredient_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_stock_movements_order" ON "stock_movements" USING btree ("reference_order_id");--> statement-breakpoint
CREATE INDEX "idx_menu_items_active" ON "menu_items" USING btree ("deleted_at") WHERE "menu_items"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "idx_menu_items_category" ON "menu_items" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "menu_items_name_unique" ON "menu_items" USING btree ("name") WHERE "menu_items"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "employees_clerk_user_id_unique" ON "employees" USING btree ("clerk_user_id") WHERE "employees"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "employees_pin_unique" ON "employees" USING btree ("pin") WHERE ("employees"."deleted_at" is null) AND ("employees"."pin" != '');--> statement-breakpoint
CREATE INDEX "idx_employees_pin" ON "employees" USING btree ("pin") WHERE "employees"."is_active" = true;--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_entity" ON "refresh_tokens" USING btree ("entity_id","entity_type");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_hash" ON "refresh_tokens" USING btree ("token_hash") WHERE "refresh_tokens"."revoked" = false;--> statement-breakpoint
ALTER TABLE "modifier_option_ingredients" ADD CONSTRAINT "modifier_option_ingredients_modifier_option_id_ingredient_id_unique" UNIQUE("modifier_option_id","ingredient_id");--> statement-breakpoint
ALTER TABLE "modifier_option_ingredients" ADD CONSTRAINT "chk_moi_quantity_positive" CHECK ("modifier_option_ingredients"."quantity" > 0);--> statement-breakpoint
ALTER TABLE "item_recipes" ADD CONSTRAINT "chk_recipe_quantity_positive" CHECK ("item_recipes"."quantity" > 0);--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "chk_unit_price_positive" CHECK ("order_items"."unit_price" > 0);--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "chk_quantity_positive" CHECK ("order_items"."quantity" > 0);--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "chk_expense_amount_positive" CHECK ("expenses"."amount" > 0);--> statement-breakpoint
ALTER TABLE "discounts" ADD CONSTRAINT "chk_discount_value" CHECK ((
                ("discounts"."type" = 'bogo' AND "discounts"."value" IS NULL) OR
                ("discounts"."type" = 'percentage' AND "discounts"."value" > 0 AND "discounts"."value" <= 100) OR
                ("discounts"."type" = 'fixed_amount' AND "discounts"."value" > 0)
            ));--> statement-breakpoint
ALTER TABLE "discounts" ADD CONSTRAINT "chk_discount_dates" CHECK ((
                "discounts"."ends_at" IS NULL OR
                "discounts"."starts_at" IS NULL OR
                "discounts"."ends_at" > "discounts"."starts_at"
            ));--> statement-breakpoint
ALTER TABLE "discounts" ADD CONSTRAINT "chk_discount_bogo_items" CHECK ((
                "discounts"."type" != 'bogo' OR
                ("discounts"."buy_item_id" IS NOT NULL OR "discounts"."free_item_id" IS NOT NULL)
            ));--> statement-breakpoint
ALTER TABLE "discounts" ADD CONSTRAINT "chk_discount_applies_to" CHECK ((
                ("discounts"."type" = 'bogo' AND "discounts"."applies_to" = 'item') OR
                ("discounts"."type" IN ('percentage', 'fixed_amount'))
            ));--> statement-breakpoint
ALTER TABLE "discounts" ADD CONSTRAINT "chk_discount_item_id" CHECK ((
                ("discounts"."applies_to" = 'order' AND "discounts"."item_id" IS NULL) OR
                ("discounts"."applies_to" = 'item' AND "discounts"."type" = 'bogo' AND "discounts"."item_id" IS NULL) OR
                ("discounts"."applies_to" = 'item' AND "discounts"."type" IN ('percentage', 'fixed_amount') AND "discounts"."item_id" IS NOT NULL)
            ));--> statement-breakpoint
ALTER TABLE "ingredients" ADD CONSTRAINT "chk_stock_non_negative" CHECK ("ingredients"."stock_quantity" >= 0);--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "chk_settings_single_row" CHECK ("settings"."id" = 1);--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "chk_payment_amount_positive" CHECK ("payments"."amount" > 0);--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "chk_cash_fields" CHECK ((
                "payments"."method" != 'cash' OR
                ("payments"."amount_received" IS NOT NULL AND "payments"."change_amount" IS NOT NULL)
            ));--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "chk_subtotal_non_negative" CHECK ("orders"."subtotal" >= 0);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "chk_total_non_negative" CHECK ("orders"."total" >= 0);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "chk_discount_non_negative" CHECK ("orders"."discount_amount" >= 0);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "chk_void_approved_fields" CHECK ((
                ("orders"."void_approved_by" IS NULL AND "orders"."void_approved_at" IS NULL) OR
                ("orders"."void_approved_by" IS NOT NULL AND "orders"."void_approved_at" IS NOT NULL)
            ));--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "chk_base_price_positive" CHECK ("menu_items"."base_price" >= 0);