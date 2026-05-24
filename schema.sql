-- ============================================================
-- Cafe POS — PostgreSQL Schema
-- ============================================================

-- create database cafe_db;

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE employee_role AS ENUM ('barista', 'manager', 'owner');

CREATE TYPE ingredient_unit AS ENUM ('g', 'ml');

CREATE TYPE discount_type AS ENUM ('percentage', 'fixed_amount', 'bogo');

CREATE TYPE order_status AS ENUM (
    'pending',
    'confirmed',
    'preparing',
    'ready',
    'delivered',
    'cancelled',
    'void_pending',
    'voided'
);

CREATE TYPE dining_option AS ENUM ('dine_in', 'take_away');

CREATE TYPE payment_method AS ENUM ('cash', 'card', 'qr');

CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'refunded');

CREATE TYPE stock_reason AS ENUM (
    'order_placed',
    'order_voided',
    'manual_restock',
    'manual_deduction',
    'manual_adjustment'
);

CREATE TYPE selection_type AS ENUM ('single', 'multiple');

-- ============================================================
-- EMPLOYEES
-- ============================================================
CREATE TABLE employees (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role         employee_role NOT NULL,
    name         TEXT NOT NULL,
    pin          TEXT NOT NULL,
    supabase_uid UUID UNIQUE,
    is_active    BOOLEAN NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_employees_pin ON employees (pin) WHERE is_active = true;

COMMENT ON TABLE employees IS 'Each employee has their own hashed PIN for POS terminal login. supabase_uid links to Supabase Auth for web dashboard login (managers/owners only).';

-- ============================================================
-- EMPLOYEE PERMISSIONS  (1:1 with employees)
-- ============================================================
CREATE TABLE employee_permissions (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id           UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE UNIQUE,
    can_sell              BOOLEAN NOT NULL DEFAULT true,
    can_apply_discount    BOOLEAN NOT NULL DEFAULT true,
    can_void_request      BOOLEAN NOT NULL DEFAULT true,
    can_void_approve      BOOLEAN NOT NULL DEFAULT false,
    can_manage_menu       BOOLEAN NOT NULL DEFAULT false,
    can_manage_inventory  BOOLEAN NOT NULL DEFAULT false,
    can_view_reports      BOOLEAN NOT NULL DEFAULT false,
    can_open_register     BOOLEAN NOT NULL DEFAULT true,
    can_adjust_stock      BOOLEAN NOT NULL DEFAULT false,
    can_manage_employees  BOOLEAN NOT NULL DEFAULT false,
    max_discount_percent  INT NOT NULL DEFAULT 10,
    max_discount_amount   DECIMAL(10,2) NOT NULL DEFAULT 5.00,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE employee_permissions IS 'Granular authorization flags. Auto-populated from role defaults on employee creation. Manager override required when a barista exceeds max_discount_percent OR max_discount_amount.';

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE categories (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL UNIQUE,
    color      TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MENU ITEMS
-- ============================================================
CREATE TABLE menu_items (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id  UUID NOT NULL REFERENCES categories(id),
    name         TEXT NOT NULL UNIQUE,
    base_price   DECIMAL(10,2) NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT true,
    image_url    TEXT,
    deleted_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_base_price_positive CHECK (base_price >= 0)
);

CREATE INDEX idx_menu_items_category ON menu_items (category_id);
CREATE INDEX idx_menu_items_name_search ON menu_items USING gin (name gin_trgm_ops);
CREATE INDEX idx_menu_items_deleted ON menu_items (deleted_at) WHERE deleted_at IS NOT NULL;

COMMENT ON TABLE menu_items IS 'Every item has a base_price. Modifier options add to this price. deleted_at enables soft-delete without breaking order history.';

-- ============================================================
-- MODIFIER GROUPS  (owner-defined customization categories)
-- ============================================================
CREATE TABLE modifier_groups (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              TEXT NOT NULL,
    selection_type    selection_type NOT NULL,
    is_required       BOOLEAN NOT NULL DEFAULT false,
    default_option_id UUID,
    sort_order        INT NOT NULL DEFAULT 0,
    deleted_at        TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE modifier_groups IS 'default_option_id pre-selects an option so baristas can skip tapping through common defaults (e.g., 0% sugar). deletion is soft via deleted_at.';

-- ============================================================
-- MODIFIER OPTIONS  (choices within each group)
-- ============================================================
CREATE TABLE modifier_options (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    modifier_group_id UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
    name              TEXT NOT NULL,
    price             DECIMAL(10,2) NOT NULL DEFAULT 0,
    is_available      BOOLEAN NOT NULL DEFAULT true,
    sort_order        INT NOT NULL DEFAULT 0,
    deleted_at        TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_modifier_options_group ON modifier_options (modifier_group_id);

COMMENT ON TABLE modifier_options IS 'deleted_at enables soft-delete. FK references from order_item_modifiers keep historical orders intact.';

-- Set up the deferred FK from modifier_groups.default_option_id to modifier_options
ALTER TABLE modifier_groups
    ADD CONSTRAINT fk_default_option
    FOREIGN KEY (default_option_id) REFERENCES modifier_options(id)
    DEFERRABLE INITIALLY DEFERRED;

-- ============================================================
-- MENU ITEM ↔ MODIFIER GROUP  (many-to-many)
-- ============================================================
CREATE TABLE menu_item_modifier_groups (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id      UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    modifier_group_id UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
    sort_order        INT NOT NULL DEFAULT 0,
    UNIQUE (menu_item_id, modifier_group_id)
);

COMMENT ON TABLE menu_item_modifier_groups IS 'Links items to customization groups. An item with no rows here has no customization options.';

-- ============================================================
-- INGREDIENTS
-- ============================================================
CREATE TABLE ingredients (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT NOT NULL,
    unit                ingredient_unit NOT NULL,
    stock_quantity      DECIMAL(10,2) NOT NULL DEFAULT 0,
    low_stock_threshold DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_stock_non_negative CHECK (stock_quantity >= 0)
);

-- ============================================================
-- BASE RECIPES  (item → ingredient consumption, independent of modifiers)
-- ============================================================
CREATE TABLE item_recipes (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id       UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id),
    quantity      DECIMAL(10,2) NOT NULL,
    UNIQUE (item_id, ingredient_id),
    CONSTRAINT chk_recipe_quantity_positive CHECK (quantity > 0)
);

CREATE INDEX idx_item_recipes_item ON item_recipes (item_id);
CREATE INDEX idx_item_recipes_ingredient ON item_recipes (ingredient_id);

COMMENT ON TABLE item_recipes IS 'Base ingredient consumption for an item. For items whose ingredients are entirely determined by modifier options, this table may have no rows.';

-- ============================================================
-- MODIFIER OPTION INGREDIENT CONSUMPTION
-- ============================================================
CREATE TABLE modifier_option_ingredients (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id            UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    modifier_option_id UUID NOT NULL REFERENCES modifier_options(id) ON DELETE CASCADE,
    ingredient_id      UUID NOT NULL REFERENCES ingredients(id),
    quantity           DECIMAL(10,2) NOT NULL,
    UNIQUE (item_id, modifier_option_id, ingredient_id),
    CONSTRAINT chk_moi_quantity_positive CHECK (quantity > 0)
);

CREATE INDEX idx_moi_item_option ON modifier_option_ingredients (item_id, modifier_option_id);
CREATE INDEX idx_moi_ingredient ON modifier_option_ingredients (ingredient_id);

COMMENT ON TABLE modifier_option_ingredients IS 'Scoped to (item, option, ingredient). Example: (Latte, Large, Coffee Beans) = 18g. A different item using the same "Large" modifier option can consume different quantities.';

-- ============================================================
-- MENU ITEM ↔ MODIFIER OPTION OVERRIDES  (per-item option pricing & availability)
-- ============================================================
CREATE TABLE menu_item_modifier_option_overrides (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id       UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    modifier_option_id UUID NOT NULL REFERENCES modifier_options(id) ON DELETE CASCADE,
    price_override     DECIMAL(10,2),
    is_available       BOOLEAN,
    UNIQUE (menu_item_id, modifier_option_id)
);

CREATE INDEX idx_mimoo_item_option ON menu_item_modifier_option_overrides (menu_item_id, modifier_option_id);

COMMENT ON TABLE menu_item_modifier_option_overrides IS 'Per-item overrides for shared modifier options. NULL columns = fall through to modifier_options defaults. Example: Large = +$1.00 default, but Matcha Large override to +$0.50. Or hide Medium entirely for Matcha via is_available=false.';

-- ============================================================
-- DISCOUNTS
-- ============================================================
CREATE TABLE discounts (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         TEXT NOT NULL,
    type         discount_type NOT NULL,
    value        DECIMAL(10,2),
    buy_item_id  UUID REFERENCES menu_items(id),
    free_item_id UUID REFERENCES menu_items(id),
    is_active    BOOLEAN NOT NULL DEFAULT true,
    starts_at    TIMESTAMPTZ,
    ends_at      TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_discount_value CHECK (
        (type = 'bogo' AND value IS NULL) OR
        (type = 'percentage' AND value > 0 AND value <= 100) OR
        (type = 'fixed_amount' AND value > 0)
    ),
    CONSTRAINT chk_discount_dates CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

CREATE INDEX idx_discounts_buy_item ON discounts (buy_item_id);
CREATE INDEX idx_discounts_free_item ON discounts (free_item_id);

COMMENT ON TABLE discounts IS 'buy_item_id scopes which item must be purchased (NULL = any). free_item_id scopes which item becomes free for bogo (NULL = cheapest in order). Both also work for percentage/fixed_amount to restrict discount to a specific item.';

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE orders (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number       SERIAL UNIQUE,
    receipt_number     SERIAL UNIQUE,
    status             order_status NOT NULL DEFAULT 'pending',
    dining_option      dining_option NOT NULL,
    subtotal           DECIMAL(10,2) NOT NULL,
    discount_id        UUID REFERENCES discounts(id),
    discount_amount    DECIMAL(10,2) NOT NULL DEFAULT 0,
    total              DECIMAL(10,2) NOT NULL,
    payment_method     payment_method,
    payment_status     payment_status NOT NULL DEFAULT 'pending',
    amount_received    DECIMAL(10,2),
    change_amount      DECIMAL(10,2),
    created_by         UUID NOT NULL REFERENCES employees(id),
    void_requested_by  UUID REFERENCES employees(id),
    void_requested_at  TIMESTAMPTZ,
    void_approved_by   UUID REFERENCES employees(id),
    void_approved_at   TIMESTAMPTZ,
    void_rejected_at   TIMESTAMPTZ,
    void_reason        TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_subtotal_non_negative CHECK (subtotal >= 0),
    CONSTRAINT chk_total_non_negative CHECK (total >= 0),
    CONSTRAINT chk_discount_non_negative CHECK (discount_amount >= 0),
    CONSTRAINT chk_cash_fields CHECK (
        payment_method IS NULL OR payment_method != 'cash' OR
        (amount_received IS NOT NULL AND change_amount IS NOT NULL)
    ),
    CONSTRAINT chk_void_approved_fields CHECK (
        (void_approved_by IS NULL AND void_approved_at IS NULL) OR
        (void_approved_by IS NOT NULL AND void_approved_at IS NOT NULL)
    )
);

CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_created_at ON orders (created_at);
CREATE INDEX idx_orders_payment_method ON orders (payment_method);
CREATE INDEX idx_orders_order_number ON orders (order_number);
CREATE INDEX idx_orders_created_by ON orders (created_by);

COMMENT ON TABLE orders IS 'order_number and receipt_number use SERIAL. created_by tracks who rang up the order. pending→cancelled does not require manager approval (no payment taken).';

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE TABLE order_items (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES menu_items(id),
    unit_price   DECIMAL(10,2) NOT NULL,
    quantity     INT NOT NULL DEFAULT 1,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_unit_price_positive CHECK (unit_price > 0),
    CONSTRAINT chk_quantity_positive CHECK (quantity > 0)
);

CREATE INDEX idx_order_items_order ON order_items (order_id);

COMMENT ON TABLE order_items IS 'unit_price is a snapshot of the menu item base_price at order time. Selected modifier options and their prices are stored in order_item_modifiers.';

-- ============================================================
-- ORDER ITEM MODIFIERS  (selected modifier options, snapshot)
-- ============================================================
CREATE TABLE order_item_modifiers (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id      UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    modifier_option_id UUID NOT NULL REFERENCES modifier_options(id),
    price              DECIMAL(10,2) NOT NULL DEFAULT 0
);

CREATE INDEX idx_oim_order_item ON order_item_modifiers (order_item_id);

COMMENT ON TABLE order_item_modifiers IS 'Each row captures a selected modifier option for an order item. price is a snapshot at order time. One order item can have many modifiers.';

-- ============================================================
-- STOCK MOVEMENTS
-- ============================================================
CREATE TABLE stock_movements (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ingredient_id     UUID NOT NULL REFERENCES ingredients(id),
    quantity_change   DECIMAL(10,2) NOT NULL,
    reason            stock_reason NOT NULL,
    reference_order_id UUID REFERENCES orders(id),
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_movements_ingredient ON stock_movements (ingredient_id);
CREATE INDEX idx_stock_movements_created ON stock_movements (created_at);
CREATE INDEX idx_stock_movements_order ON stock_movements (reference_order_id);

COMMENT ON TABLE stock_movements IS 'Negative quantity_change = consumption. Positive = restock or void restoration. reason=manual_adjustment is for physical stocktake reconciliation.';

-- ============================================================
-- EXPENSES
-- ============================================================
CREATE TABLE expenses (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    amount      DECIMAL(10,2) NOT NULL,
    category    TEXT,
    recorded_by UUID NOT NULL REFERENCES employees(id),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_expense_amount_positive CHECK (amount > 0)
);

CREATE INDEX idx_expenses_recorded_at ON expenses (recorded_at);
CREATE INDEX idx_expenses_category ON expenses (category);

-- ============================================================
-- SETTINGS  (single-row store configuration)
-- ============================================================
CREATE TABLE settings (
    id              INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    store_name      TEXT NOT NULL DEFAULT 'My Cafe',
    store_address   TEXT,
    currency_symbol TEXT NOT NULL DEFAULT '$',
    receipt_header  TEXT,
    receipt_footer  TEXT,
    tax_label       TEXT NOT NULL DEFAULT 'Tax included',
    logo_url        TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE settings IS 'Single-row store configuration. CHECK (id = 1) ensures only one row can exist. Used for receipt headers, report branding, and currency display.';

INSERT INTO settings (store_name) VALUES ('My Cafe');

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Get effective availability for a menu item.
CREATE OR REPLACE FUNCTION item_is_available(item_row menu_items)
RETURNS BOOLEAN AS $$
DECLARE
    min_stock DECIMAL(10,2);
BEGIN
    IF NOT item_row.is_available OR item_row.deleted_at IS NOT NULL THEN
        RETURN false;
    END IF;

    SELECT MIN(i.stock_quantity)
    INTO min_stock
    FROM item_recipes ir
    JOIN ingredients i ON i.id = ir.ingredient_id
    WHERE ir.item_id = item_row.id;

    RETURN min_stock IS NULL OR min_stock > 0;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get effective availability for a modifier option.
CREATE OR REPLACE FUNCTION modifier_option_is_available(mo_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    is_avail BOOLEAN;
    is_del BOOLEAN;
    min_stock DECIMAL(10,2);
BEGIN
    SELECT mo.is_available, mo.deleted_at IS NOT NULL
    INTO is_avail, is_del
    FROM modifier_options mo WHERE mo.id = mo_id;
    IF NOT is_avail OR is_del THEN
        RETURN false;
    END IF;

    SELECT MIN(i.stock_quantity)
    INTO min_stock
    FROM modifier_option_ingredients moi
    JOIN ingredients i ON i.id = moi.ingredient_id
    WHERE moi.modifier_option_id = mo_id;

    RETURN min_stock IS NULL OR min_stock > 0;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get effective availability for a modifier option scoped to a specific menu item.
-- Checks the override table first, then falls through to default logic.
CREATE OR REPLACE FUNCTION modifier_option_is_available_for_item(item_id UUID, mo_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    override_avail BOOLEAN;
    is_avail BOOLEAN;
    is_del BOOLEAN;
    min_stock DECIMAL(10,2);
BEGIN
    SELECT moo.is_available INTO override_avail
    FROM menu_item_modifier_option_overrides moo
    WHERE moo.menu_item_id = item_id AND moo.modifier_option_id = mo_id;

    IF override_avail IS NOT NULL THEN
        RETURN override_avail;
    END IF;

    SELECT mo.is_available, mo.deleted_at IS NOT NULL
    INTO is_avail, is_del
    FROM modifier_options mo WHERE mo.id = mo_id;
    IF NOT is_avail OR is_del THEN
        RETURN false;
    END IF;

    SELECT MIN(i.stock_quantity)
    INTO min_stock
    FROM modifier_option_ingredients moi
    JOIN ingredients i ON i.id = moi.ingredient_id
    WHERE moi.item_id = item_id AND moi.modifier_option_id = mo_id;

    RETURN min_stock IS NULL OR min_stock > 0;
END;
$$ LANGUAGE plpgsql STABLE;

-- Deduct stock for an entire order.
-- Call after status changes to 'confirmed'.
CREATE OR REPLACE FUNCTION deduct_stock_for_order(order_row orders)
RETURNS VOID AS $$
DECLARE
    recipe RECORD;
    modifier_recipe RECORD;
BEGIN
    -- Deduct from base item recipes
    FOR recipe IN
        SELECT
            ir.ingredient_id,
            ir.quantity * oi.quantity AS total_qty
        FROM order_items oi
        JOIN item_recipes ir ON ir.item_id = oi.menu_item_id
        WHERE oi.order_id = order_row.id
    LOOP
        UPDATE ingredients
        SET stock_quantity = stock_quantity - recipe.total_qty,
            updated_at = now()
        WHERE id = recipe.ingredient_id;

        INSERT INTO stock_movements (ingredient_id, quantity_change, reason, reference_order_id, notes)
        VALUES (recipe.ingredient_id, -recipe.total_qty, 'order_placed', order_row.id,
                'Order #' || order_row.order_number);
    END LOOP;

    -- Deduct from modifier options (scoped by item)
    FOR modifier_recipe IN
        SELECT
            moi.ingredient_id,
            moi.quantity * oi.quantity AS total_qty
        FROM order_items oi
        JOIN order_item_modifiers oim ON oim.order_item_id = oi.id
        JOIN modifier_option_ingredients moi ON moi.item_id = oi.menu_item_id
            AND moi.modifier_option_id = oim.modifier_option_id
        WHERE oi.order_id = order_row.id
    LOOP
        UPDATE ingredients
        SET stock_quantity = stock_quantity - modifier_recipe.total_qty,
            updated_at = now()
        WHERE id = modifier_recipe.ingredient_id;

        INSERT INTO stock_movements (ingredient_id, quantity_change, reason, reference_order_id, notes)
        VALUES (modifier_recipe.ingredient_id, -modifier_recipe.total_qty, 'order_placed', order_row.id,
                'Order #' || order_row.order_number || ' (modifier)');
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Restore stock when an order is voided.
CREATE OR REPLACE FUNCTION restore_stock_for_order(order_row orders)
RETURNS VOID AS $$
DECLARE
    sm RECORD;
BEGIN
    FOR sm IN
        SELECT ingredient_id, quantity_change
        FROM stock_movements
        WHERE reference_order_id = order_row.id AND reason = 'order_placed'
    LOOP
        UPDATE ingredients
        SET stock_quantity = stock_quantity + ABS(sm.quantity_change),
            updated_at = now()
        WHERE id = sm.ingredient_id;

        INSERT INTO stock_movements (ingredient_id, quantity_change, reason, reference_order_id, notes)
        VALUES (sm.ingredient_id, ABS(sm.quantity_change), 'order_voided', order_row.id,
                'Void: Order #' || order_row.order_number);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Update updated_at timestamp automatically.
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER trg_employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_employee_permissions_updated_at
    BEFORE UPDATE ON employee_permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_menu_items_updated_at
    BEFORE UPDATE ON menu_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_ingredients_updated_at
    BEFORE UPDATE ON ingredients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_discounts_updated_at
    BEFORE UPDATE ON discounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SEED DATA (example)
-- ============================================================

-- Owner (PIN: 0000, also has Supabase web login)
INSERT INTO employees (id, role, name, pin, supabase_uid, is_active) VALUES
    ('00000000-0000-0000-0000-000000000001', 'owner', 'Cafe Owner', '$2a$10$EXAMPLE_HASH_OWNER', '00000000-0000-0000-0000-0000000000aa', true);

INSERT INTO employee_permissions (employee_id, can_sell, can_apply_discount, can_void_request,
    can_void_approve, can_manage_menu, can_manage_inventory, can_view_reports,
    can_open_register, can_adjust_stock, can_manage_employees,
    max_discount_percent, max_discount_amount) VALUES
    ('00000000-0000-0000-0000-000000000001', true, true, true, true, true, true, true, true, true, true, 100, 999.99);

-- Manager (PIN: 1234, also has Supabase web login)
INSERT INTO employees (id, role, name, pin, supabase_uid, is_active) VALUES
    ('00000000-0000-0000-0000-000000000002', 'manager', 'Alice (Manager)', '$2a$10$EXAMPLE_HASH_MANAGER', '00000000-0000-0000-0000-0000000000bb', true);

INSERT INTO employee_permissions (employee_id, can_sell, can_apply_discount, can_void_request,
    can_void_approve, can_manage_menu, can_manage_inventory, can_view_reports,
    can_open_register, can_adjust_stock, can_manage_employees,
    max_discount_percent, max_discount_amount) VALUES
    ('00000000-0000-0000-0000-000000000002', true, true, true, true, true, true, true, true, true, false, 100, 999.99);

-- Barista 1 (PIN: 5678, PIN-only, no web login)
INSERT INTO employees (id, role, name, pin, is_active) VALUES
    ('00000000-0000-0000-0000-000000000003', 'barista', 'Bob', '$2a$10$EXAMPLE_HASH_BARISTA1', true);

INSERT INTO employee_permissions (employee_id, can_sell, can_apply_discount, can_void_request,
    can_void_approve, can_manage_menu, can_manage_inventory, can_view_reports,
    can_open_register, can_adjust_stock, can_manage_employees,
    max_discount_percent, max_discount_amount) VALUES
    ('00000000-0000-0000-0000-000000000003', true, true, true, false, false, false, false, true, false, false, 10, 5.00);

-- Barista 2 (PIN: 4321, PIN-only, no web login)
INSERT INTO employees (id, role, name, pin, is_active) VALUES
    ('00000000-0000-0000-0000-000000000004', 'barista', 'Cindy', '$2a$10$EXAMPLE_HASH_BARISTA2', true);

INSERT INTO employee_permissions (employee_id, can_sell, can_apply_discount, can_void_request,
    can_void_approve, can_manage_menu, can_manage_inventory, can_view_reports,
    can_open_register, can_adjust_stock, can_manage_employees,
    max_discount_percent, max_discount_amount) VALUES
    ('00000000-0000-0000-0000-000000000004', true, true, true, false, false, false, false, true, false, false, 10, 5.00);

-- Categories
INSERT INTO categories (id, name, sort_order) VALUES
    ('10000000-0000-0000-0000-000000000001', 'Coffee', 1),
    ('10000000-0000-0000-0000-000000000002', 'Tea', 2),
    ('10000000-0000-0000-0000-000000000003', 'Pastry', 3),
    ('10000000-0000-0000-0000-000000000004', 'Sandwich', 4);

-- Ingredients
INSERT INTO ingredients (id, name, unit, stock_quantity, low_stock_threshold) VALUES
    ('20000000-0000-0000-0000-000000000001', 'Coffee Beans', 'g', 5000, 500),
    ('20000000-0000-0000-0000-000000000002', 'Whole Milk', 'ml', 10000, 1000),
    ('20000000-0000-0000-0000-000000000003', 'Oat Milk', 'ml', 3000, 300),
    ('20000000-0000-0000-0000-000000000004', 'Caramel Syrup', 'ml', 2000, 200),
    ('20000000-0000-0000-0000-000000000005', 'Whipped Cream', 'ml', 1500, 150),
    ('20000000-0000-0000-0000-000000000006', 'Green Tea Powder', 'g', 800, 80),
    ('20000000-0000-0000-0000-000000000007', 'Croissant Unit', 'g', 30, 5);

-- Modifier Groups
INSERT INTO modifier_groups (id, name, selection_type, is_required, sort_order) VALUES
    ('30000000-0000-0000-0000-000000000001', 'Cup Size', 'single', true, 1),
    ('30000000-0000-0000-0000-000000000002', 'Sugar Level', 'single', true, 2),
    ('30000000-0000-0000-0000-000000000003', 'Milk Type', 'single', true, 3),
    ('30000000-0000-0000-0000-000000000004', 'Toppings', 'multiple', false, 4);

-- Modifier Options: Cup Size
INSERT INTO modifier_options (id, modifier_group_id, name, price, sort_order) VALUES
    ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Small', 0.00, 1),
    ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'Medium', 0.50, 2),
    ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', 'Large', 1.00, 3);

-- Modifier Options: Sugar Level
INSERT INTO modifier_options (id, modifier_group_id, name, price, sort_order) VALUES
    ('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000002', '0%', 0.00, 1),
    ('40000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000002', '25%', 0.00, 2),
    ('40000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000002', '50%', 0.00, 3),
    ('40000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000002', '75%', 0.00, 4),
    ('40000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000002', '100%', 0.00, 5);

-- Modifier Options: Milk Type
INSERT INTO modifier_options (id, modifier_group_id, name, price, sort_order) VALUES
    ('40000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000003', 'Whole Milk', 0.00, 1),
    ('40000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000003', 'Oat Milk', 0.50, 2);

-- Modifier Options: Toppings
INSERT INTO modifier_options (id, modifier_group_id, name, price, sort_order) VALUES
    ('40000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000004', 'Whipped Cream', 0.50, 1),
    ('40000000-0000-0000-0000-000000000012', '30000000-0000-0000-0000-000000000004', 'Caramel Drizzle', 0.75, 2);

-- Set default modifier options (applied after both tables are populated)
-- Sugar Level defaults to 0%. Cup Size defaults to Medium. Milk Type defaults to Whole Milk.
UPDATE modifier_groups SET default_option_id = '40000000-0000-0000-0000-000000000002' WHERE id = '30000000-0000-0000-0000-000000000001';  -- Cup Size → Medium
UPDATE modifier_groups SET default_option_id = '40000000-0000-0000-0000-000000000004' WHERE id = '30000000-0000-0000-0000-000000000002';  -- Sugar Level → 0%
UPDATE modifier_groups SET default_option_id = '40000000-0000-0000-0000-000000000009' WHERE id = '30000000-0000-0000-0000-000000000003';  -- Milk Type → Whole Milk

-- Menu items
INSERT INTO menu_items (id, category_id, name, base_price) VALUES
    ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Latte', 3.50),
    ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Iced Latte', 4.00),
    ('50000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'Green Tea', 3.00),
    ('50000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003', 'Croissant', 3.00);

-- Link menu items to modifier groups
INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order) VALUES
    ('50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 1),
    ('50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 2),
    ('50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 3),
    ('50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 4);

INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order) VALUES
    ('50000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 1),
    ('50000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 2),
    ('50000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003', 3),
    ('50000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000004', 4);

INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order) VALUES
    ('50000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', 1),
    ('50000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', 2);

-- Ingredient consumption for modifier options (scoped per item)
-- Latte → Small: 14g coffee + 200ml milk
INSERT INTO modifier_option_ingredients (item_id, modifier_option_id, ingredient_id, quantity) VALUES
    ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 14),
    ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 200);

-- Latte → Medium: 16g coffee + 250ml milk
INSERT INTO modifier_option_ingredients (item_id, modifier_option_id, ingredient_id, quantity) VALUES
    ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 16),
    ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 250);

-- Latte → Large: 18g coffee + 300ml milk
INSERT INTO modifier_option_ingredients (item_id, modifier_option_id, ingredient_id, quantity) VALUES
    ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 18),
    ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 300);

-- Latte → Oat Milk: 250ml oat milk
INSERT INTO modifier_option_ingredients (item_id, modifier_option_id, ingredient_id, quantity) VALUES
    ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000003', 250);

-- Latte → Whipped Cream: 50ml
INSERT INTO modifier_option_ingredients (item_id, modifier_option_id, ingredient_id, quantity) VALUES
    ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000005', 50);

-- Latte → Caramel Drizzle: 20ml
INSERT INTO modifier_option_ingredients (item_id, modifier_option_id, ingredient_id, quantity) VALUES
    ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000004', 20);

-- Iced Latte uses different coffee/milk ratios: Large → 18g coffee + 250ml milk + ice
INSERT INTO modifier_option_ingredients (item_id, modifier_option_id, ingredient_id, quantity) VALUES
    ('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 18),
    ('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 250);

-- Green Tea → Large: 12g green tea powder + 300ml water
INSERT INTO modifier_option_ingredients (item_id, modifier_option_id, ingredient_id, quantity) VALUES
    ('50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000006', 12);

-- Base recipe for Croissant (no modifiers) → 1 unit of Croissant Unit ingredient
INSERT INTO item_recipes (item_id, ingredient_id, quantity) VALUES
    ('50000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000007', 1);

-- Discounts
INSERT INTO discounts (id, name, type, value, is_active) VALUES
    ('60000000-0000-0000-0000-000000000001', 'Happy Hour 20% Off', 'percentage', 20, true),
    ('60000000-0000-0000-0000-000000000002', 'Buy 1 Get 1 Free', 'bogo', NULL, true);

-- Modifier option overrides (per-item pricing & availability)
-- Matcha → Large: price override to +$0.50 (default is +$1.00)
INSERT INTO menu_item_modifier_option_overrides (menu_item_id, modifier_option_id, price_override) VALUES
    ('50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000003', 0.50);

-- Matcha → Small: hidden (is_available = false)
INSERT INTO menu_item_modifier_option_overrides (menu_item_id, modifier_option_id, is_available) VALUES
    ('50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', false);

-- Matcha → Oat Milk: hidden (not traditionally offered)
INSERT INTO menu_item_modifier_option_overrides (menu_item_id, modifier_option_id, is_available) VALUES
    ('50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000010', false);

-- Matcha → Caramel Drizzle: hidden
INSERT INTO menu_item_modifier_option_overrides (menu_item_id, modifier_option_id, is_available) VALUES
    ('50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000012', false);
