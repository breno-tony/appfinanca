-- MEU FINANCEIRO — configuração do Supabase
-- Execute no Supabase Dashboard > SQL Editor > New query.

create table if not exists public.finance_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.finance_state enable row level security;

drop policy if exists "finance_state_select_own" on public.finance_state;
drop policy if exists "finance_state_insert_own" on public.finance_state;
drop policy if exists "finance_state_update_own" on public.finance_state;
drop policy if exists "finance_state_delete_own" on public.finance_state;

create policy "finance_state_select_own"
on public.finance_state
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "finance_state_insert_own"
on public.finance_state
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "finance_state_update_own"
on public.finance_state
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "finance_state_delete_own"
on public.finance_state
for delete
to authenticated
using ((select auth.uid()) = user_id);

create index if not exists finance_state_updated_at_idx
on public.finance_state(updated_at desc);
