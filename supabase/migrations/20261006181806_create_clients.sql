-- Clientes do freelancer (seção 2.2 do plano). Cada usuário só vê os próprios.
--
-- Exclusão: por enquanto é real (DELETE). Quando a tabela de orçamentos existir,
-- a FK quotes.client_id usará ON DELETE RESTRICT para impedir excluir um cliente
-- que já tenha orçamentos (regra 11: preservar documentos históricos).

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  email text check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  -- Telefone e documento guardados só com dígitos; a formatação é feita na interface.
  phone text check (phone ~ '^[0-9]{10,11}$'),
  company text check (char_length(company) <= 120),
  document text check (document ~ '^([0-9]{11}|[0-9]{14})$'), -- CPF (11) ou CNPJ (14)
  address text check (char_length(address) <= 300),
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.clients is 'Clientes de cada usuário (quem recebe as propostas).';

-- Listagem padrão: clientes do usuário ordenados por nome.
create index clients_user_id_name_idx on public.clients (user_id, name);

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

-- ── Segurança ───────────────────────────────────────────────────────
alter table public.clients enable row level security;

-- O projeto expõe tabelas novas automaticamente com ALL: zera e concede o mínimo.
revoke all on public.clients from anon, authenticated;
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.clients to service_role;

create policy "Usuário lê os próprios clientes"
  on public.clients for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Usuário cria clientes para si"
  on public.clients for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Usuário atualiza os próprios clientes"
  on public.clients for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Usuário exclui os próprios clientes"
  on public.clients for delete
  to authenticated
  using ((select auth.uid()) = user_id);
