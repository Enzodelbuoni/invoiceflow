-- Modelos de orçamento (diferencial "templates de orçamento" do info.txt).
--
-- Um modelo guarda o que se repete entre propostas: itens, desconto, impostos,
-- observações, termos, um título sugerido e a validade padrão EM DIAS (a data
-- de validade de cada orçamento é calculada ao usar o modelo). Não tem
-- cliente, número, status nem totais: os totais são calculados pelo motor do
-- app quando o modelo vira orçamento (e conferidos pelo create_quote).
--
-- Mesmos valores inteiros e limites do orçamento (migração create_quotes):
-- centavos, quantidade em centésimos, percentuais em pontos-base, até 100 itens.
-- Um modelo pode não ter itens (ex.: só termos e observações padrão).
--
-- Itens com snapshot do serviço, como em quote_items: service_id é referência
-- e vira NULL se o serviço for excluído (o item continua no modelo, avulso).
-- FKs compostas com user_id: um modelo só aponta para serviços do próprio dono.

-- ── Correção em quotes (achada ao escrever o teste desta migração) ──
-- O CHECK do desconto aceitava o tipo sem o valor ('percent' + NULL): o
-- "between" com NULL dá NULL, e o CHECK passa. Nenhum caminho do app grava
-- isso, mas a API direta deixaria. Mesma regra, com "is not null".
alter table public.quotes drop constraint quotes_discount_check;
alter table public.quotes add constraint quotes_discount_check check (
  (discount_type is null and discount_value is null)
  or (discount_type = 'percent' and discount_value is not null and discount_value between 1 and 10000)
  or (discount_type = 'amount' and discount_value is not null and discount_value between 1 and 9999999999)
);

-- ── quote_templates ─────────────────────────────────────────────────
create table public.quote_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  -- Nome do modelo (só o dono vê); o título sugerido é o que vai para a proposta.
  name text not null check (char_length(btrim(name)) between 2 and 80),
  title text check (char_length(btrim(title)) between 2 and 120),
  description text check (char_length(description) <= 2000),
  validity_days smallint not null default 15 check (validity_days between 1 and 365),
  discount_type text check (discount_type in ('percent', 'amount')),
  -- Pontos-base se percent, centavos se amount.
  discount_value bigint,
  tax_rate_bps integer check (tax_rate_bps between 1 and 10000),
  notes text check (char_length(notes) <= 2000),
  terms text check (char_length(terms) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint quote_templates_id_user_id_key unique (id, user_id),
  -- Desconto: nenhum, percentual (0,01% a 100%) ou valor fixo (até o teto de preço).
  -- "is not null" explícito: "null between 1 and 10000" dá NULL, e um CHECK com
  -- NULL passa (aceitaria o tipo sem o valor).
  constraint quote_templates_discount_check check (
    (discount_type is null and discount_value is null)
    or (discount_type = 'percent' and discount_value is not null and discount_value between 1 and 10000)
    or (discount_type = 'amount' and discount_value is not null and discount_value between 1 and 9999999999)
  )
);

comment on table public.quote_templates is 'Modelos de orçamento de cada usuário (itens, condições e termos reutilizáveis).';
comment on column public.quote_templates.name is 'Nome do modelo, visto só pelo dono.';
comment on column public.quote_templates.title is 'Título sugerido para o orçamento criado a partir do modelo.';
comment on column public.quote_templates.validity_days is 'Validade padrão: o orçamento vale até hoje + N dias.';

-- Nomes únicos por usuário (sem diferenciar maiúsculas): a lista e o seletor
-- do construtor mostram o nome. O índice também atende o RLS (user_id).
create unique index quote_templates_user_id_name_key on public.quote_templates (user_id, lower(btrim(name)));

create trigger quote_templates_set_updated_at
  before update on public.quote_templates
  for each row execute function public.set_updated_at();

-- ── quote_template_items ────────────────────────────────────────────
create table public.quote_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null,
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
  created_at timestamptz not null default now(),

  -- Também é o índice da FK do modelo (template_id na frente).
  constraint quote_template_items_template_id_position_key unique (template_id, position),
  constraint quote_template_items_template_fkey foreign key (template_id, user_id)
    references public.quote_templates (id, user_id) on delete cascade,
  -- Serviço excluído: só service_id vira NULL (o snapshot do item continua).
  constraint quote_template_items_service_fkey foreign key (service_id, user_id)
    references public.services (id, user_id) on delete set null (service_id)
);

comment on table public.quote_template_items is 'Itens dos modelos de orçamento, com snapshot do serviço.';
comment on column public.quote_template_items.quantity_hundredths is 'Quantidade em centésimos (150 = 1,5).';

-- FK do serviço (SET NULL ao excluir um serviço).
create index quote_template_items_service_id_idx on public.quote_template_items (service_id)
  where service_id is not null;

-- ── Gravar modelo + itens numa transação só (RPC) ───────────────────
-- SECURITY INVOKER: o RLS das tabelas vale. Recebe os dados JÁ validados pelo
-- app; os CHECKs conferem os limites de novo.

create function public.create_quote_template(p_template jsonb, p_items jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_template_id uuid;
begin
  if v_user is null then
    raise exception 'Sessão inválida.' using errcode = '28000';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) > 100 then
    raise exception 'O modelo pode ter no máximo 100 itens.' using errcode = '22023';
  end if;

  insert into public.quote_templates (
    user_id, name, title, description, validity_days,
    discount_type, discount_value, tax_rate_bps, notes, terms
  )
  values (
    v_user,
    p_template ->> 'name',
    p_template ->> 'title',
    p_template ->> 'description',
    (p_template ->> 'validity_days')::smallint,
    p_template ->> 'discount_type',
    (p_template ->> 'discount_value')::bigint,
    (p_template ->> 'tax_rate_bps')::integer,
    p_template ->> 'notes',
    p_template ->> 'terms'
  )
  returning quote_templates.id into v_template_id;

  insert into public.quote_template_items (
    template_id, user_id, position, service_id, name, description,
    quantity_hundredths, unit, unit_price_cents
  )
  select
    v_template_id,
    v_user,
    (item.ordinality - 1)::smallint,
    (item.value ->> 'service_id')::uuid,
    item.value ->> 'name',
    item.value ->> 'description',
    (item.value ->> 'quantity_hundredths')::bigint,
    item.value ->> 'unit',
    (item.value ->> 'unit_price_cents')::bigint
  from jsonb_array_elements(p_items) with ordinality as item (value, ordinality);

  return v_template_id;
end;
$$;

-- Edição: substitui campos e itens. `p_expected_updated_at` é o updated_at lido
-- ao abrir a edição; se o modelo mudou depois (outra aba), recusa com PT409
-- (nunca a classe 40: o PostgREST repetiria a transação sem fim).
create function public.update_quote_template(
  p_template_id uuid,
  p_expected_updated_at timestamptz,
  p_template jsonb,
  p_items jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_updated_at timestamptz;
begin
  if v_user is null then
    raise exception 'Sessão inválida.' using errcode = '28000';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) > 100 then
    raise exception 'O modelo pode ter no máximo 100 itens.' using errcode = '22023';
  end if;

  -- Trava a linha: duas gravações do mesmo modelo esperam uma pela outra
  -- (e a segunda cai na conferência do updated_at).
  select t.updated_at into v_updated_at
  from public.quote_templates t
  where t.id = p_template_id and t.user_id = v_user
  for update;

  if not found then
    raise exception 'Modelo não encontrado.' using errcode = 'P0002';
  end if;
  if p_expected_updated_at is distinct from v_updated_at then
    raise exception 'O modelo foi alterado depois de aberto para edição.' using errcode = 'PT409';
  end if;

  update public.quote_templates t
  set
    name = p_template ->> 'name',
    title = p_template ->> 'title',
    description = p_template ->> 'description',
    validity_days = (p_template ->> 'validity_days')::smallint,
    discount_type = p_template ->> 'discount_type',
    discount_value = (p_template ->> 'discount_value')::bigint,
    tax_rate_bps = (p_template ->> 'tax_rate_bps')::integer,
    notes = p_template ->> 'notes',
    terms = p_template ->> 'terms'
  where t.id = p_template_id;

  delete from public.quote_template_items ti where ti.template_id = p_template_id;

  insert into public.quote_template_items (
    template_id, user_id, position, service_id, name, description,
    quantity_hundredths, unit, unit_price_cents
  )
  select
    p_template_id,
    v_user,
    (item.ordinality - 1)::smallint,
    (item.value ->> 'service_id')::uuid,
    item.value ->> 'name',
    item.value ->> 'description',
    (item.value ->> 'quantity_hundredths')::bigint,
    item.value ->> 'unit',
    (item.value ->> 'unit_price_cents')::bigint
  from jsonb_array_elements(p_items) with ordinality as item (value, ordinality);
end;
$$;

revoke execute on function public.create_quote_template(jsonb, jsonb) from public, anon;
grant execute on function public.create_quote_template(jsonb, jsonb) to authenticated;
revoke execute on function public.update_quote_template(uuid, timestamptz, jsonb, jsonb) from public, anon;
grant execute on function public.update_quote_template(uuid, timestamptz, jsonb, jsonb) to authenticated;

-- ── Segurança das tabelas ───────────────────────────────────────────
alter table public.quote_templates enable row level security;
alter table public.quote_template_items enable row level security;

-- O projeto expõe tabelas novas automaticamente com ALL: zera e concede o mínimo.
revoke all on public.quote_templates from anon, authenticated;
revoke all on public.quote_template_items from anon, authenticated;
grant select, insert, update, delete on public.quote_templates to authenticated;
grant select, insert, update, delete on public.quote_template_items to authenticated;
grant select, insert, update, delete on public.quote_templates to service_role;
grant select, insert, update, delete on public.quote_template_items to service_role;

create policy "Usuário lê os próprios modelos"
  on public.quote_templates for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Usuário cria modelos para si"
  on public.quote_templates for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Usuário atualiza os próprios modelos"
  on public.quote_templates for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Usuário exclui os próprios modelos"
  on public.quote_templates for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Usuário lê os itens dos próprios modelos"
  on public.quote_template_items for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Usuário cria itens nos próprios modelos"
  on public.quote_template_items for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Usuário atualiza os itens dos próprios modelos"
  on public.quote_template_items for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Usuário exclui os itens dos próprios modelos"
  on public.quote_template_items for delete
  to authenticated
  using ((select auth.uid()) = user_id);
