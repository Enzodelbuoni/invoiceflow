-- Resposta do cliente à proposta (Sprint 15): aprovar com aceite eletrônico
-- (nome, e-mail e aceite dos termos) ou recusar (motivo opcional), pela página
-- pública, sem conta.
--
-- Uma proposta tem no máximo UMA resposta (unique em quote_id): não dá para
-- aprovar e recusar a mesma proposta, nem aprovar duas vezes. As funções travam
-- o orçamento (for update) e conferem de novo, no banco, o status, a validade
-- e quem está respondendo (regras 5 e 10 do plano): duas respostas ao mesmo
-- tempo → a segunda espera a primeira e é recusada.
--
-- É um ACEITE ELETRÔNICO SIMPLES (seção 2.7 do plano), não uma assinatura
-- digital certificada. A tabela é a "quote_signatures" do plano, generalizada
-- para guardar também a recusa. IP e navegador são informados pelo servidor do
-- app e ficam como evidência auxiliar: o que vale é o registro feito aqui (data
-- do banco, status travado, documento imutável depois do envio).

-- ── Tabela ──────────────────────────────────────────────────────────
create table public.quote_responses (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null,
  user_id uuid not null, -- dono do orçamento (para o RLS e a FK composta)
  decision text not null check (decision in ('approved', 'declined')),
  signer_name text check (char_length(btrim(signer_name)) between 2 and 120),
  signer_email text check (signer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(signer_email) <= 254),
  reason text check (char_length(reason) <= 1000),
  ip_address inet,
  user_agent text check (char_length(user_agent) <= 500),
  created_at timestamptz not null default now(),

  constraint quote_responses_quote_key unique (quote_id),
  constraint quote_responses_quote_fkey foreign key (quote_id, user_id)
    references public.quotes (id, user_id) on delete cascade,
  -- Aprovar exige nome e e-mail de quem aceitou; o motivo é só da recusa.
  constraint quote_responses_decision_fields check (
    (decision = 'approved' and signer_name is not null and signer_email is not null and reason is null)
    or (decision = 'declined' and signer_name is null and signer_email is null)
  )
);

comment on table public.quote_responses is
  'Resposta do cliente à proposta: aceite eletrônico (aprovação) ou recusa. Gravada só pelas funções approve_quote/decline_quote.';

alter table public.quote_responses enable row level security;
revoke all on public.quote_responses from anon, authenticated;
-- Só leitura pela API (o dono vê quem aceitou); quem grava são as funções.
grant select on public.quote_responses to authenticated;
grant select, insert, update, delete on public.quote_responses to service_role;

create policy "Usuário lê as respostas aos próprios orçamentos"
  on public.quote_responses for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- ── Trava e conferência (comum a aprovar e recusar) ─────────────────
-- Trava o orçamento e confere se ele pode ser respondido agora. Chamada só
-- pelas funções abaixo (SECURITY DEFINER), nunca pela API.
create function private.lock_quote_for_response(p_public_id uuid)
returns table (quote_id uuid, owner_id uuid)
language plpgsql
set search_path = ''
as $$
declare
  v_viewer uuid := (select auth.uid());
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_id uuid;
  v_user uuid;
  v_status text;
  v_valid_until date;
begin
  select q.id, q.user_id, q.status, q.valid_until
    into v_id, v_user, v_status, v_valid_until
  from public.quotes q
  where q.public_id = p_public_id
  for update;

  if not found or v_status = 'draft' then
    raise exception 'Proposta não encontrada.' using errcode = 'P0002';
  end if;
  if v_status in ('approved', 'declined', 'cancelled') then
    raise exception 'Esta proposta não pode mais ser respondida (%).', v_status using errcode = '55000';
  end if;
  -- Validade = até o fim do dia valid_until em São Paulo. Não depende da
  -- rotina diária de expiração ter rodado.
  if v_status = 'expired' or v_valid_until < v_today then
    raise exception 'A validade da proposta terminou.' using errcode = '22023';
  end if;
  -- Quem enviou não responde pela página do cliente (PT403 → HTTP 403).
  if v_viewer is not null and v_viewer = v_user then
    raise exception 'Só o cliente pode responder a esta proposta.' using errcode = 'PT403';
  end if;

  return query select v_id, v_user;
end;
$$;

revoke execute on function private.lock_quote_for_response(uuid) from public, anon, authenticated;

-- ── Aprovar (aceite eletrônico) ─────────────────────────────────────
create function public.approve_quote(
  p_public_id uuid,
  p_signer_name text,
  p_signer_email text,
  p_accept_terms boolean,
  p_ip_address inet default null,
  p_user_agent text default null
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_id uuid;
  v_user uuid;
begin
  if p_accept_terms is not true then
    raise exception 'Para aprovar, é preciso aceitar os termos da proposta.' using errcode = '23514';
  end if;

  select l.quote_id, l.owner_id into v_id, v_user
  from private.lock_quote_for_response(p_public_id) l;

  -- Os CHECKs da tabela conferem nome e e-mail (23514 se inválidos).
  insert into public.quote_responses (quote_id, user_id, decision, signer_name, signer_email, ip_address, user_agent, created_at)
  values (v_id, v_user, 'approved', btrim(p_signer_name), lower(btrim(p_signer_email)), p_ip_address, left(p_user_agent, 500), v_now);

  perform set_config('invoiceflow.status_transition', 'on', true);
  update public.quotes q set status = 'approved', approved_at = v_now where q.id = v_id;
  perform set_config('invoiceflow.status_transition', '', true);

  return v_now;
end;
$$;

-- ── Recusar ─────────────────────────────────────────────────────────
create function public.decline_quote(
  p_public_id uuid,
  p_reason text default null,
  p_ip_address inet default null,
  p_user_agent text default null
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_id uuid;
  v_user uuid;
begin
  select l.quote_id, l.owner_id into v_id, v_user
  from private.lock_quote_for_response(p_public_id) l;

  insert into public.quote_responses (quote_id, user_id, decision, reason, ip_address, user_agent, created_at)
  values (v_id, v_user, 'declined', nullif(btrim(p_reason), ''), p_ip_address, left(p_user_agent, 500), v_now);

  perform set_config('invoiceflow.status_transition', 'on', true);
  update public.quotes q set status = 'declined', declined_at = v_now where q.id = v_id;
  perform set_config('invoiceflow.status_transition', '', true);

  return v_now;
end;
$$;

revoke execute on function public.approve_quote(uuid, text, text, boolean, inet, text) from public;
revoke execute on function public.decline_quote(uuid, text, inet, text) from public;
grant execute on function public.approve_quote(uuid, text, text, boolean, inet, text) to anon, authenticated;
grant execute on function public.decline_quote(uuid, text, inet, text) to anon, authenticated;

-- ── Leitura pública: + resposta e "quem está vendo é o dono" ────────
-- Igual à da migração public_quote_access, com dois campos novos:
-- - response: { decision, signer_name, responded_at } (sem e-mail, IP,
--   navegador nem motivo: a página pública mostra só quem aceitou e quando);
-- - viewer_is_owner: a página avisa o dono de que só o cliente pode responder.
create or replace function public.get_public_quote(p_public_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_quote public.quotes;
  v_issuer jsonb;
  v_owner boolean;
begin
  select q.* into v_quote
  from public.quotes q
  where q.public_id = p_public_id and q.status <> 'draft';

  if not found then
    return null;
  end if;

  v_owner := coalesce((select auth.uid()) = v_quote.user_id, false);

  select jsonb_build_object(
    'name', coalesce(nullif(btrim(p.full_name), ''), split_part(p.email, '@', 1)),
    'email', p.email,
    'phone', p.phone
  ) into v_issuer
  from public.profiles p
  where p.id = v_quote.user_id;

  if v_quote.status = 'cancelled' then
    return jsonb_build_object(
      'quote', jsonb_build_object(
        'quote_number', v_quote.quote_number,
        'status', v_quote.status,
        'title', v_quote.title
      ),
      'client', null,
      'issuer', v_issuer,
      'response', null,
      'viewer_is_owner', v_owner
    );
  end if;

  return jsonb_build_object(
    'quote', jsonb_build_object(
      'quote_number', v_quote.quote_number,
      'status', v_quote.status,
      'title', v_quote.title,
      'description', v_quote.description,
      'created_at', v_quote.created_at,
      'sent_at', v_quote.sent_at,
      'approved_at', v_quote.approved_at,
      'declined_at', v_quote.declined_at,
      'valid_until', v_quote.valid_until,
      'discount_type', v_quote.discount_type,
      'discount_value', v_quote.discount_value,
      'tax_rate_bps', v_quote.tax_rate_bps,
      'subtotal_cents', v_quote.subtotal_cents,
      'discount_total_cents', v_quote.discount_total_cents,
      'tax_total_cents', v_quote.tax_total_cents,
      'total_cents', v_quote.total_cents,
      'notes', v_quote.notes,
      'terms', v_quote.terms,
      'items', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'name', i.name,
            'description', i.description,
            'quantity_hundredths', i.quantity_hundredths,
            'unit', i.unit,
            'unit_price_cents', i.unit_price_cents,
            'subtotal_cents', i.subtotal_cents
          )
          order by i.position
        )
        from public.quote_items i
        where i.quote_id = v_quote.id
      ), '[]'::jsonb)
    ),
    'client', (
      select jsonb_build_object(
        'name', c.name,
        'company', c.company,
        'email', c.email,
        'phone', c.phone,
        'document', c.document,
        'address', c.address
      )
      from public.clients c
      where c.id = v_quote.client_id and c.user_id = v_quote.user_id
    ),
    'issuer', v_issuer,
    'response', (
      select jsonb_build_object(
        'decision', r.decision,
        'signer_name', r.signer_name,
        'responded_at', r.created_at
      )
      from public.quote_responses r
      where r.quote_id = v_quote.id
    ),
    'viewer_is_owner', v_owner
  );
end;
$$;
