--
-- PostgreSQL database dump
--

\restrict Al1zJWQZRypkybMZDb4GlEIxuOStBgT3FHigJ6PrpqLAgAC8AyqeJvUgOGgdmel

-- Dumped from database version 16.16
-- Dumped by pg_dump version 16.16

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: employment_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.employment_type AS ENUM (
    'full_time',
    'part_time',
    'contract'
);


--
-- Name: expense_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.expense_category AS ENUM (
    'raw_material',
    'packaging',
    'operational',
    'salary',
    'utilities',
    'equipment',
    'transport',
    'other'
);


--
-- Name: ingredient_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ingredient_category AS ENUM (
    'dairy',
    'coffee_bean',
    'syrup',
    'packaging',
    'flavor_powder',
    'other'
);


--
-- Name: movement_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.movement_type AS ENUM (
    'purchase_in',
    'adjustment_in',
    'adjustment_out',
    'sale_out',
    'sale_void_in',
    'transfer_out',
    'transfer_in',
    'opname',
    'waste_out'
);


--
-- Name: opname_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.opname_status AS ENUM (
    'pending_review',
    'approved',
    'rejected'
);


--
-- Name: order_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.order_type AS ENUM (
    'dine_in',
    'takeaway',
    'delivery'
);


--
-- Name: org_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.org_role AS ENUM (
    'owner',
    'admin',
    'staff'
);


--
-- Name: otp_purpose; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.otp_purpose AS ENUM (
    'register',
    'email_change'
);


--
-- Name: outlet_business_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.outlet_business_type AS ENUM (
    'coffee_bakery',
    'restaurant',
    'warung',
    'retail',
    'catering',
    'food_manufacture'
);


--
-- Name: pay_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.pay_status AS ENUM (
    'paid',
    'unpaid',
    'credit'
);


--
-- Name: payment_method; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_method AS ENUM (
    'qris',
    'cash',
    'debit',
    'bank_transfer'
);


--
-- Name: plan_code; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.plan_code AS ENUM (
    'free_trial',
    'starter',
    'growth',
    'pro',
    'business'
);


--
-- Name: product_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.product_kind AS ENUM (
    'made_to_order',
    'finished_good',
    'pre_order'
);


--
-- Name: recipe_component_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.recipe_component_type AS ENUM (
    'ingredient',
    'product'
);


--
-- Name: register_business_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.register_business_type AS ENUM (
    'restaurant',
    'retail',
    'service'
);


--
-- Name: sale_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sale_status AS ENUM (
    'paid',
    'pending',
    'cancelled'
);


--
-- Name: shift_name; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.shift_name AS ENUM (
    'morning',
    'evening'
);


--
-- Name: shift_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.shift_status AS ENUM (
    'open',
    'balanced',
    'variance'
);


--
-- Name: staff_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.staff_role AS ENUM (
    'store_manager',
    'head_barista',
    'barista',
    'cashier',
    'cook',
    'helper'
);


--
-- Name: stock_item_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stock_item_type AS ENUM (
    'ingredient',
    'finished_good'
);


--
-- Name: subscription_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.subscription_status AS ENUM (
    'trialing',
    'active',
    'expired'
);


--
-- Name: transfer_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.transfer_status AS ENUM (
    'in_transit',
    'completed',
    'cancelled'
);


--
-- Name: uom; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.uom AS ENUM (
    'ml',
    'gram',
    'kg',
    'pcs',
    'liter',
    'botol',
    'karton',
    'pouch',
    'pack',
    'orang',
    'bulan'
);


--
-- Name: user_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_status AS ENUM (
    'pending',
    'active',
    'disabled'
);


--
-- Name: waste_reason; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.waste_reason AS ENUM (
    'expired',
    'damaged',
    'trial_fail',
    'lost'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: ai_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    conversation_id uuid NOT NULL,
    role text NOT NULL,
    text text NOT NULL,
    suggestions jsonb,
    client_message_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    actor_user_id uuid,
    action text NOT NULL,
    entity text NOT NULL,
    entity_id uuid,
    metadata jsonb,
    ip text,
    request_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cash_shifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cash_shifts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    outlet_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    opened_by_user_id uuid NOT NULL,
    shift_name public.shift_name NOT NULL,
    starting_cash_idr bigint NOT NULL,
    cash_sales_idr bigint DEFAULT 0 NOT NULL,
    qris_sales_idr bigint DEFAULT 0 NOT NULL,
    actual_physical_cash_idr bigint,
    difference_idr bigint,
    notes text,
    status public.shift_status DEFAULT 'open'::public.shift_status NOT NULL,
    opened_at timestamp with time zone DEFAULT now() NOT NULL,
    closed_at timestamp with time zone
);


--
-- Name: daily_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    outlet_id uuid NOT NULL,
    date text NOT NULL,
    omset_net_idr bigint DEFAULT 0 NOT NULL,
    omset_gross_idr bigint DEFAULT 0 NOT NULL,
    cogs_idr bigint DEFAULT 0 NOT NULL,
    opex_idr bigint DEFAULT 0 NOT NULL,
    waste_idr bigint DEFAULT 0 NOT NULL,
    trx_count integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: document_counters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_counters (
    organization_id uuid NOT NULL,
    outlet_id uuid,
    kind text NOT NULL,
    yyyymmdd text NOT NULL,
    last_value integer NOT NULL
);


--
-- Name: email_otps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_otps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    user_id uuid,
    purpose public.otp_purpose NOT NULL,
    code_hash text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    max_attempts integer DEFAULT 5 NOT NULL,
    locked_until timestamp with time zone,
    expires_at timestamp with time zone NOT NULL,
    consumed_at timestamp with time zone,
    last_sent_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    outlet_id uuid NOT NULL,
    date text NOT NULL,
    name text NOT NULL,
    category public.expense_category NOT NULL,
    qty numeric(14,4) NOT NULL,
    uom public.uom NOT NULL,
    unit_price_idr bigint NOT NULL,
    total_idr bigint NOT NULL,
    supplier_id uuid,
    supplier_name text,
    payment_method public.payment_method NOT NULL,
    pay_status public.pay_status NOT NULL,
    notes text,
    counted_in_cogs boolean DEFAULT false NOT NULL,
    input_method text DEFAULT 'MANUAL'::text NOT NULL,
    receipt_image_url text,
    receipt_confidence numeric(5,2),
    receipt_number text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: export_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.export_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    status text NOT NULL,
    params jsonb NOT NULL,
    file_path text,
    error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone
);


--
-- Name: idempotency_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.idempotency_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    method text NOT NULL,
    path text NOT NULL,
    key text NOT NULL,
    request_hash text NOT NULL,
    response_status integer NOT NULL,
    response_body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL
);


--
-- Name: ingredients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ingredients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    sku text NOT NULL,
    name text NOT NULL,
    category public.ingredient_category NOT NULL,
    uom public.uom NOT NULL,
    purchase_price_idr bigint NOT NULL,
    last_purchase_unit_cost numeric(14,4),
    min_stock numeric(14,4) DEFAULT '0'::numeric NOT NULL,
    lead_time_days integer DEFAULT 3 NOT NULL,
    supplier_id uuid,
    supplier_name text,
    is_active boolean DEFAULT true NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: inventory_balances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_balances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    outlet_id uuid NOT NULL,
    warehouse_id uuid NOT NULL,
    item_type public.stock_item_type NOT NULL,
    item_id uuid NOT NULL,
    qty_on_hand numeric(14,4) DEFAULT '0'::numeric NOT NULL,
    qty_reserved numeric(14,4) DEFAULT '0'::numeric NOT NULL,
    avg_unit_cost numeric(14,4) DEFAULT '0'::numeric NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_preferences (
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    low_stock boolean DEFAULT true NOT NULL,
    daily_report boolean DEFAULT true NOT NULL,
    new_transaction boolean DEFAULT false NOT NULL,
    unpaid_reminder boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: organization_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organization_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    org_role public.org_role NOT NULL,
    default_outlet_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    country text DEFAULT 'Indonesia'::text NOT NULL,
    province text NOT NULL,
    city text NOT NULL,
    register_business_type public.register_business_type NOT NULL,
    accepted_terms_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: outlets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.outlets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    business_type public.outlet_business_type DEFAULT 'coffee_bakery'::public.outlet_business_type NOT NULL,
    address text,
    city text,
    phone text,
    is_active boolean DEFAULT true NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    consumed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: payroll_stubs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_stubs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    outlet_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    period_start text NOT NULL,
    period_end text NOT NULL,
    base_salary_idr bigint NOT NULL,
    bonus_idr bigint DEFAULT 0 NOT NULL,
    deductions_idr bigint DEFAULT 0 NOT NULL,
    total_net_idr bigint NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    sku text NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    selling_price_idr bigint NOT NULL,
    kind public.product_kind DEFAULT 'made_to_order'::public.product_kind NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: recipe_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recipe_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    product_id uuid NOT NULL,
    component_type public.recipe_component_type NOT NULL,
    component_id uuid NOT NULL,
    qty numeric(14,4) NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    user_agent text,
    ip text,
    last_used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: registrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.registrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    onboarding_token_hash text,
    onboarding_expires_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sale_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sale_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    sale_id uuid NOT NULL,
    product_id uuid NOT NULL,
    name_snapshot text NOT NULL,
    qty numeric(14,4) NOT NULL,
    unit_price_idr bigint NOT NULL,
    line_total_idr bigint NOT NULL,
    unit_cogs_idr bigint DEFAULT 0 NOT NULL,
    line_cogs_idr bigint DEFAULT 0 NOT NULL
);


--
-- Name: sales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    outlet_id uuid NOT NULL,
    warehouse_id uuid NOT NULL,
    no_nota text NOT NULL,
    sold_at timestamp with time zone DEFAULT now() NOT NULL,
    cashier_user_id uuid NOT NULL,
    cashier_staff_id uuid,
    cash_shift_id uuid,
    order_type public.order_type NOT NULL,
    payment_method public.payment_method NOT NULL,
    customer_name text,
    subtotal_idr bigint NOT NULL,
    discount_idr bigint DEFAULT 0 NOT NULL,
    tax_idr bigint DEFAULT 0 NOT NULL,
    total_idr bigint NOT NULL,
    cogs_idr bigint DEFAULT 0 NOT NULL,
    status public.sale_status DEFAULT 'paid'::public.sale_status NOT NULL,
    cancelled_at timestamp with time zone,
    cancelled_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: staff; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    outlet_id uuid NOT NULL,
    user_id uuid,
    name text NOT NULL,
    staff_role public.staff_role NOT NULL,
    phone text NOT NULL,
    email text,
    employment_type public.employment_type NOT NULL,
    joined_on text NOT NULL,
    base_salary_idr bigint DEFAULT 0 NOT NULL,
    allowance_idr bigint DEFAULT 0 NOT NULL,
    current_shift_label text,
    rating_score numeric(3,1) DEFAULT 5.0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stock_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    outlet_id uuid NOT NULL,
    warehouse_id uuid NOT NULL,
    item_type public.stock_item_type NOT NULL,
    item_id uuid NOT NULL,
    type public.movement_type NOT NULL,
    qty numeric(14,4) NOT NULL,
    unit_cost numeric(14,4) NOT NULL,
    amount_idr bigint NOT NULL,
    ref_type text NOT NULL,
    ref_id uuid NOT NULL,
    notes text,
    actor_user_id uuid NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stock_opnames; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_opnames (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    outlet_id uuid NOT NULL,
    warehouse_id uuid NOT NULL,
    item_type public.stock_item_type NOT NULL,
    item_id uuid NOT NULL,
    system_qty numeric(14,4) NOT NULL,
    physical_qty numeric(14,4) NOT NULL,
    variance_qty numeric(14,4) NOT NULL,
    uom public.uom NOT NULL,
    notes text,
    status public.opname_status DEFAULT 'pending_review'::public.opname_status NOT NULL,
    actor_user_id uuid NOT NULL,
    approved_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    decided_at timestamp with time zone
);


--
-- Name: stock_transfer_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_transfer_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    transfer_id uuid NOT NULL,
    item_type public.stock_item_type NOT NULL,
    item_id uuid NOT NULL,
    qty numeric(14,4) NOT NULL,
    uom public.uom NOT NULL,
    unit_cost numeric(14,4) NOT NULL
);


--
-- Name: stock_transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    no_transfer text NOT NULL,
    from_warehouse_id uuid NOT NULL,
    to_warehouse_id uuid NOT NULL,
    status public.transfer_status DEFAULT 'in_transit'::public.transfer_status NOT NULL,
    actor_user_id uuid NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    cancelled_at timestamp with time zone
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    plan_code public.plan_code NOT NULL,
    status public.subscription_status NOT NULL,
    trial_ends_at timestamp with time zone,
    current_period_end timestamp with time zone,
    outlet_limit integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    phone text,
    email text,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    password_hash text NOT NULL,
    avatar_url text,
    job_title text,
    status public.user_status DEFAULT 'pending'::public.user_status NOT NULL,
    email_verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: warehouses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.warehouses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    outlet_id uuid NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: waste_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.waste_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    outlet_id uuid NOT NULL,
    warehouse_id uuid NOT NULL,
    item_type public.stock_item_type NOT NULL,
    item_id uuid NOT NULL,
    qty numeric(14,4) NOT NULL,
    uom public.uom NOT NULL,
    reason public.waste_reason NOT NULL,
    loss_idr bigint NOT NULL,
    actor_user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Data for Name: ai_conversations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ai_conversations (id, organization_id, user_id, created_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: ai_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ai_messages (id, organization_id, conversation_id, role, text, suggestions, client_message_id, created_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, organization_id, actor_user_id, action, entity, entity_id, metadata, ip, request_id, created_at) FROM stdin;
\.


--
-- Data for Name: cash_shifts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cash_shifts (id, organization_id, outlet_id, staff_id, opened_by_user_id, shift_name, starting_cash_idr, cash_sales_idr, qris_sales_idr, actual_physical_cash_idr, difference_idr, notes, status, opened_at, closed_at) FROM stdin;
\.


--
-- Data for Name: daily_metrics; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.daily_metrics (id, organization_id, outlet_id, date, omset_net_idr, omset_gross_idr, cogs_idr, opex_idr, waste_idr, trx_count, updated_at) FROM stdin;
\.


--
-- Data for Name: document_counters; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.document_counters (organization_id, outlet_id, kind, yyyymmdd, last_value) FROM stdin;
\.


--
-- Data for Name: email_otps; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.email_otps (id, email, user_id, purpose, code_hash, attempts, max_attempts, locked_until, expires_at, consumed_at, last_sent_at, created_at) FROM stdin;
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.expenses (id, organization_id, outlet_id, date, name, category, qty, uom, unit_price_idr, total_idr, supplier_id, supplier_name, payment_method, pay_status, notes, counted_in_cogs, input_method, receipt_image_url, receipt_confidence, receipt_number, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: export_jobs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.export_jobs (id, organization_id, user_id, type, status, params, file_path, error, created_at, finished_at) FROM stdin;
\.


--
-- Data for Name: idempotency_keys; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.idempotency_keys (id, organization_id, user_id, method, path, key, request_hash, response_status, response_body, created_at, expires_at) FROM stdin;
\.


--
-- Data for Name: ingredients; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ingredients (id, organization_id, sku, name, category, uom, purchase_price_idr, last_purchase_unit_cost, min_stock, lead_time_days, supplier_id, supplier_name, is_active, deleted_at, created_at, updated_at) FROM stdin;
3cd43dc7-06f1-418d-878f-7886effe682a	d386f531-8958-4f51-a19a-1e8c929fb61f	ING-BEAN-ARB	Biji Kopi Arabika House Blend	coffee_bean	gram	280	280.0000	1000.0000	3	00ed7d18-c79f-4e5a-8f06-3fa38161f0c0	Roastery Nusantara Bandung	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
2ee96152-24f7-4fb0-af9d-4bff4226f70a	d386f531-8958-4f51-a19a-1e8c929fb61f	ING-BEAN-ROB	Biji Kopi Robusta Lampung	coffee_bean	gram	160	160.0000	1000.0000	3	00ed7d18-c79f-4e5a-8f06-3fa38161f0c0	Roastery Nusantara Bandung	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
d21b3b4c-0aef-42d6-8abb-079bbe0c5d36	d386f531-8958-4f51-a19a-1e8c929fb61f	ING-MILK-UHT	Susu UHT Full Cream	dairy	ml	20	20.0000	5000.0000	3	00ed7d18-c79f-4e5a-8f06-3fa38161f0c0	Roastery Nusantara Bandung	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
30977920-907a-49b6-9962-24380acc8453	d386f531-8958-4f51-a19a-1e8c929fb61f	ING-MILK-SKM	Susu Kental Manis	dairy	ml	28	28.0000	1000.0000	3	00ed7d18-c79f-4e5a-8f06-3fa38161f0c0	Roastery Nusantara Bandung	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
8dcef40e-ea8d-4865-aaf4-65c99cb0be8d	d386f531-8958-4f51-a19a-1e8c929fb61f	ING-MILK-EVAP	Susu Evaporasi	dairy	ml	32	32.0000	1000.0000	3	00ed7d18-c79f-4e5a-8f06-3fa38161f0c0	Roastery Nusantara Bandung	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
21200b32-c3e7-4027-874a-89df89094592	d386f531-8958-4f51-a19a-1e8c929fb61f	ING-SYR-AREN	Gula Aren Cair	syrup	ml	35	35.0000	1500.0000	3	00ed7d18-c79f-4e5a-8f06-3fa38161f0c0	Roastery Nusantara Bandung	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
d511acd8-295e-4bbc-8ab3-990348ede8f2	d386f531-8958-4f51-a19a-1e8c929fb61f	ING-SYR-VAN	Sirup Vanila	syrup	ml	95	95.0000	500.0000	3	00ed7d18-c79f-4e5a-8f06-3fa38161f0c0	Roastery Nusantara Bandung	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
86f47dd1-2ed3-4db2-8b07-f38c3685102a	d386f531-8958-4f51-a19a-1e8c929fb61f	ING-SYR-CRM	Sirup Karamel	syrup	ml	95	95.0000	500.0000	3	00ed7d18-c79f-4e5a-8f06-3fa38161f0c0	Roastery Nusantara Bandung	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
cd8a5b22-9372-44e9-812e-b454cfd96044	d386f531-8958-4f51-a19a-1e8c929fb61f	ING-SYR-HZL	Sirup Hazelnut	syrup	ml	95	95.0000	500.0000	3	00ed7d18-c79f-4e5a-8f06-3fa38161f0c0	Roastery Nusantara Bandung	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
33955c07-1264-49a4-bd88-b0c5b973692d	d386f531-8958-4f51-a19a-1e8c929fb61f	ING-SYR-LYC	Sirup Leci	syrup	ml	85	85.0000	500.0000	3	00ed7d18-c79f-4e5a-8f06-3fa38161f0c0	Roastery Nusantara Bandung	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
6e5e1e91-e799-4880-9699-49271f913b93	d386f531-8958-4f51-a19a-1e8c929fb61f	ING-PWD-MTC	Bubuk Matcha Uji	flavor_powder	gram	320	320.0000	300.0000	3	00ed7d18-c79f-4e5a-8f06-3fa38161f0c0	Roastery Nusantara Bandung	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
6751c0ea-72d4-41e8-8b42-620a06614638	d386f531-8958-4f51-a19a-1e8c929fb61f	ING-PWD-CHC	Bubuk Cokelat Premium	flavor_powder	gram	180	180.0000	500.0000	3	00ed7d18-c79f-4e5a-8f06-3fa38161f0c0	Roastery Nusantara Bandung	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
fa31cfed-1a56-43b4-847b-f7b91845037d	d386f531-8958-4f51-a19a-1e8c929fb61f	ING-PWD-RDV	Bubuk Red Velvet	flavor_powder	gram	200	200.0000	300.0000	3	00ed7d18-c79f-4e5a-8f06-3fa38161f0c0	Roastery Nusantara Bandung	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
893b2431-58c2-4c28-b1d7-300ccbfcfcad	d386f531-8958-4f51-a19a-1e8c929fb61f	ING-TEA-BLK	Daun Teh Hitam	other	gram	120	120.0000	300.0000	3	00ed7d18-c79f-4e5a-8f06-3fa38161f0c0	Roastery Nusantara Bandung	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
203c700a-d041-4d48-9a83-3dc90992033f	d386f531-8958-4f51-a19a-1e8c929fb61f	ING-PKG-CUP16	Cup Plastik 16oz + Tutup	packaging	pcs	850	850.0000	100.0000	3	00ed7d18-c79f-4e5a-8f06-3fa38161f0c0	Roastery Nusantara Bandung	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
4ec4379b-3a1a-43ab-a642-f06ca6eae811	d386f531-8958-4f51-a19a-1e8c929fb61f	ING-PKG-CUP8H	Paper Cup Hot 8oz + Lid	packaging	pcs	900	900.0000	100.0000	3	00ed7d18-c79f-4e5a-8f06-3fa38161f0c0	Roastery Nusantara Bandung	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
caf11bd1-6984-429a-9695-521926dcb6b2	d386f531-8958-4f51-a19a-1e8c929fb61f	ING-PKG-BTL1L	Botol PET 1 Liter + Segel	packaging	pcs	2500	2500.0000	20.0000	3	00ed7d18-c79f-4e5a-8f06-3fa38161f0c0	Roastery Nusantara Bandung	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
\.


--
-- Data for Name: inventory_balances; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inventory_balances (id, organization_id, outlet_id, warehouse_id, item_type, item_id, qty_on_hand, qty_reserved, avg_unit_cost, updated_at) FROM stdin;
9f91d383-f204-4b6a-a5a7-bd88cb04e818	d386f531-8958-4f51-a19a-1e8c929fb61f	927ad659-4f37-4c44-b779-8947f38a3594	e29cad10-c5a0-4c30-85f7-9de0ac9e4eaa	ingredient	3cd43dc7-06f1-418d-878f-7886effe682a	15000.0000	0.0000	280.0000	2026-11-15 13:39:30.893102+00
67b58c72-e1c6-4c39-8494-8e56b9a2b6ec	d386f531-8958-4f51-a19a-1e8c929fb61f	927ad659-4f37-4c44-b779-8947f38a3594	e29cad10-c5a0-4c30-85f7-9de0ac9e4eaa	ingredient	2ee96152-24f7-4fb0-af9d-4bff4226f70a	10000.0000	0.0000	160.0000	2026-11-15 13:39:30.893102+00
c4e446d6-442e-4852-a6a3-19f39c1677fb	d386f531-8958-4f51-a19a-1e8c929fb61f	927ad659-4f37-4c44-b779-8947f38a3594	e29cad10-c5a0-4c30-85f7-9de0ac9e4eaa	ingredient	d21b3b4c-0aef-42d6-8abb-079bbe0c5d36	50000.0000	0.0000	20.0000	2026-11-15 13:39:30.893102+00
b015462c-9a53-4315-ae6d-73d3edbca53e	d386f531-8958-4f51-a19a-1e8c929fb61f	927ad659-4f37-4c44-b779-8947f38a3594	e29cad10-c5a0-4c30-85f7-9de0ac9e4eaa	ingredient	30977920-907a-49b6-9962-24380acc8453	10000.0000	0.0000	28.0000	2026-11-15 13:39:30.893102+00
cb23ba19-b43a-4c75-8ea1-54c434830f76	d386f531-8958-4f51-a19a-1e8c929fb61f	927ad659-4f37-4c44-b779-8947f38a3594	e29cad10-c5a0-4c30-85f7-9de0ac9e4eaa	ingredient	8dcef40e-ea8d-4865-aaf4-65c99cb0be8d	10000.0000	0.0000	32.0000	2026-11-15 13:39:30.893102+00
c7f6c20a-a4d7-4123-8f90-1a2aefbfa4a4	d386f531-8958-4f51-a19a-1e8c929fb61f	927ad659-4f37-4c44-b779-8947f38a3594	e29cad10-c5a0-4c30-85f7-9de0ac9e4eaa	ingredient	21200b32-c3e7-4027-874a-89df89094592	20000.0000	0.0000	35.0000	2026-11-15 13:39:30.893102+00
1bd90a47-0fd0-4316-99f5-3152813c6c0c	d386f531-8958-4f51-a19a-1e8c929fb61f	927ad659-4f37-4c44-b779-8947f38a3594	e29cad10-c5a0-4c30-85f7-9de0ac9e4eaa	ingredient	d511acd8-295e-4bbc-8ab3-990348ede8f2	5000.0000	0.0000	95.0000	2026-11-15 13:39:30.893102+00
2ded6d30-66f0-4700-8abc-6a2b5af97e3e	d386f531-8958-4f51-a19a-1e8c929fb61f	927ad659-4f37-4c44-b779-8947f38a3594	e29cad10-c5a0-4c30-85f7-9de0ac9e4eaa	ingredient	86f47dd1-2ed3-4db2-8b07-f38c3685102a	5000.0000	0.0000	95.0000	2026-11-15 13:39:30.893102+00
79d0e94a-174e-4b72-9631-eb19800d02cf	d386f531-8958-4f51-a19a-1e8c929fb61f	927ad659-4f37-4c44-b779-8947f38a3594	e29cad10-c5a0-4c30-85f7-9de0ac9e4eaa	ingredient	cd8a5b22-9372-44e9-812e-b454cfd96044	5000.0000	0.0000	95.0000	2026-11-15 13:39:30.893102+00
a694105c-320f-4ba7-a0dd-3261928008aa	d386f531-8958-4f51-a19a-1e8c929fb61f	927ad659-4f37-4c44-b779-8947f38a3594	e29cad10-c5a0-4c30-85f7-9de0ac9e4eaa	ingredient	33955c07-1264-49a4-bd88-b0c5b973692d	5000.0000	0.0000	85.0000	2026-11-15 13:39:30.893102+00
8a135e52-8ce4-4bf2-a7ce-64d33c70f977	d386f531-8958-4f51-a19a-1e8c929fb61f	927ad659-4f37-4c44-b779-8947f38a3594	e29cad10-c5a0-4c30-85f7-9de0ac9e4eaa	ingredient	6e5e1e91-e799-4880-9699-49271f913b93	3000.0000	0.0000	320.0000	2026-11-15 13:39:30.893102+00
489d8235-5e2e-468d-b9de-e0e0d132e55c	d386f531-8958-4f51-a19a-1e8c929fb61f	927ad659-4f37-4c44-b779-8947f38a3594	e29cad10-c5a0-4c30-85f7-9de0ac9e4eaa	ingredient	6751c0ea-72d4-41e8-8b42-620a06614638	5000.0000	0.0000	180.0000	2026-11-15 13:39:30.893102+00
d6481bf0-a4e8-4571-be97-23d96ef8a980	d386f531-8958-4f51-a19a-1e8c929fb61f	927ad659-4f37-4c44-b779-8947f38a3594	e29cad10-c5a0-4c30-85f7-9de0ac9e4eaa	ingredient	fa31cfed-1a56-43b4-847b-f7b91845037d	3000.0000	0.0000	200.0000	2026-11-15 13:39:30.893102+00
0e17b24c-7345-4e59-861a-eb103f02d3d2	d386f531-8958-4f51-a19a-1e8c929fb61f	927ad659-4f37-4c44-b779-8947f38a3594	e29cad10-c5a0-4c30-85f7-9de0ac9e4eaa	ingredient	893b2431-58c2-4c28-b1d7-300ccbfcfcad	3000.0000	0.0000	120.0000	2026-11-15 13:39:30.893102+00
e509c999-8002-440a-9004-4fcf23037b82	d386f531-8958-4f51-a19a-1e8c929fb61f	927ad659-4f37-4c44-b779-8947f38a3594	e29cad10-c5a0-4c30-85f7-9de0ac9e4eaa	ingredient	203c700a-d041-4d48-9a83-3dc90992033f	2000.0000	0.0000	850.0000	2026-11-15 13:39:30.893102+00
f4cdf8a4-eef9-4c1a-8f2a-b3c570518d1d	d386f531-8958-4f51-a19a-1e8c929fb61f	927ad659-4f37-4c44-b779-8947f38a3594	e29cad10-c5a0-4c30-85f7-9de0ac9e4eaa	ingredient	4ec4379b-3a1a-43ab-a642-f06ca6eae811	1500.0000	0.0000	900.0000	2026-11-15 13:39:30.893102+00
6a149e02-9ecd-48d0-be18-1929724580ad	d386f531-8958-4f51-a19a-1e8c929fb61f	927ad659-4f37-4c44-b779-8947f38a3594	e29cad10-c5a0-4c30-85f7-9de0ac9e4eaa	ingredient	caf11bd1-6984-429a-9695-521926dcb6b2	200.0000	0.0000	2500.0000	2026-11-15 13:39:30.893102+00
a052626d-eb17-47a0-9b37-55973fb03dcc	d386f531-8958-4f51-a19a-1e8c929fb61f	927ad659-4f37-4c44-b779-8947f38a3594	e29cad10-c5a0-4c30-85f7-9de0ac9e4eaa	finished_good	80098c63-3261-4db2-8a01-5d0df876e2b6	50.0000	0.0000	9900.0000	2026-11-15 13:39:30.893102+00
e381acf0-90f4-4813-982a-f63eb61542b5	d386f531-8958-4f51-a19a-1e8c929fb61f	927ad659-4f37-4c44-b779-8947f38a3594	e29cad10-c5a0-4c30-85f7-9de0ac9e4eaa	finished_good	1ca0ff6b-a5da-4bde-8985-e666d97c4e4e	40.0000	0.0000	11250.0000	2026-11-15 13:39:30.893102+00
1fe65a71-3ea5-442e-8425-614e64bf823c	d386f531-8958-4f51-a19a-1e8c929fb61f	927ad659-4f37-4c44-b779-8947f38a3594	e29cad10-c5a0-4c30-85f7-9de0ac9e4eaa	finished_good	85703706-86b5-4e57-88e4-74f06f3e60d6	45.0000	0.0000	9000.0000	2026-11-15 13:39:30.893102+00
98c2a8c5-b60d-49bb-bec7-3488f9864f2e	d386f531-8958-4f51-a19a-1e8c929fb61f	927ad659-4f37-4c44-b779-8947f38a3594	e29cad10-c5a0-4c30-85f7-9de0ac9e4eaa	finished_good	aeb29adc-7708-4735-be9c-1b8079a0c389	60.0000	0.0000	8100.0000	2026-11-15 13:39:30.893102+00
096cb169-ac91-4c85-b50c-9b4381bcc37c	d386f531-8958-4f51-a19a-1e8c929fb61f	927ad659-4f37-4c44-b779-8947f38a3594	e29cad10-c5a0-4c30-85f7-9de0ac9e4eaa	finished_good	6517e025-e141-4a2f-adc7-d64ed3ad75ce	80.0000	0.0000	4500.0000	2026-11-15 13:39:30.893102+00
\.


--
-- Data for Name: notification_preferences; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notification_preferences (user_id, organization_id, low_stock, daily_report, new_transaction, unpaid_reminder, updated_at) FROM stdin;
\.


--
-- Data for Name: organization_members; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.organization_members (id, organization_id, user_id, org_role, default_outlet_id, created_at) FROM stdin;
2cd255be-67a5-4d7c-a3ee-3e35c72419ad	d386f531-8958-4f51-a19a-1e8c929fb61f	dd850293-0b37-4dd2-9020-40974d9c6eb3	owner	927ad659-4f37-4c44-b779-8947f38a3594	2026-11-15 13:39:30.893102+00
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.organizations (id, name, country, province, city, register_business_type, accepted_terms_at, created_at, updated_at) FROM stdin;
d386f531-8958-4f51-a19a-1e8c929fb61f	Kopi Teratur	Indonesia	Jawa Barat	Bandung	restaurant	2026-11-15 13:39:30.904+00	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
\.


--
-- Data for Name: outlets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.outlets (id, organization_id, name, business_type, address, city, phone, is_active, deleted_at, created_at, updated_at) FROM stdin;
927ad659-4f37-4c44-b779-8947f38a3594	d386f531-8958-4f51-a19a-1e8c929fb61f	Kopi Teratur - Outlet Pusat	coffee_bakery	Jl. Braga No. 88, Sumur Bandung	Bandung	022-4201234	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.password_reset_tokens (id, user_id, token_hash, expires_at, consumed_at, created_at) FROM stdin;
\.


--
-- Data for Name: payroll_stubs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payroll_stubs (id, organization_id, outlet_id, staff_id, period_start, period_end, base_salary_idr, bonus_idr, deductions_idr, total_net_idr, notes, created_at) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.products (id, organization_id, sku, name, category, selling_price_idr, kind, is_active, deleted_at, created_at, updated_at) FROM stdin;
22acfa6a-a075-4b53-b352-f0d872cff45e	d386f531-8958-4f51-a19a-1e8c929fb61f	KPS-AREN-ICE	Es Kopi Susu Gula Aren	Kopi Susu	22000	made_to_order	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
1f34ffff-a2fb-4700-993c-8494d54b55ed	d386f531-8958-4f51-a19a-1e8c929fb61f	KPS-KAMPUNG	Es Kopi Susu Tetangga	Kopi Susu	20000	made_to_order	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
a4dc5693-3234-4c80-b7f0-06437cb329fc	d386f531-8958-4f51-a19a-1e8c929fb61f	KPS-PANDAN	Es Kopi Susu Pandan	Kopi Susu	24000	made_to_order	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
cd8f694f-6f94-43de-8f06-f47e353177df	d386f531-8958-4f51-a19a-1e8c929fb61f	ESP-AMR-ICE	Iced Americano	Espresso Based	18000	made_to_order	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
20c5195e-4b60-41bb-b7ac-60bfdf4d27f6	d386f531-8958-4f51-a19a-1e8c929fb61f	ESP-AMR-HOT	Hot Americano	Espresso Based	18000	made_to_order	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
1240eabc-8ad3-4997-94ce-a0e47fe8b287	d386f531-8958-4f51-a19a-1e8c929fb61f	ESP-LAT-ICE	Iced Caffè Latte	Espresso Based	25000	made_to_order	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
65dcd6d6-ca16-4226-813e-8c0d4a1e8973	d386f531-8958-4f51-a19a-1e8c929fb61f	ESP-CAP-HOT	Hot Cappuccino	Espresso Based	25000	made_to_order	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
801ed174-f1c9-4f74-bdd6-9660998e89d8	d386f531-8958-4f51-a19a-1e8c929fb61f	ESP-CRM-MAC	Caramel Macchiato	Espresso Based	28000	made_to_order	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
65477f76-d36a-4d49-8bc3-d5af30daab33	d386f531-8958-4f51-a19a-1e8c929fb61f	ESP-HZL-LAT	Hazelnut Latte	Espresso Based	27000	made_to_order	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
abe056e4-e329-4c32-92bc-bbfcd02d2cba	d386f531-8958-4f51-a19a-1e8c929fb61f	ESP-TUBRUK	Kopi Tubruk Nusantara	Espresso Based	12000	made_to_order	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
9127d050-f08d-4201-8fff-2ba3bf095b6d	d386f531-8958-4f51-a19a-1e8c929fb61f	NON-MTC-LAT	Matcha Latte	Non-Kopi	26000	made_to_order	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
00b615fe-3b78-4fa4-9e15-ac8b5c9f8b0a	d386f531-8958-4f51-a19a-1e8c929fb61f	NON-CHC-SIG	Chocolate Signature	Non-Kopi	24000	made_to_order	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
37d4f801-7397-4df8-a137-be62bccac06a	d386f531-8958-4f51-a19a-1e8c929fb61f	NON-RDV-LAT	Red Velvet Latte	Non-Kopi	25000	made_to_order	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
5536aaa5-4c91-491c-b248-cd19f7455e5f	d386f531-8958-4f51-a19a-1e8c929fb61f	NON-LYC-TEA	Iced Lychee Tea	Non-Kopi	20000	made_to_order	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
d523c6a3-6520-4698-af96-dafd5eab5828	d386f531-8958-4f51-a19a-1e8c929fb61f	NON-TEH-TRK	Es Teh Tarik	Non-Kopi	18000	made_to_order	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
80098c63-3261-4db2-8a01-5d0df876e2b6	d386f531-8958-4f51-a19a-1e8c929fb61f	SNK-CROISSANT	Croissant Butter	Pastry & Snack	22000	finished_good	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
1ca0ff6b-a5da-4bde-8985-e666d97c4e4e	d386f531-8958-4f51-a19a-1e8c929fb61f	SNK-PAIN-CHC	Pain au Chocolat	Pastry & Snack	25000	finished_good	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
85703706-86b5-4e57-88e4-74f06f3e60d6	d386f531-8958-4f51-a19a-1e8c929fb61f	SNK-ROTI-BKR	Roti Bakar Cokelat Keju	Pastry & Snack	20000	finished_good	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
aeb29adc-7708-4735-be9c-1b8079a0c389	d386f531-8958-4f51-a19a-1e8c929fb61f	SNK-KENTANG	Kentang Goreng (French Fries)	Pastry & Snack	18000	finished_good	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
6517e025-e141-4a2f-adc7-d64ed3ad75ce	d386f531-8958-4f51-a19a-1e8c929fb61f	SNK-DONAT-GUL	Donat Kampung Gula Halus	Pastry & Snack	10000	finished_good	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
f7c3a534-8a1c-4e2a-8454-0896e497c0af	d386f531-8958-4f51-a19a-1e8c929fb61f	BTL-AREN-1L	Kopi Susu Gula Aren 1 Liter	Botolan 1L	75000	made_to_order	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
\.


--
-- Data for Name: recipe_lines; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.recipe_lines (id, organization_id, product_id, component_type, component_id, qty, sort_order) FROM stdin;
fcc69573-ae12-4177-902e-2b48fc32f0c9	d386f531-8958-4f51-a19a-1e8c929fb61f	22acfa6a-a075-4b53-b352-f0d872cff45e	ingredient	3cd43dc7-06f1-418d-878f-7886effe682a	18.0000	0
57d4ae46-12b8-4380-ad4f-62faf1592fd1	d386f531-8958-4f51-a19a-1e8c929fb61f	22acfa6a-a075-4b53-b352-f0d872cff45e	ingredient	d21b3b4c-0aef-42d6-8abb-079bbe0c5d36	130.0000	1
758cdd48-15ec-4fd3-a89f-01a6301fb7b0	d386f531-8958-4f51-a19a-1e8c929fb61f	22acfa6a-a075-4b53-b352-f0d872cff45e	ingredient	21200b32-c3e7-4027-874a-89df89094592	30.0000	2
80cd5150-1f8e-4336-af14-bdb6ee2b3f1b	d386f531-8958-4f51-a19a-1e8c929fb61f	22acfa6a-a075-4b53-b352-f0d872cff45e	ingredient	203c700a-d041-4d48-9a83-3dc90992033f	1.0000	3
4dc6de15-3430-442e-977f-bf829358a48d	d386f531-8958-4f51-a19a-1e8c929fb61f	1f34ffff-a2fb-4700-993c-8494d54b55ed	ingredient	2ee96152-24f7-4fb0-af9d-4bff4226f70a	18.0000	0
2b7a0744-ab29-4b68-a677-7adbf132e1fa	d386f531-8958-4f51-a19a-1e8c929fb61f	1f34ffff-a2fb-4700-993c-8494d54b55ed	ingredient	d21b3b4c-0aef-42d6-8abb-079bbe0c5d36	120.0000	1
b154aeb5-891b-4847-a6f3-1def2519a692	d386f531-8958-4f51-a19a-1e8c929fb61f	1f34ffff-a2fb-4700-993c-8494d54b55ed	ingredient	30977920-907a-49b6-9962-24380acc8453	25.0000	2
d208a93f-cb19-41b8-bf3b-14c129c77723	d386f531-8958-4f51-a19a-1e8c929fb61f	1f34ffff-a2fb-4700-993c-8494d54b55ed	ingredient	203c700a-d041-4d48-9a83-3dc90992033f	1.0000	3
9c63ed87-44c9-46a1-80b5-1141319429f6	d386f531-8958-4f51-a19a-1e8c929fb61f	a4dc5693-3234-4c80-b7f0-06437cb329fc	ingredient	3cd43dc7-06f1-418d-878f-7886effe682a	18.0000	0
c61399b7-ff28-4356-af1a-737f402c475b	d386f531-8958-4f51-a19a-1e8c929fb61f	a4dc5693-3234-4c80-b7f0-06437cb329fc	ingredient	d21b3b4c-0aef-42d6-8abb-079bbe0c5d36	130.0000	1
da434214-d5b3-4e23-8b58-49bc633c590f	d386f531-8958-4f51-a19a-1e8c929fb61f	a4dc5693-3234-4c80-b7f0-06437cb329fc	ingredient	d511acd8-295e-4bbc-8ab3-990348ede8f2	20.0000	2
8d5c7206-8379-420e-a110-271ad303f5dd	d386f531-8958-4f51-a19a-1e8c929fb61f	a4dc5693-3234-4c80-b7f0-06437cb329fc	ingredient	203c700a-d041-4d48-9a83-3dc90992033f	1.0000	3
93855384-49d0-4ac1-ae02-6eeec78cd823	d386f531-8958-4f51-a19a-1e8c929fb61f	cd8f694f-6f94-43de-8f06-f47e353177df	ingredient	3cd43dc7-06f1-418d-878f-7886effe682a	18.0000	0
52827549-5983-4b4d-bbcc-4d28b2ad98ae	d386f531-8958-4f51-a19a-1e8c929fb61f	cd8f694f-6f94-43de-8f06-f47e353177df	ingredient	203c700a-d041-4d48-9a83-3dc90992033f	1.0000	1
ffc651eb-ef5c-4898-82d6-38a3ae35f246	d386f531-8958-4f51-a19a-1e8c929fb61f	20c5195e-4b60-41bb-b7ac-60bfdf4d27f6	ingredient	3cd43dc7-06f1-418d-878f-7886effe682a	18.0000	0
53e3fdd5-87b8-41c8-b74a-5319186b671b	d386f531-8958-4f51-a19a-1e8c929fb61f	20c5195e-4b60-41bb-b7ac-60bfdf4d27f6	ingredient	4ec4379b-3a1a-43ab-a642-f06ca6eae811	1.0000	1
cd79c34d-2686-40b3-9701-aee619fb9f04	d386f531-8958-4f51-a19a-1e8c929fb61f	1240eabc-8ad3-4997-94ce-a0e47fe8b287	ingredient	3cd43dc7-06f1-418d-878f-7886effe682a	18.0000	0
d4528e6f-1ee4-4c5e-873f-ddc14ab70c1e	d386f531-8958-4f51-a19a-1e8c929fb61f	1240eabc-8ad3-4997-94ce-a0e47fe8b287	ingredient	d21b3b4c-0aef-42d6-8abb-079bbe0c5d36	160.0000	1
aa1ef693-8c53-4e49-94ec-c45863ef6c2b	d386f531-8958-4f51-a19a-1e8c929fb61f	1240eabc-8ad3-4997-94ce-a0e47fe8b287	ingredient	203c700a-d041-4d48-9a83-3dc90992033f	1.0000	2
5b93f906-11c6-45e0-9453-6c050b179846	d386f531-8958-4f51-a19a-1e8c929fb61f	65dcd6d6-ca16-4226-813e-8c0d4a1e8973	ingredient	3cd43dc7-06f1-418d-878f-7886effe682a	18.0000	0
2013344d-81df-45be-9773-fe1c783f0472	d386f531-8958-4f51-a19a-1e8c929fb61f	65dcd6d6-ca16-4226-813e-8c0d4a1e8973	ingredient	d21b3b4c-0aef-42d6-8abb-079bbe0c5d36	150.0000	1
76e782f4-9dac-40d0-87d2-c184da6fd630	d386f531-8958-4f51-a19a-1e8c929fb61f	65dcd6d6-ca16-4226-813e-8c0d4a1e8973	ingredient	4ec4379b-3a1a-43ab-a642-f06ca6eae811	1.0000	2
fe0b782e-2846-4aec-be5d-352e8c7afd50	d386f531-8958-4f51-a19a-1e8c929fb61f	801ed174-f1c9-4f74-bdd6-9660998e89d8	ingredient	3cd43dc7-06f1-418d-878f-7886effe682a	18.0000	0
4b34f243-bc67-4435-85f1-cc786d0cad63	d386f531-8958-4f51-a19a-1e8c929fb61f	801ed174-f1c9-4f74-bdd6-9660998e89d8	ingredient	d21b3b4c-0aef-42d6-8abb-079bbe0c5d36	150.0000	1
7ef6fd91-608b-4d01-8a37-61fbf403267a	d386f531-8958-4f51-a19a-1e8c929fb61f	801ed174-f1c9-4f74-bdd6-9660998e89d8	ingredient	86f47dd1-2ed3-4db2-8b07-f38c3685102a	25.0000	2
9794b58e-75a3-4bce-8839-14e919f6e652	d386f531-8958-4f51-a19a-1e8c929fb61f	801ed174-f1c9-4f74-bdd6-9660998e89d8	ingredient	203c700a-d041-4d48-9a83-3dc90992033f	1.0000	3
f3fa64c3-c3d3-450e-aee1-73da73c46702	d386f531-8958-4f51-a19a-1e8c929fb61f	65477f76-d36a-4d49-8bc3-d5af30daab33	ingredient	3cd43dc7-06f1-418d-878f-7886effe682a	18.0000	0
09909d3d-3731-4a50-801f-483a95d545ae	d386f531-8958-4f51-a19a-1e8c929fb61f	65477f76-d36a-4d49-8bc3-d5af30daab33	ingredient	d21b3b4c-0aef-42d6-8abb-079bbe0c5d36	150.0000	1
bd5fcfd1-ccd8-49c4-958d-fb21c2798669	d386f531-8958-4f51-a19a-1e8c929fb61f	65477f76-d36a-4d49-8bc3-d5af30daab33	ingredient	cd8a5b22-9372-44e9-812e-b454cfd96044	20.0000	2
b30abe50-d0fe-4242-831b-835402f145f4	d386f531-8958-4f51-a19a-1e8c929fb61f	65477f76-d36a-4d49-8bc3-d5af30daab33	ingredient	203c700a-d041-4d48-9a83-3dc90992033f	1.0000	3
98869426-5b58-4e56-a5a6-d0b48384402a	d386f531-8958-4f51-a19a-1e8c929fb61f	abe056e4-e329-4c32-92bc-bbfcd02d2cba	ingredient	2ee96152-24f7-4fb0-af9d-4bff4226f70a	15.0000	0
13e4deb6-fb1a-4401-b54d-2f769686cb8d	d386f531-8958-4f51-a19a-1e8c929fb61f	abe056e4-e329-4c32-92bc-bbfcd02d2cba	ingredient	4ec4379b-3a1a-43ab-a642-f06ca6eae811	1.0000	1
eb322cf5-a443-405e-b31d-c3494141fd31	d386f531-8958-4f51-a19a-1e8c929fb61f	9127d050-f08d-4201-8fff-2ba3bf095b6d	ingredient	6e5e1e91-e799-4880-9699-49271f913b93	20.0000	0
33ea2d54-314d-4cda-a4f3-4ee964d724f8	d386f531-8958-4f51-a19a-1e8c929fb61f	9127d050-f08d-4201-8fff-2ba3bf095b6d	ingredient	d21b3b4c-0aef-42d6-8abb-079bbe0c5d36	160.0000	1
f45b5d04-4188-4cf6-a92e-185b03b8a3b2	d386f531-8958-4f51-a19a-1e8c929fb61f	9127d050-f08d-4201-8fff-2ba3bf095b6d	ingredient	203c700a-d041-4d48-9a83-3dc90992033f	1.0000	2
06e7b88b-7dc1-44c5-b31a-547c2fad7d08	d386f531-8958-4f51-a19a-1e8c929fb61f	00b615fe-3b78-4fa4-9e15-ac8b5c9f8b0a	ingredient	6751c0ea-72d4-41e8-8b42-620a06614638	25.0000	0
220bd15a-c146-4c69-b301-c1fe3d2b5450	d386f531-8958-4f51-a19a-1e8c929fb61f	00b615fe-3b78-4fa4-9e15-ac8b5c9f8b0a	ingredient	d21b3b4c-0aef-42d6-8abb-079bbe0c5d36	160.0000	1
0f342ae8-c0b7-4a8d-abd0-7f3789015aa6	d386f531-8958-4f51-a19a-1e8c929fb61f	00b615fe-3b78-4fa4-9e15-ac8b5c9f8b0a	ingredient	203c700a-d041-4d48-9a83-3dc90992033f	1.0000	2
c0033a08-b690-4a9d-9bc1-cbce66a996d3	d386f531-8958-4f51-a19a-1e8c929fb61f	37d4f801-7397-4df8-a137-be62bccac06a	ingredient	fa31cfed-1a56-43b4-847b-f7b91845037d	25.0000	0
2fb85a0a-f333-42c0-8349-49f3cf09fbcb	d386f531-8958-4f51-a19a-1e8c929fb61f	37d4f801-7397-4df8-a137-be62bccac06a	ingredient	d21b3b4c-0aef-42d6-8abb-079bbe0c5d36	160.0000	1
9df29787-b662-4505-84a7-4aa661bac392	d386f531-8958-4f51-a19a-1e8c929fb61f	37d4f801-7397-4df8-a137-be62bccac06a	ingredient	203c700a-d041-4d48-9a83-3dc90992033f	1.0000	2
1f32eeca-305f-4e2d-8870-279587195676	d386f531-8958-4f51-a19a-1e8c929fb61f	5536aaa5-4c91-491c-b248-cd19f7455e5f	ingredient	893b2431-58c2-4c28-b1d7-300ccbfcfcad	5.0000	0
211ebe5c-56d3-46c3-b633-206a9c99ab26	d386f531-8958-4f51-a19a-1e8c929fb61f	5536aaa5-4c91-491c-b248-cd19f7455e5f	ingredient	33955c07-1264-49a4-bd88-b0c5b973692d	30.0000	1
b8ecd2c4-dffb-49f8-8b1d-c67b7c8921dd	d386f531-8958-4f51-a19a-1e8c929fb61f	5536aaa5-4c91-491c-b248-cd19f7455e5f	ingredient	203c700a-d041-4d48-9a83-3dc90992033f	1.0000	2
da2f76d7-be99-4228-ae96-a758827e9e33	d386f531-8958-4f51-a19a-1e8c929fb61f	d523c6a3-6520-4698-af96-dafd5eab5828	ingredient	893b2431-58c2-4c28-b1d7-300ccbfcfcad	6.0000	0
a76ae837-0954-4b6d-b7b1-a0b285515e9f	d386f531-8958-4f51-a19a-1e8c929fb61f	d523c6a3-6520-4698-af96-dafd5eab5828	ingredient	8dcef40e-ea8d-4865-aaf4-65c99cb0be8d	40.0000	1
3d25dc0a-0481-42b9-a375-aa8a387eccb8	d386f531-8958-4f51-a19a-1e8c929fb61f	d523c6a3-6520-4698-af96-dafd5eab5828	ingredient	30977920-907a-49b6-9962-24380acc8453	25.0000	2
2b66a375-4622-4fb6-ad13-81b1021e1b81	d386f531-8958-4f51-a19a-1e8c929fb61f	d523c6a3-6520-4698-af96-dafd5eab5828	ingredient	203c700a-d041-4d48-9a83-3dc90992033f	1.0000	3
1fee5bbf-e372-4ee9-8ffd-6cc405d63ee5	d386f531-8958-4f51-a19a-1e8c929fb61f	f7c3a534-8a1c-4e2a-8454-0896e497c0af	ingredient	3cd43dc7-06f1-418d-878f-7886effe682a	72.0000	0
b6e05397-f2bb-46f2-954d-288ffb48682f	d386f531-8958-4f51-a19a-1e8c929fb61f	f7c3a534-8a1c-4e2a-8454-0896e497c0af	ingredient	d21b3b4c-0aef-42d6-8abb-079bbe0c5d36	650.0000	1
bafc4b04-31c7-491b-93de-5ca492265d40	d386f531-8958-4f51-a19a-1e8c929fb61f	f7c3a534-8a1c-4e2a-8454-0896e497c0af	ingredient	21200b32-c3e7-4027-874a-89df89094592	120.0000	2
0028fa79-8ffa-495c-905f-5b088dbc5eee	d386f531-8958-4f51-a19a-1e8c929fb61f	f7c3a534-8a1c-4e2a-8454-0896e497c0af	ingredient	caf11bd1-6984-429a-9695-521926dcb6b2	1.0000	3
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.refresh_tokens (id, user_id, organization_id, token_hash, expires_at, revoked_at, user_agent, ip, last_used_at, created_at) FROM stdin;
dd49e4ac-d59e-4b7a-871c-2b5a4803cf8b	dd850293-0b37-4dd2-9020-40974d9c6eb3	d386f531-8958-4f51-a19a-1e8c929fb61f	c5bc25f8d8dc399ad836b749ddce425814e39468d9e5a125081c88629098fff9	2026-12-15 13:50:30.916+00	2026-11-15 14:12:34.401+00	\N	\N	\N	2026-11-15 13:50:30.920324+00
3dda631d-c916-4719-87e3-219c42efcd3e	dd850293-0b37-4dd2-9020-40974d9c6eb3	d386f531-8958-4f51-a19a-1e8c929fb61f	5ab692a4aeaeb8b8928e4e4ac3839d74e44e2c533c662cb386325324641d4bbc	2026-11-16 02:12:34.432+00	\N	\N	\N	\N	2026-11-15 14:12:34.435044+00
\.


--
-- Data for Name: registrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.registrations (id, user_id, onboarding_token_hash, onboarding_expires_at, completed_at, created_at) FROM stdin;
\.


--
-- Data for Name: sale_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sale_items (id, organization_id, sale_id, product_id, name_snapshot, qty, unit_price_idr, line_total_idr, unit_cogs_idr, line_cogs_idr) FROM stdin;
\.


--
-- Data for Name: sales; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sales (id, organization_id, outlet_id, warehouse_id, no_nota, sold_at, cashier_user_id, cashier_staff_id, cash_shift_id, order_type, payment_method, customer_name, subtotal_idr, discount_idr, tax_idr, total_idr, cogs_idr, status, cancelled_at, cancelled_by_user_id, created_at) FROM stdin;
\.


--
-- Data for Name: staff; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff (id, organization_id, outlet_id, user_id, name, staff_role, phone, email, employment_type, joined_on, base_salary_idr, allowance_idr, current_shift_label, rating_score, is_active, deleted_at, created_at, updated_at) FROM stdin;
f9280b57-6684-4110-b253-bd4656b66e45	d386f531-8958-4f51-a19a-1e8c929fb61f	927ad659-4f37-4c44-b779-8947f38a3594	dd850293-0b37-4dd2-9020-40974d9c6eb3	Budi Santoso	cashier	081234567890	kasir@teratur.id	full_time	2026-01-01	3500000	500000	Pagi	5.0	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
e1e930fc-85de-4abf-86c5-ce92ea5c6099	d386f531-8958-4f51-a19a-1e8c929fb61f	927ad659-4f37-4c44-b779-8947f38a3594	\N	Siti Aminah	head_barista	081298765432	\N	full_time	2026-01-15	4000000	500000	Pagi	5.0	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
\.


--
-- Data for Name: stock_movements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stock_movements (id, organization_id, outlet_id, warehouse_id, item_type, item_id, type, qty, unit_cost, amount_idr, ref_type, ref_id, notes, actor_user_id, occurred_at, created_at) FROM stdin;
\.


--
-- Data for Name: stock_opnames; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stock_opnames (id, organization_id, outlet_id, warehouse_id, item_type, item_id, system_qty, physical_qty, variance_qty, uom, notes, status, actor_user_id, approved_by_user_id, created_at, decided_at) FROM stdin;
\.


--
-- Data for Name: stock_transfer_lines; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stock_transfer_lines (id, organization_id, transfer_id, item_type, item_id, qty, uom, unit_cost) FROM stdin;
\.


--
-- Data for Name: stock_transfers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stock_transfers (id, organization_id, no_transfer, from_warehouse_id, to_warehouse_id, status, actor_user_id, notes, created_at, completed_at, cancelled_at) FROM stdin;
\.


--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.subscriptions (id, organization_id, plan_code, status, trial_ends_at, current_period_end, outlet_limit, created_at, updated_at) FROM stdin;
6550285a-09fd-412f-a073-8a83b710c3ac	d386f531-8958-4f51-a19a-1e8c929fb61f	pro	active	\N	\N	5	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.suppliers (id, organization_id, name, phone, email, notes, is_active, deleted_at, created_at, updated_at) FROM stdin;
00ed7d18-c79f-4e5a-8f06-3fa38161f0c0	d386f531-8958-4f51-a19a-1e8c929fb61f	Roastery Nusantara Bandung	081122334455	order@roasterynusantara.id	Supplier biji kopi Arabika & Robusta	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
4bd613a0-0221-41af-8571-ffdf91600181	d386f531-8958-4f51-a19a-1e8c929fb61f	CV Segar Dairy & Sirup	081344556677	\N	Supplier susu UHT, gula aren, dan sirup	t	\N	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, full_name, email, phone, password_hash, avatar_url, job_title, status, email_verified_at, created_at, updated_at) FROM stdin;
dd850293-0b37-4dd2-9020-40974d9c6eb3	Budi Santoso	kasir@teratur.id	081234567890	$argon2id$v=19$m=19456,t=2,p=1$hArd98yLaXJXZyquo/WsQw$XE7FyhPlaamrWESq2fLUI+/QG0IrmT/HRYFfa9P7Xy0	\N	Owner / Kasir	active	2026-11-15 13:39:30.894+00	2026-11-15 13:39:30.893102+00	2026-11-15 13:39:30.893102+00
\.


--
-- Data for Name: warehouses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.warehouses (id, organization_id, outlet_id, name, code, is_default, created_at) FROM stdin;
e29cad10-c5a0-4c30-85f7-9de0ac9e4eaa	d386f531-8958-4f51-a19a-1e8c929fb61f	927ad659-4f37-4c44-b779-8947f38a3594	Gudang Utama	WH-01	t	2026-11-15 13:39:30.893102+00
\.


--
-- Data for Name: waste_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.waste_logs (id, organization_id, outlet_id, warehouse_id, item_type, item_id, qty, uom, reason, loss_idr, actor_user_id, created_at) FROM stdin;
\.


--
-- Name: ai_conversations ai_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_conversations
    ADD CONSTRAINT ai_conversations_pkey PRIMARY KEY (id);


--
-- Name: ai_messages ai_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_messages
    ADD CONSTRAINT ai_messages_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: cash_shifts cash_shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_shifts
    ADD CONSTRAINT cash_shifts_pkey PRIMARY KEY (id);


--
-- Name: daily_metrics daily_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_metrics
    ADD CONSTRAINT daily_metrics_pkey PRIMARY KEY (id);


--
-- Name: email_otps email_otps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_otps
    ADD CONSTRAINT email_otps_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: export_jobs export_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.export_jobs
    ADD CONSTRAINT export_jobs_pkey PRIMARY KEY (id);


--
-- Name: idempotency_keys idempotency_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.idempotency_keys
    ADD CONSTRAINT idempotency_keys_pkey PRIMARY KEY (id);


--
-- Name: ingredients ingredients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredients
    ADD CONSTRAINT ingredients_pkey PRIMARY KEY (id);


--
-- Name: inventory_balances inventory_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_balances
    ADD CONSTRAINT inventory_balances_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (user_id);


--
-- Name: organization_members organization_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: outlets outlets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outlets
    ADD CONSTRAINT outlets_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: payroll_stubs payroll_stubs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_stubs
    ADD CONSTRAINT payroll_stubs_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: recipe_lines recipe_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_lines
    ADD CONSTRAINT recipe_lines_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: registrations registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registrations
    ADD CONSTRAINT registrations_pkey PRIMARY KEY (id);


--
-- Name: sale_items sale_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_pkey PRIMARY KEY (id);


--
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (id);


--
-- Name: staff staff_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_pkey PRIMARY KEY (id);


--
-- Name: stock_movements stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);


--
-- Name: stock_opnames stock_opnames_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_opnames
    ADD CONSTRAINT stock_opnames_pkey PRIMARY KEY (id);


--
-- Name: stock_transfer_lines stock_transfer_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfer_lines
    ADD CONSTRAINT stock_transfer_lines_pkey PRIMARY KEY (id);


--
-- Name: stock_transfers stock_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT stock_transfers_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: warehouses warehouses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_pkey PRIMARY KEY (id);


--
-- Name: waste_logs waste_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waste_logs
    ADD CONSTRAINT waste_logs_pkey PRIMARY KEY (id);


--
-- Name: audit_logs_org_time_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_org_time_idx ON public.audit_logs USING btree (organization_id, created_at);


--
-- Name: cash_shifts_outlet_open_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cash_shifts_outlet_open_idx ON public.cash_shifts USING btree (outlet_id, status);


--
-- Name: daily_metrics_org_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX daily_metrics_org_date_idx ON public.daily_metrics USING btree (organization_id, date);


--
-- Name: daily_metrics_outlet_date_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX daily_metrics_outlet_date_uidx ON public.daily_metrics USING btree (outlet_id, date);


--
-- Name: doc_counters_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX doc_counters_uidx ON public.document_counters USING btree (organization_id, outlet_id, kind, yyyymmdd);


--
-- Name: email_otps_email_purpose_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_otps_email_purpose_idx ON public.email_otps USING btree (email, purpose);


--
-- Name: expenses_org_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX expenses_org_date_idx ON public.expenses USING btree (organization_id, date);


--
-- Name: expenses_outlet_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX expenses_outlet_date_idx ON public.expenses USING btree (outlet_id, date);


--
-- Name: idempotency_scope_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idempotency_scope_uidx ON public.idempotency_keys USING btree (organization_id, user_id, method, path, key);


--
-- Name: ingredients_org_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ingredients_org_name_idx ON public.ingredients USING btree (organization_id, name);


--
-- Name: ingredients_org_sku_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ingredients_org_sku_uidx ON public.ingredients USING btree (organization_id, sku);


--
-- Name: inv_bal_org_outlet_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inv_bal_org_outlet_idx ON public.inventory_balances USING btree (organization_id, outlet_id);


--
-- Name: inv_bal_wh_item_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX inv_bal_wh_item_uidx ON public.inventory_balances USING btree (warehouse_id, item_type, item_id);


--
-- Name: org_members_org_user_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX org_members_org_user_uidx ON public.organization_members USING btree (organization_id, user_id);


--
-- Name: org_members_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX org_members_user_idx ON public.organization_members USING btree (user_id);


--
-- Name: outlets_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX outlets_org_idx ON public.outlets USING btree (organization_id);


--
-- Name: password_reset_hash_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX password_reset_hash_uidx ON public.password_reset_tokens USING btree (token_hash);


--
-- Name: payroll_stubs_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payroll_stubs_org_idx ON public.payroll_stubs USING btree (organization_id, outlet_id);


--
-- Name: products_org_sku_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX products_org_sku_uidx ON public.products USING btree (organization_id, sku);


--
-- Name: recipe_lines_product_component_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX recipe_lines_product_component_uidx ON public.recipe_lines USING btree (product_id, component_type, component_id);


--
-- Name: recipe_lines_product_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX recipe_lines_product_idx ON public.recipe_lines USING btree (product_id);


--
-- Name: refresh_tokens_hash_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX refresh_tokens_hash_uidx ON public.refresh_tokens USING btree (token_hash);


--
-- Name: refresh_tokens_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX refresh_tokens_user_idx ON public.refresh_tokens USING btree (user_id);


--
-- Name: sales_org_outlet_nota_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sales_org_outlet_nota_uidx ON public.sales USING btree (organization_id, outlet_id, no_nota);


--
-- Name: sales_org_sold_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sales_org_sold_at_idx ON public.sales USING btree (organization_id, sold_at);


--
-- Name: sales_outlet_sold_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sales_outlet_sold_at_idx ON public.sales USING btree (outlet_id, sold_at);


--
-- Name: staff_org_outlet_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX staff_org_outlet_idx ON public.staff USING btree (organization_id, outlet_id);


--
-- Name: stock_movements_item_time_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stock_movements_item_time_idx ON public.stock_movements USING btree (organization_id, item_type, item_id, occurred_at);


--
-- Name: stock_movements_org_time_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stock_movements_org_time_idx ON public.stock_movements USING btree (organization_id, occurred_at);


--
-- Name: stock_movements_ref_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stock_movements_ref_idx ON public.stock_movements USING btree (ref_type, ref_id);


--
-- Name: stock_movements_wh_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stock_movements_wh_idx ON public.stock_movements USING btree (warehouse_id, occurred_at);


--
-- Name: stock_opnames_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stock_opnames_org_idx ON public.stock_opnames USING btree (organization_id, created_at);


--
-- Name: stock_transfers_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stock_transfers_org_idx ON public.stock_transfers USING btree (organization_id, created_at);


--
-- Name: stock_transfers_org_no_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX stock_transfers_org_no_uidx ON public.stock_transfers USING btree (organization_id, no_transfer);


--
-- Name: subscriptions_org_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX subscriptions_org_uidx ON public.subscriptions USING btree (organization_id);


--
-- Name: suppliers_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX suppliers_org_idx ON public.suppliers USING btree (organization_id);


--
-- Name: users_email_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_uidx ON public.users USING btree (email);


--
-- Name: warehouses_org_outlet_code_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX warehouses_org_outlet_code_uidx ON public.warehouses USING btree (organization_id, outlet_id, code);


--
-- Name: warehouses_outlet_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX warehouses_outlet_idx ON public.warehouses USING btree (outlet_id);


--
-- Name: waste_logs_org_time_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX waste_logs_org_time_idx ON public.waste_logs USING btree (organization_id, created_at);


--
-- Name: ai_conversations ai_conversations_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_conversations
    ADD CONSTRAINT ai_conversations_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: ai_conversations ai_conversations_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_conversations
    ADD CONSTRAINT ai_conversations_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: ai_messages ai_messages_conversation_id_ai_conversations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_messages
    ADD CONSTRAINT ai_messages_conversation_id_ai_conversations_id_fk FOREIGN KEY (conversation_id) REFERENCES public.ai_conversations(id);


--
-- Name: ai_messages ai_messages_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_messages
    ADD CONSTRAINT ai_messages_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: cash_shifts cash_shifts_opened_by_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_shifts
    ADD CONSTRAINT cash_shifts_opened_by_user_id_users_id_fk FOREIGN KEY (opened_by_user_id) REFERENCES public.users(id);


--
-- Name: cash_shifts cash_shifts_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_shifts
    ADD CONSTRAINT cash_shifts_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: cash_shifts cash_shifts_outlet_id_outlets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_shifts
    ADD CONSTRAINT cash_shifts_outlet_id_outlets_id_fk FOREIGN KEY (outlet_id) REFERENCES public.outlets(id);


--
-- Name: cash_shifts cash_shifts_staff_id_staff_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_shifts
    ADD CONSTRAINT cash_shifts_staff_id_staff_id_fk FOREIGN KEY (staff_id) REFERENCES public.staff(id);


--
-- Name: email_otps email_otps_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_otps
    ADD CONSTRAINT email_otps_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: expenses expenses_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: expenses expenses_outlet_id_outlets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_outlet_id_outlets_id_fk FOREIGN KEY (outlet_id) REFERENCES public.outlets(id);


--
-- Name: expenses expenses_supplier_id_suppliers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_supplier_id_suppliers_id_fk FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: ingredients ingredients_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredients
    ADD CONSTRAINT ingredients_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: ingredients ingredients_supplier_id_suppliers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredients
    ADD CONSTRAINT ingredients_supplier_id_suppliers_id_fk FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: inventory_balances inventory_balances_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_balances
    ADD CONSTRAINT inventory_balances_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: inventory_balances inventory_balances_outlet_id_outlets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_balances
    ADD CONSTRAINT inventory_balances_outlet_id_outlets_id_fk FOREIGN KEY (outlet_id) REFERENCES public.outlets(id);


--
-- Name: inventory_balances inventory_balances_warehouse_id_warehouses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_balances
    ADD CONSTRAINT inventory_balances_warehouse_id_warehouses_id_fk FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: notification_preferences notification_preferences_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: notification_preferences notification_preferences_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: organization_members organization_members_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: organization_members organization_members_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: outlets outlets_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outlets
    ADD CONSTRAINT outlets_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: password_reset_tokens password_reset_tokens_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: payroll_stubs payroll_stubs_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_stubs
    ADD CONSTRAINT payroll_stubs_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: payroll_stubs payroll_stubs_outlet_id_outlets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_stubs
    ADD CONSTRAINT payroll_stubs_outlet_id_outlets_id_fk FOREIGN KEY (outlet_id) REFERENCES public.outlets(id);


--
-- Name: payroll_stubs payroll_stubs_staff_id_staff_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_stubs
    ADD CONSTRAINT payroll_stubs_staff_id_staff_id_fk FOREIGN KEY (staff_id) REFERENCES public.staff(id);


--
-- Name: products products_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: recipe_lines recipe_lines_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_lines
    ADD CONSTRAINT recipe_lines_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: recipe_lines recipe_lines_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_lines
    ADD CONSTRAINT recipe_lines_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: refresh_tokens refresh_tokens_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: refresh_tokens refresh_tokens_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: registrations registrations_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registrations
    ADD CONSTRAINT registrations_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: sale_items sale_items_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: sale_items sale_items_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: sale_items sale_items_sale_id_sales_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_sale_id_sales_id_fk FOREIGN KEY (sale_id) REFERENCES public.sales(id);


--
-- Name: sales sales_cancelled_by_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_cancelled_by_user_id_users_id_fk FOREIGN KEY (cancelled_by_user_id) REFERENCES public.users(id);


--
-- Name: sales sales_cash_shift_id_cash_shifts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_cash_shift_id_cash_shifts_id_fk FOREIGN KEY (cash_shift_id) REFERENCES public.cash_shifts(id);


--
-- Name: sales sales_cashier_staff_id_staff_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_cashier_staff_id_staff_id_fk FOREIGN KEY (cashier_staff_id) REFERENCES public.staff(id);


--
-- Name: sales sales_cashier_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_cashier_user_id_users_id_fk FOREIGN KEY (cashier_user_id) REFERENCES public.users(id);


--
-- Name: sales sales_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: sales sales_outlet_id_outlets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_outlet_id_outlets_id_fk FOREIGN KEY (outlet_id) REFERENCES public.outlets(id);


--
-- Name: sales sales_warehouse_id_warehouses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_warehouse_id_warehouses_id_fk FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: staff staff_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: staff staff_outlet_id_outlets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_outlet_id_outlets_id_fk FOREIGN KEY (outlet_id) REFERENCES public.outlets(id);


--
-- Name: staff staff_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: stock_movements stock_movements_actor_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_actor_user_id_users_id_fk FOREIGN KEY (actor_user_id) REFERENCES public.users(id);


--
-- Name: stock_movements stock_movements_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: stock_movements stock_movements_outlet_id_outlets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_outlet_id_outlets_id_fk FOREIGN KEY (outlet_id) REFERENCES public.outlets(id);


--
-- Name: stock_movements stock_movements_warehouse_id_warehouses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_warehouse_id_warehouses_id_fk FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: stock_opnames stock_opnames_actor_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_opnames
    ADD CONSTRAINT stock_opnames_actor_user_id_users_id_fk FOREIGN KEY (actor_user_id) REFERENCES public.users(id);


--
-- Name: stock_opnames stock_opnames_approved_by_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_opnames
    ADD CONSTRAINT stock_opnames_approved_by_user_id_users_id_fk FOREIGN KEY (approved_by_user_id) REFERENCES public.users(id);


--
-- Name: stock_opnames stock_opnames_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_opnames
    ADD CONSTRAINT stock_opnames_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: stock_opnames stock_opnames_outlet_id_outlets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_opnames
    ADD CONSTRAINT stock_opnames_outlet_id_outlets_id_fk FOREIGN KEY (outlet_id) REFERENCES public.outlets(id);


--
-- Name: stock_opnames stock_opnames_warehouse_id_warehouses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_opnames
    ADD CONSTRAINT stock_opnames_warehouse_id_warehouses_id_fk FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: stock_transfer_lines stock_transfer_lines_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfer_lines
    ADD CONSTRAINT stock_transfer_lines_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: stock_transfer_lines stock_transfer_lines_transfer_id_stock_transfers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfer_lines
    ADD CONSTRAINT stock_transfer_lines_transfer_id_stock_transfers_id_fk FOREIGN KEY (transfer_id) REFERENCES public.stock_transfers(id);


--
-- Name: stock_transfers stock_transfers_actor_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT stock_transfers_actor_user_id_users_id_fk FOREIGN KEY (actor_user_id) REFERENCES public.users(id);


--
-- Name: stock_transfers stock_transfers_from_warehouse_id_warehouses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT stock_transfers_from_warehouse_id_warehouses_id_fk FOREIGN KEY (from_warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: stock_transfers stock_transfers_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT stock_transfers_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: stock_transfers stock_transfers_to_warehouse_id_warehouses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT stock_transfers_to_warehouse_id_warehouses_id_fk FOREIGN KEY (to_warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: subscriptions subscriptions_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: suppliers suppliers_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: warehouses warehouses_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: warehouses warehouses_outlet_id_outlets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_outlet_id_outlets_id_fk FOREIGN KEY (outlet_id) REFERENCES public.outlets(id);


--
-- Name: waste_logs waste_logs_actor_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waste_logs
    ADD CONSTRAINT waste_logs_actor_user_id_users_id_fk FOREIGN KEY (actor_user_id) REFERENCES public.users(id);


--
-- Name: waste_logs waste_logs_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waste_logs
    ADD CONSTRAINT waste_logs_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: waste_logs waste_logs_outlet_id_outlets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waste_logs
    ADD CONSTRAINT waste_logs_outlet_id_outlets_id_fk FOREIGN KEY (outlet_id) REFERENCES public.outlets(id);


--
-- Name: waste_logs waste_logs_warehouse_id_warehouses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waste_logs
    ADD CONSTRAINT waste_logs_warehouse_id_warehouses_id_fk FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- PostgreSQL database dump complete
--

\unrestrict Al1zJWQZRypkybMZDb4GlEIxuOStBgT3FHigJ6PrpqLAgAC8AyqeJvUgOGgdmel

