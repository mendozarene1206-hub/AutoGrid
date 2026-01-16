-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. ENUMS
create type spreadsheet_status as enum (
  'draft',
  'in_review',
  'changes_requested',
  'approved_internal',
  'signed'
);

-- 2. TABLES

-- Spreadsheets Table
create table public.spreadsheets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null default auth.uid(),
  status spreadsheet_status not null default 'draft',
  raw_data jsonb not null default '{}'::jsonb,
  ai_context_summary jsonb not null default '{}'::jsonb,
  docusign_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Signatures Table (Immutable Audit Log)
create table public.signatures (
  id uuid primary key default uuid_generate_v4(),
  spreadsheet_id uuid references public.spreadsheets(id) not null,
  signer_id uuid references auth.users(id) not null,
  snapshot_hash text not null,
  role text not null check (role in ('Resident', 'Manager')),
  signed_at timestamptz not null default now()
);

-- 3. RLS POLICIES

alter table public.spreadsheets enable row level security;
alter table public.signatures enable row level security;

-- Policy 1: Users can only SELECT/INSERT/UPDATE their own rows (spreadsheets)
create policy "Users can view own spreadsheets"
  on public.spreadsheets for select
  using (auth.uid() = user_id);

create policy "Users can insert own spreadsheets"
  on public.spreadsheets for insert
  with check (auth.uid() = user_id);

create policy "Users can update own spreadsheets"
  on public.spreadsheets for update
  using (auth.uid() = user_id);

-- Policy 2 (The "Lock"): UPDATE is strictly DENIED on spreadsheets if status is 'approved_internal' or 'signed'
-- We implement this via a BEFORE UPDATE trigger for stricter control, or assume the policy `using` clause handles it.
-- RLS `with check` creates the constraint on the NEW row, `using` on the OLD row.
-- To block updates on LOCKED rows:
create policy "Block updates on locked spreadsheets"
  on public.spreadsheets as restrictive
  for update
  using (status not in ('approved_internal', 'signed'));

-- Signatures are immutable (Insert/Select only)
create policy "Users can view access signatures for their spreadsheets"
  on public.signatures for select
  using (
    exists (
      select 1 from public.spreadsheets
      where id = signatures.spreadsheet_id
      and user_id = auth.uid()
    )
  );

create policy "Users can sign"
  on public.signatures for insert
  with check (auth.uid() = signer_id);

-- 4. STORAGE
-- We need to insert the bucket if it doesn't exist.
-- Note: managing storage buckets via SQL is possible in Supabase if the extension is enabled or via standard insert to storage.buckets
insert into storage.buckets (id, name, public)
values ('project-assets', 'project-assets', false)
on conflict (id) do nothing;

-- Storage Policies
-- Authenticated users can upload images to folder /{user_id}/{spreadsheet_id}/
create policy "Users can upload project assets"
  on storage.objects for insert
  with check (
    bucket_id = 'project-assets' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can view project assets"
  on storage.objects for select
  using (
    bucket_id = 'project-assets' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
