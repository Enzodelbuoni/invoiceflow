-- Página pública da proposta (Sprint 14): o cliente abre /quote/<public_id>
-- sem conta. Nenhuma tabela é aberta para anon: o acesso é por duas funções
-- SECURITY DEFINER que recebem o public_id (aleatório, regra 8 do plano) e
-- expõem só o necessário.

-- ── Leitura ─────────────────────────────────────────────────────────
-- Devolve { quote, client, issuer } no formato do QuotePreview, sem ids
-- internos (id, user_id, client_id, service_id) nem datas de edição.
-- Rascunho ou id inexistente → NULL (a página responde "não encontrada").
-- Cancelado → só o necessário para o aviso (sem itens, valores nem cliente).
create function public.get_public_quote(p_public_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_quote public.quotes;
  v_issuer jsonb;
begin
  select q.* into v_quote
  from public.quotes q
  where q.public_id = p_public_id and q.status <> 'draft';

  if not found then
    return null;
  end if;

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
      'issuer', v_issuer
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
    'issuer', v_issuer
  );
end;
$$;

-- ── Visualização ────────────────────────────────────────────────────
-- sent → viewed na primeira visita do cliente (o gatilho grava o evento
-- "viewed"). Não conta: o próprio dono conferindo o link, proposta que não
-- está "enviada" e proposta com a validade vencida (a rotina vai expirá-la).
-- A página chama isto do NAVEGADOR depois de carregar: robôs de prévia de
-- link (WhatsApp, Slack…) não executam JavaScript e não marcam visualização.
create function public.register_quote_view(p_public_id uuid)
returns void
language plpgsql
security definer
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

  if not found or v_status <> 'sent' or v_valid_until < v_today then
    return;
  end if;
  if v_viewer is not null and v_viewer = v_user then
    return;
  end if;

  perform set_config('invoiceflow.status_transition', 'on', true);
  update public.quotes q set status = 'viewed' where q.id = v_id;
  perform set_config('invoiceflow.status_transition', '', true);
end;
$$;

revoke execute on function public.get_public_quote(uuid) from public;
revoke execute on function public.register_quote_view(uuid) from public;
grant execute on function public.get_public_quote(uuid) to anon, authenticated;
grant execute on function public.register_quote_view(uuid) to anon, authenticated;
