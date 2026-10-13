-- Edição de orçamentos enquanto rascunho (Sprint 10, parte 4) + guarda de
-- imutabilidade no banco (regra 6 do plano: depois do envio, o documento não
-- muda em silêncio). A guarda vale para QUALQUER escrita (app, API direta,
-- funções futuras); a máquina de estados do Sprint 12 cuida das mudanças de
-- status, que continuam liberadas aqui.

-- ── Guarda: orçamento ───────────────────────────────────────────────
-- Número, link público e dono nunca mudam. O conteúdo (cliente, textos,
-- valores, validade) só muda enquanto o status é draft.
create function private.guard_quote_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.user_id, new.quote_number, new.public_id, new.created_at)
     is distinct from (old.user_id, old.quote_number, old.public_id, old.created_at) then
    raise exception 'Número, link público e dono do orçamento não podem ser alterados.' using errcode = '55000';
  end if;

  if old.status <> 'draft' and (
       new.client_id, new.title, new.description, new.valid_until,
       new.discount_type, new.discount_value, new.tax_rate_bps,
       new.subtotal_cents, new.discount_total_cents, new.tax_total_cents, new.total_cents,
       new.notes, new.terms
     ) is distinct from (
       old.client_id, old.title, old.description, old.valid_until,
       old.discount_type, old.discount_value, old.tax_rate_bps,
       old.subtotal_cents, old.discount_total_cents, old.tax_total_cents, old.total_cents,
       old.notes, old.terms
     ) then
    raise exception 'Orçamento enviado não pode ser alterado.' using errcode = '55000';
  end if;

  return new;
end;
$$;

revoke execute on function private.guard_quote_update() from public, anon, authenticated;

create trigger quotes_guard_update
  before update on public.quotes
  for each row execute function private.guard_quote_update();

-- ── Guarda: itens ───────────────────────────────────────────────────
-- Itens só entram, mudam ou saem de orçamentos em rascunho. Duas exceções:
-- - serviço excluído do catálogo: o banco zera service_id (ON DELETE SET NULL),
--   o que não altera o documento;
-- - orçamento sendo excluído (cascata): ele já não existe quando o item sai.
create function private.guard_quote_item_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and new.service_id is null
     and (new.quote_id, new.user_id, new.position, new.name, new.description,
          new.quantity_hundredths, new.unit, new.unit_price_cents, new.subtotal_cents, new.created_at)
         is not distinct from
         (old.quote_id, old.user_id, old.position, old.name, old.description,
          old.quantity_hundredths, old.unit, old.unit_price_cents, old.subtotal_cents, old.created_at) then
    return new;
  end if;

  if exists (
    select 1
    from public.quotes q
    where q.status <> 'draft'
      and q.id in (
        case when tg_op in ('UPDATE', 'DELETE') then old.quote_id end,
        case when tg_op in ('INSERT', 'UPDATE') then new.quote_id end
      )
  ) then
    raise exception 'Os itens de um orçamento enviado não podem ser alterados.' using errcode = '55000';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke execute on function private.guard_quote_item_change() from public, anon, authenticated;

create trigger quote_items_guard_change
  before insert or update or delete on public.quote_items
  for each row execute function private.guard_quote_item_change();

-- ── Editar orçamento + itens numa transação só (RPC) ────────────────
-- Mesmo contrato do create_quote: recebe os dados JÁ validados, com os totais
-- calculados pelo servidor do app, e confere o que os CHECKs não alcançam.
-- `p_expected_updated_at`: o updated_at que a pessoa abriu para editar. Se o
-- orçamento mudou depois disso (outra aba, outro aparelho), a gravação é
-- recusada em vez de sobrescrever em silêncio.
-- Os itens são substituídos (apagados e inseridos de novo na ordem recebida).
-- SECURITY INVOKER: o RLS e as guardas acima valem.
create function public.update_quote(
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
    raise exception 'O orçamento foi alterado depois de aberto para edição.' using errcode = '40001';
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

revoke execute on function public.update_quote(uuid, timestamptz, jsonb, jsonb) from public, anon;
grant execute on function public.update_quote(uuid, timestamptz, jsonb, jsonb) to authenticated;
