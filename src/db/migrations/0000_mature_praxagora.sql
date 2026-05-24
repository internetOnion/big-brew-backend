CREATE TYPE "public"."dining_option" AS ENUM('dine_in', 'take_away');--> statement-breakpoint
CREATE TYPE "public"."discount_type" AS ENUM('percentage', 'fixed_amount', 'bogo');--> statement-breakpoint
CREATE TYPE "public"."employee_role" AS ENUM('barista', 'manager', 'owner');--> statement-breakpoint
CREATE TYPE "public"."ingredient_unit" AS ENUM('g', 'ml');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled', 'void_pending', 'voided');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'card', 'qr');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."selection_type" AS ENUM('single', 'multiple');--> statement-breakpoint
CREATE TYPE "public"."stock_reason" AS ENUM('order_placed', 'order_voided', 'manual_restock', 'manual_deduction', 'manual_adjustment');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name"),
	CONSTRAINT "categories_sort_order_unique" UNIQUE("sort_order")
);
--> statement-breakpoint
CREATE TABLE "discounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "discount_type" NOT NULL,
	"value" numeric(10, 2),
	"buy_item_id" uuid,
	"free_item_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_discount_value" CHECK ((
                ("discounts"."type" = 'bogo' AND "discounts"."value" IS NULL) OR
                ("discounts"."type" = 'percentage' AND "discounts"."value" > 0 AND "discounts"."value" <= 100) OR
                ("discounts"."type" = 'fixed_amount' AND "discounts"."value" > 0)
            )),
	CONSTRAINT "chk_discount_dates" CHECK ((
                "discounts"."ends_at" IS NULL OR
                "discounts"."starts_at" IS NULL OR
                "discounts"."ends_at" > "discounts"."starts_at"
            ))
);
--> statement-breakpoint
CREATE TABLE "employee_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"can_sell" boolean DEFAULT true NOT NULL,
	"can_apply_discount" boolean DEFAULT true NOT NULL,
	"can_void_request" boolean DEFAULT true NOT NULL,
	"can_void_approve" boolean DEFAULT false NOT NULL,
	"can_manage_menu" boolean DEFAULT false NOT NULL,
	"can_manage_inventory" boolean DEFAULT false NOT NULL,
	"can_view_reports" boolean DEFAULT false NOT NULL,
	"can_open_register" boolean DEFAULT true NOT NULL,
	"can_adjust_stock" boolean DEFAULT false NOT NULL,
	"can_manage_employees" boolean DEFAULT false NOT NULL,
	"max_discount_percent" integer DEFAULT 10 NOT NULL,
	"max_discount_amount" numeric(10, 2) DEFAULT '5.00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employee_permissions_employee_id_unique" UNIQUE("employee_id")
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" "employee_role" NOT NULL,
	"name" text NOT NULL,
	"pin" text NOT NULL,
	"supabase_uid" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employees_supabase_uid_unique" UNIQUE("supabase_uid")
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"category" text,
	"recorded_by" uuid NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_expense_amount_positive" CHECK ("expenses"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "ingredients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"unit" "ingredient_unit" NOT NULL,
	"stock_quantity" numeric(10, 2) DEFAULT '0' NOT NULL,
	"low_stock_threshold" numeric(10, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_stock_non_negative" CHECK ("ingredients"."stock_quantity" >= 0)
);
--> statement-breakpoint
CREATE TABLE "item_recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	CONSTRAINT "item_recipes_item_id_ingredient_id_unique" UNIQUE("item_id","ingredient_id"),
	CONSTRAINT "chk_recipe_quantity_positive" CHECK ("item_recipes"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "menu_item_modifier_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"menu_item_id" uuid NOT NULL,
	"modifier_group_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "menu_item_modifier_groups_menu_item_id_modifier_group_id_unique" UNIQUE("menu_item_id","modifier_group_id")
);
--> statement-breakpoint
CREATE TABLE "menu_item_modifier_option_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"menu_item_id" uuid NOT NULL,
	"modifier_option_id" uuid NOT NULL,
	"price_override" numeric(10, 2),
	"is_available" boolean,
	CONSTRAINT "menu_item_modifier_option_overrides_menu_item_id_modifier_option_id_unique" UNIQUE("menu_item_id","modifier_option_id")
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"name" text NOT NULL,
	"base_price" numeric(10, 2) NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"image_url" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "menu_items_name_unique" UNIQUE("name"),
	CONSTRAINT "chk_base_price_positive" CHECK ("menu_items"."base_price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "modifier_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"selection_type" "selection_type" NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"default_option_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modifier_option_ingredients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"modifier_option_id" uuid NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	CONSTRAINT "modifier_option_ingredients_item_id_modifier_option_id_ingredient_id_unique" UNIQUE("item_id","modifier_option_id","ingredient_id"),
	CONSTRAINT "chk_moi_quantity_positive" CHECK ("modifier_option_ingredients"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "modifier_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"modifier_group_id" uuid NOT NULL,
	"name" text NOT NULL,
	"price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_item_modifiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_item_id" uuid NOT NULL,
	"modifier_option_id" uuid NOT NULL,
	"price" numeric(10, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"menu_item_id" uuid NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_unit_price_positive" CHECK ("order_items"."unit_price" > 0),
	CONSTRAINT "chk_quantity_positive" CHECK ("order_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" serial NOT NULL,
	"receipt_number" serial NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"dining_option" "dining_option" NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"discount_id" uuid,
	"discount_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"payment_method" "payment_method",
	"payment_status" "payment_status" DEFAULT 'pending' NOT NULL,
	"amount_received" numeric(10, 2),
	"change_amount" numeric(10, 2),
	"created_by" uuid NOT NULL,
	"void_requested_by" uuid,
	"void_requested_at" timestamp with time zone,
	"void_approved_by" uuid,
	"void_approved_at" timestamp with time zone,
	"void_rejected_at" timestamp with time zone,
	"void_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number"),
	CONSTRAINT "orders_receipt_number_unique" UNIQUE("receipt_number"),
	CONSTRAINT "chk_subtotal_non_negative" CHECK ("orders"."subtotal" >= 0),
	CONSTRAINT "chk_total_non_negative" CHECK ("orders"."total" >= 0),
	CONSTRAINT "chk_discount_non_negative" CHECK ("orders"."discount_amount" >= 0),
	CONSTRAINT "chk_cash_fields" CHECK ((
                "orders"."payment_method" IS NULL OR
                "orders"."payment_method" != 'cash' OR
                ("orders"."amount_received" IS NOT NULL AND "orders"."change_amount" IS NOT NULL)
            )),
	CONSTRAINT "chk_void_approved_fields" CHECK ((
                ("orders"."void_approved_by" IS NULL AND "orders"."void_approved_at" IS NULL) OR
                ("orders"."void_approved_by" IS NOT NULL AND "orders"."void_approved_at" IS NOT NULL)
            ))
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"store_name" text DEFAULT 'My Cafe' NOT NULL,
	"store_address" text,
	"currency_symbol" text DEFAULT '$' NOT NULL,
	"receipt_header" text,
	"receipt_footer" text,
	"tax_label" text DEFAULT 'Tax included' NOT NULL,
	"logo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_settings_single_row" CHECK ("settings"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"quantity_change" numeric(10, 2) NOT NULL,
	"reason" "stock_reason" NOT NULL,
	"reference_order_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_buy_item_id_menu_items_id_fk" FOREIGN KEY ("buy_item_id") REFERENCES "public"."menu_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_free_item_id_menu_items_id_fk" FOREIGN KEY ("free_item_id") REFERENCES "public"."menu_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_permissions" ADD CONSTRAINT "employee_permissions_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_recorded_by_employees_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_recipes" ADD CONSTRAINT "item_recipes_item_id_menu_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_recipes" ADD CONSTRAINT "item_recipes_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_modifier_groups" ADD CONSTRAINT "menu_item_modifier_groups_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_modifier_groups" ADD CONSTRAINT "menu_item_modifier_groups_modifier_group_id_modifier_groups_id_fk" FOREIGN KEY ("modifier_group_id") REFERENCES "public"."modifier_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_modifier_option_overrides" ADD CONSTRAINT "menu_item_modifier_option_overrides_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_modifier_option_overrides" ADD CONSTRAINT "menu_item_modifier_option_overrides_modifier_option_id_modifier_options_id_fk" FOREIGN KEY ("modifier_option_id") REFERENCES "public"."modifier_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modifier_option_ingredients" ADD CONSTRAINT "modifier_option_ingredients_item_id_menu_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modifier_option_ingredients" ADD CONSTRAINT "modifier_option_ingredients_modifier_option_id_modifier_options_id_fk" FOREIGN KEY ("modifier_option_id") REFERENCES "public"."modifier_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modifier_option_ingredients" ADD CONSTRAINT "modifier_option_ingredients_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modifier_options" ADD CONSTRAINT "modifier_options_modifier_group_id_modifier_groups_id_fk" FOREIGN KEY ("modifier_group_id") REFERENCES "public"."modifier_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_modifiers" ADD CONSTRAINT "order_item_modifiers_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_modifiers" ADD CONSTRAINT "order_item_modifiers_modifier_option_id_modifier_options_id_fk" FOREIGN KEY ("modifier_option_id") REFERENCES "public"."modifier_options"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_discount_id_discounts_id_fk" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_employees_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_void_requested_by_employees_id_fk" FOREIGN KEY ("void_requested_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_void_approved_by_employees_id_fk" FOREIGN KEY ("void_approved_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_reference_order_id_orders_id_fk" FOREIGN KEY ("reference_order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_discounts_buy_item" ON "discounts" USING btree ("buy_item_id");--> statement-breakpoint
CREATE INDEX "idx_discounts_free_item" ON "discounts" USING btree ("free_item_id");--> statement-breakpoint
CREATE INDEX "idx_employees_pin" ON "employees" USING btree ("pin") WHERE "employees"."is_active" = true;--> statement-breakpoint
CREATE INDEX "idx_expenses_recorded_at" ON "expenses" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "idx_expenses_category" ON "expenses" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_item_recipes_item" ON "item_recipes" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "idx_item_recipes_ingredient" ON "item_recipes" USING btree ("ingredient_id");--> statement-breakpoint
CREATE INDEX "idx_mimoo_item_option" ON "menu_item_modifier_option_overrides" USING btree ("menu_item_id","modifier_option_id");--> statement-breakpoint
CREATE INDEX "idx_menu_items_category" ON "menu_items" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_menu_items_deleted" ON "menu_items" USING btree ("deleted_at") WHERE "menu_items"."deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_moi_item_option" ON "modifier_option_ingredients" USING btree ("item_id","modifier_option_id");--> statement-breakpoint
CREATE INDEX "idx_moi_ingredient" ON "modifier_option_ingredients" USING btree ("ingredient_id");--> statement-breakpoint
CREATE INDEX "idx_modifier_options_group" ON "modifier_options" USING btree ("modifier_group_id");--> statement-breakpoint
CREATE INDEX "idx_oim_order_item" ON "order_item_modifiers" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "idx_order_items_order" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_orders_status" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_orders_created_at" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_orders_payment_method" ON "orders" USING btree ("payment_method");--> statement-breakpoint
CREATE INDEX "idx_orders_order_number" ON "orders" USING btree ("order_number");--> statement-breakpoint
CREATE INDEX "idx_orders_created_by" ON "orders" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_stock_movements_ingredient" ON "stock_movements" USING btree ("ingredient_id");--> statement-breakpoint
CREATE INDEX "idx_stock_movements_created" ON "stock_movements" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_stock_movements_order" ON "stock_movements" USING btree ("reference_order_id");