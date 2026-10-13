-- Correção da migração update_quote: o conflito de versão ("alterado depois de
-- aberto para edição") usava o SQLSTATE 40001 (serialization_failure). O
-- PostgREST trata 40001 como falha transitória e REPETE a transação; como a
-- função recusa sempre, a requisição ficava presa repetindo sem fim.
-- Agora o conflito usa PT409: o PostgREST responde HTTP 409 com code "PT409"
-- e não repete. Nunca usar SQLSTATEs da classe 40 para erros de negócio.
-- (create or replace mantém as permissões de EXECUTE já concedidas.)

create or replace function public.update_quote(
  p_quote_id uuid,
  p_expected_updated_at timestamptz,
  p_quote jsonb,
  p_items jsonb
)
returns table (id uuid, quote_number text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_valid_until date := (p_quote ->> 'valid_until')::date;
  v_status text;
  v_quote_number text;
  v_updated_at timestamptz;
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

  -- Trava a linha: duas gravações do mesmo orçamento esperam uma pela outra
  -- (e a segunda cai na conferência do updated_at).
  select q.status, q.quote_number, q.updated_at
    into v_status, v_quote_number, v_updated_at
  from public.quotes q
  where q.id = p_quote_id and q.user_id = v_user
  for update;

  if not found then
    raise exception 'Orçamento não encontrado.' using errcode = 'P0002';
  end if;
  if v_status <> 'draft' then
    raise exception 'Só rascunhos podem ser editados.' using errcode = '55000';
  end if;
  if p_expected_updated_at is distinct from v_updated_at then
    raise exception 'O orçamento foi alterado depois de aberto para edição.' using errcode = 'PT409';
  end if;

  update public.quotes q
  set
    client_id = (p_quote ->> 'client_id')::uuid,
    title = p_quote ->> 'title',
    description = p_quote ->> 'description',
    valid_until = v_valid_until,
    discount_type = p_quote ->> 'discount_type',
    discount_value = (p_quote ->> 'discount_value')::bigint,
    tax_rate_bps = (p_quote ->> 'tax_rate_bps')::integer,
    subtotal_cents = (p_quote ->> 'subtotal_cents')::bigint,
    discount_total_cents = (p_quote ->> 'discount_total_cents')::bigint,
    tax_total_cents = (p_quote ->> 'tax_total_cents')::bigint,
    total_cents = (p_quote ->> 'total_cents')::bigint,
    notes = p_quote ->> 'notes',
    terms = p_quote ->> 'terms'
  where q.id = p_quote_id;

  delete from public.quote_items qi where qi.quote_id = p_quote_id;

  insert into public.quote_items (
    quote_id, user_id, position, service_id, name, description,
    quantity_hundredths, unit, unit_price_cents, subtotal_cents
  )
  select
    p_quote_id,
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
  where qi.quote_id = p_quote_id;

  if v_items_subtotal is distinct from (p_quote ->> 'subtotal_cents')::bigint then
    raise exception 'O subtotal não confere com a soma dos itens.' using errcode = '23514';
  end if;

  return query select p_quote_id, v_quote_number;
end;
$$;
