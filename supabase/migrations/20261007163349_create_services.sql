-- Catálogo de serviços do freelancer (seção 2.3 do plano). Cada usuário só vê os próprios.
--
-- Dinheiro em centavos inteiros (bigint) em vez de NUMERIC: o JavaScript não tem
-- decimal exato, então inteiros evitam erros como 0.1 + 0.2. O teto de
-- R$ 99.999.999,99 deixa folga para quantidade × preço continuar muito abaixo de
-- Number.MAX_SAFE_INTEGER no motor de cálculos (Sprint 8).
--
-- Exclusão: pode ser sempre real. Os itens de orçamento guardam um snapshot
-- (nome, descrição, unidade, preço) e quote_items.service_id usará
-- ON DELETE SET NULL (Sprint 10), então apagar um serviço não altera documentos.

create table public.services (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  description text check (char_length(description) <= 1000),
  -- Lista fechada; os rótulos em pt-BR ficam na interface.
  unit text not null check (
    unit in ('hour', 'day', 'week', 'month', 'project', 'unit', 'page', 'word')
  ),
  price_cents bigint not null check (price_cents between 0 and 9999999999),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.services is 'Serviços que cada usuário oferece (base para os itens dos orçamentos).';
comment on column public.services.unit is 'Unidade de cobrança: hour, day, week, month, project, unit, page ou word.';
comment on column public.services.price_cents is 'Preço por unidade em centavos de real (12345 = R$ 123,45).';

-- Listagem padrão: serviços do usuário ordenados por nome.
create index services_user_id_name_idx on public.services (user_id, name);

create trigger services_set_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

-- ── Segurança ───────────────────────────────────────────────────────
alter table public.services enable row level security;

-- O projeto expõe tabelas novas automaticamente com ALL: zera e concede o mínimo.
revoke all on public.services from anon, authenticated;
grant select, insert, update, delete on public.services to authenticated;
grant select, insert, update, delete on public.services to service_role;

create policy "Usuário lê os próprios serviços"
  on public.services for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Usuário cria serviços para si"
  on public.services for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Usuário atualiza os próprios serviços"
  on public.services for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Usuário exclui os próprios serviços"
  on public.services for delete
  to authenticated
  using ((select auth.uid()) = user_id);
