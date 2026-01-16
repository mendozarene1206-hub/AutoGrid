-- Migration: Add missing tables for AutoGrid Core
-- 1. USER PROFILES (Para gestión de roles)
create table if not exists public.user_profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  role text check (role in ('admin', 'resident', 'manager', 'inspector', 'client')) default 'resident',
  updated_at timestamptz default now()
);

-- 2. CATALOG CONCEPTS (La Verdad: Precios Unitarios y Volúmenes de Contrato)
create table if not exists public.catalog_concepts (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null, -- Ej: "5.2.4.1"
  description text,
  unit text, -- m2, m3, kg, etc.
  unit_price numeric not null default 0,
  total_volume numeric not null default 0,
  category text, -- Preliminares, Cimentación, etc.
  created_at timestamptz default now()
);

-- 3. EVIDENCE FILES (Vincular fotos/croquis a partidas)
create table if not exists public.evidence_files (
  id uuid primary key default uuid_generate_v4(),
  spreadsheet_id uuid references public.spreadsheets(id) on delete cascade,
  file_path text not null, -- URL en el bucket de storage
  row_index integer, -- A qué fila de la grilla pertenece
  description text,
  uploaded_at timestamptz default now()
);

-- RLS POLICIES
alter table public.user_profiles enable row level security;
alter table public.catalog_concepts enable row level security;
alter table public.evidence_files enable row level security;

-- Políticas básicas (Lectura para autenticados)
create policy "Authenticated users can view profiles" on public.user_profiles for select using (auth.role() = 'authenticated');
create policy "Authenticated users can view catalog" on public.catalog_concepts for select using (auth.role() = 'authenticated');
create policy "Users can view evidence of their spreadsheets" on public.evidence_files for select using (
    exists (select 1 from public.spreadsheets where id = evidence_files.spreadsheet_id and user_id = auth.uid())
);

-- Trigger para crear perfil automáticamente al registrarse un usuario
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'resident');
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
