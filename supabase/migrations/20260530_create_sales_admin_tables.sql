create extension if not exists pgcrypto;

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'shopify_csv',
  external_order_id text not null,
  external_order_name text,
  customer_name text,
  customer_email text,
  customer_phone text,
  city text,
  region text,
  financial_status text not null default 'unknown',
  fulfillment_status text not null default 'unfulfilled',
  payment_method text,
  payment_reference text,
  subtotal_amount numeric not null default 0,
  shipping_amount numeric not null default 0,
  tax_amount numeric not null default 0,
  total_amount numeric not null default 0,
  created_at_shopify timestamptz,
  paid_at timestamptz,
  notes text,
  risk_level text,
  invoice_status text not null default 'pendiente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, external_order_id)
);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_name text not null,
  sku text,
  quantity integer not null default 1,
  unit_price numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  status text not null default 'pendiente',
  declared_amount numeric,
  payment_reference text,
  review_notes text,
  approved_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sale_id)
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  provider text not null default 'lioren',
  document_type text,
  folio text,
  pdf_url text,
  status text not null default 'pendiente',
  error_message text,
  issued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sale_id)
);

create index if not exists idx_sales_source_order on public.sales(source, external_order_id);
create index if not exists idx_sales_financial_status on public.sales(financial_status);
create index if not exists idx_sales_fulfillment_status on public.sales(fulfillment_status);
create index if not exists idx_sales_invoice_status on public.sales(invoice_status);
create index if not exists idx_sales_created_at_shopify on public.sales(created_at_shopify desc);
create index if not exists idx_sale_items_sale_id on public.sale_items(sale_id);
create index if not exists idx_payment_proofs_sale_id on public.payment_proofs(sale_id);
create index if not exists idx_invoices_sale_id on public.invoices(sale_id);

alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.payment_proofs enable row level security;
alter table public.invoices enable row level security;

-- MVP interno: el backend usa SUPABASE_SERVICE_ROLE_KEY desde Railway.
-- No se crean policies públicas para evitar exposición directa desde navegador.
