--
-- PostgreSQL database dump
--

\restrict 5g0c7HLo3AOd5vaXyH22dFbrxl7XcCgIAlr9bThxG0tYcqodsdYeroVegBDh0MS

-- Dumped from database version 18.4 (709c4c3)
-- Dumped by pg_dump version 18.4 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA drizzle;


--
-- Name: dining_option; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.dining_option AS ENUM (
    'dine_in',
    'take_away'
);


--
-- Name: discount_applies_to; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.discount_applies_to AS ENUM (
    'order',
    'item'
);


--
-- Name: discount_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.discount_type AS ENUM (
    'percentage',
    'fixed_amount',
    'bogo'
);


--
-- Name: employee_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.employee_role AS ENUM (
    'barista',
    'manager',
    'owner'
);


--
-- Name: ingredient_unit; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ingredient_unit AS ENUM (
    'g',
    'ml'
);


--
-- Name: order_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.order_status AS ENUM (
    'pending',
    'completed',
    'void_requested',
    'voided'
);


--
-- Name: payment_method; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_method AS ENUM (
    'cash',
    'qr'
);


--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_status AS ENUM (
    'pending',
    'paid',
    'refunded'
);


--
-- Name: selection_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.selection_type AS ENUM (
    'single',
    'multiple'
);


--
-- Name: stock_reason; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stock_reason AS ENUM (
    'order_placed',
    'order_voided',
    'manual_restock',
    'manual_deduction',
    'manual_adjustment'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: -
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: -
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: -
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: discounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    type public.discount_type NOT NULL,
    value numeric(10,2),
    buy_item_id uuid,
    free_item_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    starts_at timestamp with time zone,
    ends_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    applies_to public.discount_applies_to DEFAULT 'order'::public.discount_applies_to NOT NULL,
    item_id uuid,
    max_discount_amount numeric(10,2),
    CONSTRAINT chk_discount_applies_to CHECK ((((type = 'bogo'::public.discount_type) AND (applies_to = 'item'::public.discount_applies_to)) OR (type = ANY (ARRAY['percentage'::public.discount_type, 'fixed_amount'::public.discount_type])))),
    CONSTRAINT chk_discount_bogo_items CHECK (((type <> 'bogo'::public.discount_type) OR ((buy_item_id IS NOT NULL) AND (free_item_id IS NOT NULL)))),
    CONSTRAINT chk_discount_dates CHECK (((ends_at IS NULL) OR (starts_at IS NULL) OR (ends_at > starts_at))),
    CONSTRAINT chk_discount_item_id CHECK ((((applies_to = 'order'::public.discount_applies_to) AND (item_id IS NULL)) OR ((applies_to = 'item'::public.discount_applies_to) AND (type = 'bogo'::public.discount_type) AND (item_id IS NULL)) OR ((applies_to = 'item'::public.discount_applies_to) AND (type = ANY (ARRAY['percentage'::public.discount_type, 'fixed_amount'::public.discount_type])) AND (item_id IS NOT NULL)))),
    CONSTRAINT chk_discount_value CHECK ((((type = 'bogo'::public.discount_type) AND (value IS NULL)) OR ((type = 'percentage'::public.discount_type) AND (value > (0)::numeric) AND (value <= (100)::numeric)) OR ((type = 'fixed_amount'::public.discount_type) AND (value > (0)::numeric))))
);


--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role public.employee_role NOT NULL,
    name text NOT NULL,
    pin text NOT NULL,
    clerk_user_id text,
    is_active boolean DEFAULT true NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: expense_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    description text NOT NULL,
    amount numeric(10,2) NOT NULL,
    category text,
    recorded_by uuid NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT chk_expense_amount_positive CHECK ((amount > (0)::numeric))
);


--
-- Name: ingredients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ingredients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    unit public.ingredient_unit NOT NULL,
    stock_quantity numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    low_stock_threshold numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT chk_stock_non_negative CHECK ((stock_quantity >= (0)::numeric))
);


--
-- Name: item_recipes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_recipes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_id uuid NOT NULL,
    ingredient_id uuid NOT NULL,
    quantity numeric(10,2) NOT NULL,
    CONSTRAINT chk_recipe_quantity_positive CHECK ((quantity > (0)::numeric))
);


--
-- Name: menu_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menu_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id uuid NOT NULL,
    name text NOT NULL,
    base_price numeric(10,2) NOT NULL,
    is_available boolean DEFAULT true NOT NULL,
    image_url text,
    image_path text,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_base_price_positive CHECK ((base_price >= (0)::numeric))
);


--
-- Name: modifier_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.modifier_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    menu_item_id uuid,
    name text NOT NULL,
    selection_type public.selection_type NOT NULL,
    is_required boolean DEFAULT false NOT NULL,
    default_option_id uuid,
    sort_order integer DEFAULT 0 NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: modifier_option_ingredients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.modifier_option_ingredients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    modifier_option_id uuid NOT NULL,
    ingredient_id uuid NOT NULL,
    quantity numeric(10,2) NOT NULL,
    CONSTRAINT chk_moi_quantity_positive CHECK ((quantity > (0)::numeric))
);


--
-- Name: modifier_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.modifier_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    modifier_group_id uuid NOT NULL,
    name text NOT NULL,
    price numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    is_available boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: order_item_modifiers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_item_modifiers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_item_id uuid NOT NULL,
    modifier_option_id uuid NOT NULL,
    price numeric(10,2) DEFAULT '0'::numeric NOT NULL
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    menu_item_id uuid NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_quantity_positive CHECK ((quantity > 0)),
    CONSTRAINT chk_unit_price_positive CHECK ((unit_price > (0)::numeric))
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_number integer NOT NULL,
    receipt_number integer NOT NULL,
    status public.order_status DEFAULT 'pending'::public.order_status NOT NULL,
    dining_option public.dining_option NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    discount_id uuid,
    discount_amount numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    total numeric(10,2) NOT NULL,
    payment_status public.payment_status DEFAULT 'pending'::public.payment_status NOT NULL,
    created_by uuid NOT NULL,
    confirmed_by uuid NOT NULL,
    void_requested_by uuid,
    void_requested_at timestamp with time zone,
    void_approved_by uuid,
    void_approved_at timestamp with time zone,
    void_rejected_at timestamp with time zone,
    void_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_discount_non_negative CHECK ((discount_amount >= (0)::numeric)),
    CONSTRAINT chk_subtotal_non_negative CHECK ((subtotal >= (0)::numeric)),
    CONSTRAINT chk_total_non_negative CHECK ((total >= (0)::numeric)),
    CONSTRAINT chk_void_approved_fields CHECK ((((void_approved_by IS NULL) AND (void_approved_at IS NULL)) OR ((void_approved_by IS NOT NULL) AND (void_approved_at IS NOT NULL))))
);


--
-- Name: orders_order_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.orders_order_number_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orders_order_number_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.orders_order_number_seq OWNED BY public.orders.order_number;


--
-- Name: orders_receipt_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.orders_receipt_number_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orders_receipt_number_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.orders_receipt_number_seq OWNED BY public.orders.receipt_number;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    method public.payment_method NOT NULL,
    amount numeric(10,2) NOT NULL,
    amount_received numeric(10,2),
    change_amount numeric(10,2),
    status public.payment_status DEFAULT 'pending'::public.payment_status NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_cash_fields CHECK (((method <> 'cash'::public.payment_method) OR ((amount_received IS NOT NULL) AND (change_amount IS NOT NULL)))),
    CONSTRAINT chk_payment_amount_positive CHECK ((amount > (0)::numeric))
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    id integer DEFAULT 1 NOT NULL,
    store_name text DEFAULT 'My Cafe'::text NOT NULL,
    store_address text,
    currency_symbol text DEFAULT '$'::text NOT NULL,
    receipt_header text,
    receipt_footer text,
    tax_label text DEFAULT 'Tax included'::text NOT NULL,
    logo_url text,
    qr_code_url text,
    khr_rate integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_settings_single_row CHECK ((id = 1))
);


--
-- Name: stock_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ingredient_id uuid NOT NULL,
    quantity_change numeric(10,2) NOT NULL,
    reason public.stock_reason NOT NULL,
    reference_order_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Name: orders order_number; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders ALTER COLUMN order_number SET DEFAULT nextval('public.orders_order_number_seq'::regclass);


--
-- Name: orders receipt_number; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders ALTER COLUMN receipt_number SET DEFAULT nextval('public.orders_receipt_number_seq'::regclass);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: discounts discounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discounts
    ADD CONSTRAINT discounts_pkey PRIMARY KEY (id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: expense_categories expense_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: ingredients ingredients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredients
    ADD CONSTRAINT ingredients_pkey PRIMARY KEY (id);


--
-- Name: item_recipes item_recipes_item_id_ingredient_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_recipes
    ADD CONSTRAINT item_recipes_item_id_ingredient_id_unique UNIQUE (item_id, ingredient_id);


--
-- Name: item_recipes item_recipes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_recipes
    ADD CONSTRAINT item_recipes_pkey PRIMARY KEY (id);


--
-- Name: menu_items menu_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_pkey PRIMARY KEY (id);


--
-- Name: modifier_groups modifier_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modifier_groups
    ADD CONSTRAINT modifier_groups_pkey PRIMARY KEY (id);


--
-- Name: modifier_option_ingredients modifier_option_ingredients_modifier_option_id_ingredient_id_un; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modifier_option_ingredients
    ADD CONSTRAINT modifier_option_ingredients_modifier_option_id_ingredient_id_un UNIQUE (modifier_option_id, ingredient_id);


--
-- Name: modifier_option_ingredients modifier_option_ingredients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modifier_option_ingredients
    ADD CONSTRAINT modifier_option_ingredients_pkey PRIMARY KEY (id);


--
-- Name: modifier_options modifier_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modifier_options
    ADD CONSTRAINT modifier_options_pkey PRIMARY KEY (id);


--
-- Name: order_item_modifiers order_item_modifiers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_item_modifiers
    ADD CONSTRAINT order_item_modifiers_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_unique UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: orders orders_receipt_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_receipt_number_unique UNIQUE (receipt_number);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_hash_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_hash_unique UNIQUE (token_hash);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: stock_movements stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);


--
-- Name: categories_name_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX categories_name_unique ON public.categories USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: employees_clerk_user_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX employees_clerk_user_id_unique ON public.employees USING btree (clerk_user_id) WHERE (deleted_at IS NULL);


--
-- Name: employees_pin_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX employees_pin_unique ON public.employees USING btree (pin) WHERE (deleted_at IS NULL);


--
-- Name: expense_categories_name_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX expense_categories_name_unique ON public.expense_categories USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: idx_discounts_buy_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discounts_buy_item ON public.discounts USING btree (buy_item_id);


--
-- Name: idx_discounts_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discounts_deleted ON public.discounts USING btree (deleted_at);


--
-- Name: idx_discounts_free_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discounts_free_item ON public.discounts USING btree (free_item_id);


--
-- Name: idx_discounts_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discounts_item ON public.discounts USING btree (item_id);


--
-- Name: idx_employees_pin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_pin ON public.employees USING btree (pin) WHERE (is_active = true);


--
-- Name: idx_expenses_active_recorded; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_active_recorded ON public.expenses USING btree (recorded_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_expenses_category_recorded; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_category_recorded ON public.expenses USING btree (category, recorded_at);


--
-- Name: idx_item_recipes_ingredient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_recipes_ingredient ON public.item_recipes USING btree (ingredient_id);


--
-- Name: idx_menu_items_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_items_active ON public.menu_items USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_menu_items_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_items_category ON public.menu_items USING btree (category_id);


--
-- Name: idx_modifier_groups_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_modifier_groups_active ON public.modifier_groups USING btree (menu_item_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_modifier_options_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_modifier_options_active ON public.modifier_options USING btree (modifier_group_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_moi_ingredient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moi_ingredient ON public.modifier_option_ingredients USING btree (ingredient_id);


--
-- Name: idx_oim_order_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oim_order_item ON public.order_item_modifiers USING btree (order_item_id);


--
-- Name: idx_order_items_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_order ON public.order_items USING btree (order_id);


--
-- Name: idx_orders_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_created_by ON public.orders USING btree (created_by);


--
-- Name: idx_orders_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_status_created ON public.orders USING btree (status, created_at);


--
-- Name: idx_payments_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_created_at ON public.payments USING btree (created_at);


--
-- Name: idx_payments_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_created_by ON public.payments USING btree (created_by);


--
-- Name: idx_payments_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_order ON public.payments USING btree (order_id);


--
-- Name: idx_refresh_tokens_employee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refresh_tokens_employee ON public.refresh_tokens USING btree (employee_id);


--
-- Name: idx_refresh_tokens_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refresh_tokens_hash ON public.refresh_tokens USING btree (token_hash) WHERE (revoked = false);


--
-- Name: idx_stock_movements_ingredient_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_movements_ingredient_created ON public.stock_movements USING btree (ingredient_id, created_at);


--
-- Name: idx_stock_movements_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_movements_order ON public.stock_movements USING btree (reference_order_id);


--
-- Name: menu_items_name_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX menu_items_name_unique ON public.menu_items USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: discounts discounts_buy_item_id_menu_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discounts
    ADD CONSTRAINT discounts_buy_item_id_menu_items_id_fk FOREIGN KEY (buy_item_id) REFERENCES public.menu_items(id);


--
-- Name: discounts discounts_free_item_id_menu_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discounts
    ADD CONSTRAINT discounts_free_item_id_menu_items_id_fk FOREIGN KEY (free_item_id) REFERENCES public.menu_items(id);


--
-- Name: discounts discounts_item_id_menu_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discounts
    ADD CONSTRAINT discounts_item_id_menu_items_id_fk FOREIGN KEY (item_id) REFERENCES public.menu_items(id);


--
-- Name: expenses expenses_recorded_by_employees_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_recorded_by_employees_id_fk FOREIGN KEY (recorded_by) REFERENCES public.employees(id);


--
-- Name: item_recipes item_recipes_ingredient_id_ingredients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_recipes
    ADD CONSTRAINT item_recipes_ingredient_id_ingredients_id_fk FOREIGN KEY (ingredient_id) REFERENCES public.ingredients(id);


--
-- Name: item_recipes item_recipes_item_id_menu_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_recipes
    ADD CONSTRAINT item_recipes_item_id_menu_items_id_fk FOREIGN KEY (item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: menu_items menu_items_category_id_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_category_id_categories_id_fk FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: modifier_groups modifier_groups_menu_item_id_menu_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modifier_groups
    ADD CONSTRAINT modifier_groups_menu_item_id_menu_items_id_fk FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: modifier_option_ingredients modifier_option_ingredients_ingredient_id_ingredients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modifier_option_ingredients
    ADD CONSTRAINT modifier_option_ingredients_ingredient_id_ingredients_id_fk FOREIGN KEY (ingredient_id) REFERENCES public.ingredients(id);


--
-- Name: modifier_option_ingredients modifier_option_ingredients_modifier_option_id_modifier_options; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modifier_option_ingredients
    ADD CONSTRAINT modifier_option_ingredients_modifier_option_id_modifier_options FOREIGN KEY (modifier_option_id) REFERENCES public.modifier_options(id) ON DELETE CASCADE;


--
-- Name: modifier_options modifier_options_modifier_group_id_modifier_groups_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modifier_options
    ADD CONSTRAINT modifier_options_modifier_group_id_modifier_groups_id_fk FOREIGN KEY (modifier_group_id) REFERENCES public.modifier_groups(id) ON DELETE CASCADE;


--
-- Name: order_item_modifiers order_item_modifiers_modifier_option_id_modifier_options_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_item_modifiers
    ADD CONSTRAINT order_item_modifiers_modifier_option_id_modifier_options_id_fk FOREIGN KEY (modifier_option_id) REFERENCES public.modifier_options(id);


--
-- Name: order_item_modifiers order_item_modifiers_order_item_id_order_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_item_modifiers
    ADD CONSTRAINT order_item_modifiers_order_item_id_order_items_id_fk FOREIGN KEY (order_item_id) REFERENCES public.order_items(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_menu_item_id_menu_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_menu_item_id_menu_items_id_fk FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id);


--
-- Name: order_items order_items_order_id_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: orders orders_confirmed_by_employees_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_confirmed_by_employees_id_fk FOREIGN KEY (confirmed_by) REFERENCES public.employees(id);


--
-- Name: orders orders_created_by_employees_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_created_by_employees_id_fk FOREIGN KEY (created_by) REFERENCES public.employees(id);


--
-- Name: orders orders_discount_id_discounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_discount_id_discounts_id_fk FOREIGN KEY (discount_id) REFERENCES public.discounts(id);


--
-- Name: orders orders_void_approved_by_employees_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_void_approved_by_employees_id_fk FOREIGN KEY (void_approved_by) REFERENCES public.employees(id);


--
-- Name: orders orders_void_requested_by_employees_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_void_requested_by_employees_id_fk FOREIGN KEY (void_requested_by) REFERENCES public.employees(id);


--
-- Name: payments payments_created_by_employees_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_created_by_employees_id_fk FOREIGN KEY (created_by) REFERENCES public.employees(id);


--
-- Name: payments payments_order_id_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_employee_id_employees_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_employee_id_employees_id_fk FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: stock_movements stock_movements_ingredient_id_ingredients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_ingredient_id_ingredients_id_fk FOREIGN KEY (ingredient_id) REFERENCES public.ingredients(id);


--
-- Name: stock_movements stock_movements_reference_order_id_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_reference_order_id_orders_id_fk FOREIGN KEY (reference_order_id) REFERENCES public.orders(id);


--
-- PostgreSQL database dump complete
--

\unrestrict 5g0c7HLo3AOd5vaXyH22dFbrxl7XcCgIAlr9bThxG0tYcqodsdYeroVegBDh0MS

