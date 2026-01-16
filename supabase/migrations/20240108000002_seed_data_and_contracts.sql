-- Migration: Create Projects, Contracts structure and Seed Data

-- Ensure uuid-ossp extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create missing tables
create table if not exists public.projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  location text,
  start_date date,
  created_at timestamptz default now()
);

create table if not exists public.contracts (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects(id) on delete cascade,
  contract_number text not null,
  contract_amount numeric not null default 0,
  down_payment_pct numeric default 0,
  guarantee_fund_pct numeric default 0,
  created_at timestamptz default now()
);

-- 2. Modify catalog_concepts to link to contracts (if not already linked)
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'catalog_concepts' and column_name = 'contract_id') then
        alter table public.catalog_concepts add column contract_id uuid references public.contracts(id);
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'catalog_concepts' and column_name = 'category') then
        alter table public.catalog_concepts add column category text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'catalog_concepts' and column_name = 'total_volume') then
        alter table public.catalog_concepts add column total_volume numeric default 0;
    end if;
end $$;

-- Enable RLS for new tables
alter table public.projects enable row level security;
alter table public.contracts enable row level security;

create policy "Authenticated users can view projects" on public.projects for select using (auth.role() = 'authenticated');
create policy "Authenticated users can view contracts" on public.contracts for select using (auth.role() = 'authenticated');


-- 3. SEED DATA (Cleaned and adapted script)
-- Note: We use a DO block to handle variables instead of CTEs for complex multi-step inserts if needed, 
-- but your CTE approach is clean. We just need to ensure catalog_concepts is ready.

WITH new_project AS (
  INSERT INTO public.projects (name, location, start_date)
  VALUES ('PROYECTO SUMMYT', 'Av. Paseo de los Leones 2529, Mty', '2025-01-01')
  RETURNING id
),
new_contract AS (
  INSERT INTO public.contracts (project_id, contract_number, contract_amount, down_payment_pct, guarantee_fund_pct)
  SELECT id, 'CTR-SUMMYT-001', 105000000.00, 0.10, 0.05
  FROM new_project
  RETURNING id
)
INSERT INTO public.catalog_concepts (contract_id, code, description, unit, unit_price, total_volume, category)
SELECT 
  nc.id as contract_id, 
  d.code, 
  d.description, 
  d.unit, 
  d.unit_price, 
  d.contracted_quantity,
  'Albañilería' -- Default category
FROM new_contract nc, (VALUES 
  ('5.2.4.6', 'Construcción de muro elevador MC1 (según diseño estructural), f''c= 350 kg/cm2. Incluye: cimbra aparente, bombeo.', 'PZ', 15000.00, 15.00),
  ('5.2.5.9', 'Firme de 12 cms espesor reforzado con malla 66/66, concreto f''c= 250 kg/cm2, acabado pulido.', 'M2', 450.00, 5000.00),
  ('5.2.4.2', 'Construcción de columnas N3 a N4, acero fy=4200, concreto f''c=350. Incluye descimbrado.', 'LOTE', 85000.00, 1.00),
  ('5.2.5.19', 'Construcción de Escaleras (según plano), concreto f''c= 250 kg/cm2.', 'PZ', 12500.00, 20.00)
) AS d(code, description, unit, unit_price, contracted_quantity);
