-- Orçamentos e seus itens (seções 2.4 e 2.5 do plano) + numeração por usuário.
--
-- Valores em INTEIROS, como no app: centavos (bigint), quantidade em centésimos
-- (150 = 1,5) e percentuais em pontos-base (1250 = 12,5%). Os limites repetem
-- os do app (QUOTE_LIMITS, MAX_PRICE_CENTS, MAX_QUANTITY_HUNDREDTHS,
-- MAX_TOTAL_CENTS = R$ 999.999.999,99) e as contas repetem o motor de cálculos
-- (src/lib/calculations/quote.js): arredondamento meio para cima, que é o que o
-- round() do Postgres faz com numeric positivo. Os totais são calculados no
-- servidor do app e o banco CONFERE que batem (CHECKs + a função create_quote).
--
-- Snapshot (regra 1 do plano): cada item guarda nome, descrição, unidade e preço
-- copiados do serviço; service_id é só referência e vira NULL se o serviço for
-- excluído. Cliente com orçamentos não pode ser excluído (regra 11).
--
-- Isolamento entre usuários além do RLS: as FKs são COMPOSTAS com user_id, então
-- um orçamento só aponta para cliente/serviço do próprio dono (uma FK simples
-- aceitaria o id de um cliente de outra pessoa, porque a checagem de FK ignora o RLS).

-- ── Chaves para as FKs compostas ────────────────────────────────────
alter table public.clients add constraint clients_id_user_id_key unique (id, user_id);
alter table public.services add constraint services_id_user_id_key unique (id, user_id);

-- ── quotes ──────────────────────────────────────────────────────────
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  client_id uuid not null,
  -- "2026-001": ano de criação (fuso de São Paulo) + sequência do usuário no ano.
  quote_number text not null check (quote_number ~ '^[0-9]{4}-[0-9]{3,}$'),
  -- Identificador da URL pública (regra 8): aleatório, nunca sequencial.
  public_id uuid not null default gen_random_uuid() unique,
  title text not null check (char_length(btrim(title)) between 2 and 120),
  description text check (char_length(description) <= 2000),
  status text not null default 'draft' check (
    status in ('draft', 'sent', 'viewed', 'approved', 'declined', 'expired', 'cancelled')
  ),
  valid_until date not null,
  discount_type text check (discount_type in ('percent', 'amount')),
  -- Pontos-base se percent, centavos se amount.
  discount_value bigint,
  tax_rate_bps integer check (tax_rate_bps between 1 and 10000),
  subtotal_cents bigint not null check (subtotal_cents between 0 and 99999999999),
  discount_total_cents bigint not null,
  tax_total_cents bigint not null check (tax_total_cents >= 0),
  total_cents bigint not null check (total_cents between 0 and 99999999999),
  notes text check (char_length(notes) <= 2000),
  terms text check (char_length(terms) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  approved_at timestamptz,
  declined_at timestamptz,

  constraint quotes_id_user_id_key unique (id, user_id),
  constraint quotes_user_id_quote_number_key unique (user_id, quote_number),
  -- NO ACTION (e não RESTRICT): a checagem fica para o fim do comando. Excluir o
  -- cliente direto continua bloqueado (erro 23503), mas excluir a CONTA funciona,
  -- porque a cascata apaga orçamentos e clientes no mesmo comando.
  constraint quotes_client_fkey foreign key (client_id, user_id)
    references public.clients (id, user_id) on delete no action,

  -- Desconto: nenhum, percentual (0,01% a 100%) ou valor fixo (até o teto de preço).
  constraint quotes_discount_check check (
    (discount_type is null and discount_value is null)
    or (discount_type = 'percent' and discount_value between 1 and 10000)
    or (discount_type = 'amount' and discount_value between 1 and 9999999999)
  ),
  -- Os totais precisam bater com as regras do motor de cálculos.
  constraint quotes_discount_total_check check (
    discount_total_cents = case discount_type
      when 'percent' then round(subtotal_cents::numeric * discount_value / 10000)
      when 'amount' then least(discount_value, subtotal_cents)
      else 0
    end
  ),
  constraint quotes_tax_total_check check (
    tax_total_cents = case
      when tax_rate_bps is null then 0
      else round((subtotal_cents - discount_total_cents)::numeric * tax_rate_bps / 10000)
    end
  ),
  constraint quotes_total_check check (total_cents = subtotal_cents - discount_total_cents + tax_total_cents)
);

comment on table public.quotes is 'Orçamentos/propostas de cada usuário.';
comment on column public.quotes.quote_number is 'Número exibido ao cliente: ano + sequência do usuário (2026-001).';
comment on column public.quotes.public_id is 'Id aleatório da URL pública da proposta.';
comment on column public.quotes.discount_value is 'Pontos-base (percent: 1250 = 12,5%) ou centavos (amount).';
comment on column public.quotes.tax_rate_bps is 'Alíquota em pontos-base (500 = 5%); incide sobre o subtotal com desconto.';

-- Lista do usuário, mais recentes primeiro (o unique (user_id, quote_number) também atende o RLS).
create index quotes_user_id_created_at_idx on public.quotes (user_id, created_at desc);
-- FK do cliente (exclusão de cliente e "orçamentos deste cliente").
create index quotes_client_id_idx on public.quotes (client_id);

create trigger quotes_set_updated_at
  before update on public.quotes
  for each row execute function public.set_updated_at();

-- ── quote_items ─────────────────────────────────────────────────────
create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null,
  user_id uuid not null default auth.uid(),
  position smallint not null check (position between 0 and 99),
  service_id uuid,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  description text check (char_length(description) <= 1000),
  quantity_hundredths bigint not null check (quantity_hundredths between 1 and 99999999),
  unit text not null check (
    unit in ('hour', 'day', 'week', 'month', 'project', 'unit', 'page', 'word')
  ),
  unit_price_cents bigint not null check (unit_price_cents between 0 and 9999999999),
  subtotal_cents bigint not null check (subtotal_cents between 0 and 99999999999),
  created_at timestamptz not null default now(),

  constraint quote_items_quote_id_position_key unique (quote_id, position),
  constraint quote_items_quote_fkey foreign key (quote_id, user_id)
    references public.quotes (id, user_id) on delete cascade,
  -- Serviço excluído: só service_id vira NULL (o snapshot do item continua).
  constraint quote_items_service_fkey foreign key (service_id, user_id)
    references public.services (id, user_id) on delete set null (service_id),
  constraint quote_items_subtotal_check check (
    subtotal_cents = round(quantity_hundredths::numeric * unit_price_cents / 100)
  )
);

comment on table public.quote_items is 'Itens dos orçamentos, com snapshot do serviço no momento da criação.';
comment on column public.quote_items.quantity_hundredths is 'Quantidade em centésimos (150 = 1,5).';

-- FK do serviço (SET NULL ao excluir um serviço).
create index quote_items_service_id_idx on public.quote_items (service_id) where service_id is not null;

-- ── Numeração (schema privado, fora da API) ─────────────────────────
-- O contador só é tocado pela função abaixo; nenhum papel da API o lê ou altera
-- (senão alguém poderia zerá-lo e gerar números repetidos).
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table private.quote_counters (
  user_id uuid not null references public.profiles (id) on delete cascade,
  year smallint not null,
  last_number integer not null check (last_number > 0),
  primary key (user_id, year)
);
alter table private.quote_counters enable row level security;
revoke all on private.quote_counters from public, anon, authenticated;

-- Próximo número do usuário logado no ano corrente (fuso de São Paulo).
-- SECURITY DEFINER para acessar o contador; confere auth.uid() por dentro.
-- O upsert trava a linha do contador: dois orçamentos simultâneos não repetem número.
create function private.next_quote_number()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_year smallint := extract(year from (now() at time zone 'America/Sao_Paulo'))::smallint;
  v_number integer;
begin
  if v_user is null then
    raise exception 'Sessão inválida.' using errcode = '28000';
  end if;

  insert into private.quote_counters as c (user_id, year, last_number)
  values (v_user, v_year, 1)
  on conflict (user_id, year) do update set last_number = c.last_number + 1
  returning c.last_number into v_number;

  -- lpad cortaria números com mais de 3 dígitos: 1000 continua "1000".
  return v_year::text || '-' || lpad(v_number::text, greatest(3, length(v_number::text)), '0');
end;
$$;

revoke execute on function private.next_quote_number() from public, anon;
grant execute on function private.next_quote_number() to authenticated;

-- ── Criar orçamento + itens numa transação só (RPC) ─────────────────
-- O supabase-js não tem transação: a função garante que o orçamento nunca fica
-- sem itens nem com número repetido. SECURITY INVOKER: o RLS das tabelas vale.
-- Recebe os dados JÁ validados e com os totais calculados pelo servidor do app;
-- aqui confere o que os CHECKs não alcançam (soma dos itens, validade, contagem).
create function public.create_quote(p_quote jsonb, p_items jsonb)
returns table (id uuid, quote_number text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_valid_until date := (p_quote ->> 'valid_until')::date;
  v_quote_id uuid;
  v_quote_number text;
  v_items_subtotal bigint;
begin
  if v_user is null then
    raise exception 'Sessão inválida.' using errcode = '28000';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 100 then
    raise exception 'O orçamento precisa ter de 1 a 100 itens.' using errcode = '22023';
  end if;
  if v_valid_until is null or v_valid_until < v_today or v_valid_until > v_today + 365 then
    raise exception 'Validade fora do período permitido.' using errcode = '22023';
  end if;

  v_quote_number := private.next_quote_number();

  insert into public.quotes (
    user_id, client_id, quote_number, title, description, valid_until,
    discount_type, discount_value, tax_rate_bps,
    subtotal_cents, discount_total_cents, tax_total_cents, total_cents,
    notes, terms
  )
  values (
    v_user,
    (p_quote ->> 'client_id')::uuid,
    v_quote_number,
    p_quote ->> 'title',
    p_quote ->> 'description',
    v_valid_until,
    p_quote ->> 'discount_type',
    (p_quote ->> 'discount_value')::bigint,
    (p_quote ->> 'tax_rate_bps')::integer,
    (p_quote ->> 'subtotal_cents')::bigint,
    (p_quote ->> 'discount_total_cents')::bigint,
    (p_quote ->> 'tax_total_cents')::bigint,
    (p_quote ->> 'total_cents')::bigint,
    p_quote ->> 'notes',
    p_quote ->> 'terms'
  )
  returning quotes.id into v_quote_id;

  insert into public.quote_items (
    quote_id, user_id, position, service_id, name, description,
    quantity_hundredths, unit, unit_price_cents, subtotal_cents
  )
  select
    v_quote_id,
    v_user,
    (item.ordinality - 1)::smallint,
    (item.value ->> 'service_id')::uuid,
    item.value ->> 'name',
    item.value ->> 'description',
    (item.value ->> 'quantity_hundredths')::bigint,
    item.value ->> 'unit',
    (item.value ->> 'unit_price_cents')::bigint,
    (item.value ->> 'subtotal_cents')::bigint
  from jsonb_array_elements(p_items) with ordinality as item (value, ordinality);

  select sum(qi.subtotal_cents) into v_items_subtotal
  from public.quote_items qi
  where qi.quote_id = v_quote_id;

  if v_items_subtotal is distinct from (p_quote ->> 'subtotal_cents')::bigint then
    raise exception 'O subtotal não confere com a soma dos itens.' using errcode = '23514';
  end if;

  return query select v_quote_id, v_quote_number;
end;
$$;

revoke execute on function public.create_quote(jsonb, jsonb) from public, anon;
grant execute on function public.create_quote(jsonb, jsonb) to authenticated;

-- ── Segurança das tabelas ───────────────────────────────────────────
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;

-- O projeto expõe tabelas novas automaticamente com ALL: zera e concede o mínimo.
revoke all on public.quotes from anon, authenticated;
revoke all on public.quote_items from anon, authenticated;
grant select, insert, update, delete on public.quotes to authenticated;
grant select, insert, update, delete on public.quote_items to authenticated;
grant select, insert, update, delete on public.quotes to service_role;
grant select, insert, update, delete on public.quote_items to service_role;

create policy "Usuário lê os próprios orçamentos"
  on public.quotes for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Orçamento nasce como rascunho, sem datas de envio/aprovação/recusa
-- (a máquina de estados do Sprint 12 cuida das mudanças de status).
create policy "Usuário cria orçamentos (rascunho) para si"
  on public.quotes for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and status = 'draft'
    and sent_at is null and approved_at is null and declined_at is null
  );

create policy "Usuário atualiza os próprios orçamentos"
  on public.quotes for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Usuário exclui os próprios orçamentos"
  on public.quotes for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Usuário lê os itens dos próprios orçamentos"
  on public.quote_items for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Usuário cria itens nos próprios orçamentos"
  on public.quote_items for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Usuário atualiza os itens dos próprios orçamentos"
  on public.quote_items for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Usuário exclui os itens dos próprios orçamentos"
  on public.quote_items for delete
  to authenticated
  using ((select auth.uid()) = user_id);
