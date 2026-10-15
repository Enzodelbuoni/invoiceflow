-- Teste da migração quote_dashboard: contagens por status, "enviadas" sem as
-- canceladas, somas, período (envio ou criação), RLS (só os próprios) e anon
-- sem acesso. Bloco que termina em RAISE EXCEPTION (desfaz tudo).
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  ca uuid; cb uuid;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  q record;
  q_viewed uuid; q_approved uuid; q_declined uuid; q_cancel_sent uuid; q_old uuid;
  pub uuid;
  r jsonb;
  passed int := 0;
  failures text := '';
  base jsonb;
  item jsonb;
begin
  insert into auth.users (id, email, aud, role)
  values (a, 'dash-a-' || a || '@example.com', 'authenticated', 'authenticated'),
         (b, 'dash-b-' || b || '@example.com', 'authenticated', 'authenticated');

  -- Usuário b: 1 orçamento enviado (não pode aparecer para a)
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.clients (name) values ('Cliente B') returning id into cb;
  item := jsonb_build_object('service_id', null, 'name', 'Item', 'description', null,
    'quantity_hundredths', 100, 'unit', 'unit', 'unit_price_cents', 99900, 'subtotal_cents', 99900);
  base := jsonb_build_object('client_id', cb, 'title', 'Orçamento B', 'description', null,
    'valid_until', v_today + 15, 'discount_type', null, 'discount_value', null, 'tax_rate_bps', null,
    'subtotal_cents', 99900, 'discount_total_cents', 0, 'tax_total_cents', 0, 'total_cents', 99900,
    'notes', null, 'terms', null);
  select * into q from public.create_quote(base, jsonb_build_array(item));
  perform public.send_quote(q.id);
  reset role;

  -- Usuário a: rascunho (100), enviado (200), visualizado (300), aprovado (400),
  -- recusado (500), cancelado depois de enviar (600) e um rascunho cancelado (700)
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.clients (name) values ('Cliente A') returning id into ca;
  for i in 1..7 loop
    item := jsonb_build_object('service_id', null, 'name', 'Item', 'description', null,
      'quantity_hundredths', 100, 'unit', 'unit', 'unit_price_cents', i * 10000, 'subtotal_cents', i * 10000);
    base := jsonb_build_object('client_id', ca, 'title', 'Orçamento ' || i, 'description', null,
      'valid_until', v_today + 15, 'discount_type', null, 'discount_value', null, 'tax_rate_bps', null,
      'subtotal_cents', i * 10000, 'discount_total_cents', 0, 'tax_total_cents', 0, 'total_cents', i * 10000,
      'notes', null, 'terms', null);
    select * into q from public.create_quote(base, jsonb_build_array(item));
    if i between 2 and 6 then perform public.send_quote(q.id); end if;
    if i = 3 then q_viewed := q.id; end if;
    if i = 4 then q_approved := q.id; end if;
    if i = 5 then q_declined := q.id; end if;
    if i = 6 then q_cancel_sent := q.id; perform public.cancel_quote(q.id); end if;
    if i = 7 then perform public.cancel_quote(q.id); end if;
  end loop;
  reset role;

  -- Visualizar (3), aprovar (4) e recusar (5) como o cliente (anon)
  perform set_config('request.jwt.claims', '', true);
  select public_id into pub from public.quotes where id = q_viewed;
  set local role anon;
  perform public.register_quote_view(pub);
  reset role;
  select public_id into pub from public.quotes where id = q_approved;
  set local role anon;
  perform public.approve_quote(pub, 'Cliente Teste', 'cliente@teste.com', true);
  reset role;
  select public_id into pub from public.quotes where id = q_declined;
  set local role anon;
  perform public.decline_quote(pub, null);
  reset role;

  -- Um expirado antigo (enviado há 200 dias), inserido direto (como a rotina deixaria)
  insert into public.quotes (user_id, client_id, quote_number, title, valid_until, status, sent_at, created_at,
    subtotal_cents, discount_total_cents, tax_total_cents, total_cents)
  values (a, ca, '2000-950', 'Antigo', v_today - 180, 'expired', now() - interval '200 days', now() - interval '201 days',
    80000, 0, 0, 80000)
  returning id into q_old;

  -- D1: tudo, para a
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := public.quote_dashboard();
  if (r ->> 'total')::int = 8
     and r -> 'by_status' = '{"draft":1,"sent":1,"viewed":1,"approved":1,"declined":1,"expired":1,"cancelled":2}'::jsonb then
    passed := passed + 1;
  else
    failures := failures || ' D1(' || r::text || ')';
  end if;

  -- D2: enviadas = sent+viewed+approved+declined+expired (5), sem as canceladas; somas
  if (r ->> 'reached')::int = 5
     and (r ->> 'reached_value_cents')::bigint = 20000 + 30000 + 40000 + 50000 + 80000
     and (r ->> 'approved_value_cents')::bigint = 40000
     and (r ->> 'open_value_cents')::bigint = 20000 + 30000 then
    passed := passed + 1;
  else
    failures := failures || ' D2(' || r::text || ')';
  end if;

  -- D3: últimos 90 dias: o expirado antigo sai (enviado há 200 dias)
  r := public.quote_dashboard(now() - interval '90 days');
  if (r ->> 'total')::int = 7 and (r ->> 'reached')::int = 4 and (r -> 'by_status' ->> 'expired')::int = 0 then
    passed := passed + 1;
  else
    failures := failures || ' D3(' || r::text || ')';
  end if;

  -- D4: período no futuro → tudo zerado (e somas 0, não null)
  r := public.quote_dashboard(now() + interval '1 day');
  if (r ->> 'total')::int = 0 and (r ->> 'reached_value_cents')::bigint = 0 and (r ->> 'approved_value_cents')::bigint = 0 then
    passed := passed + 1;
  else
    failures := failures || ' D4(' || r::text || ')';
  end if;
  reset role;

  -- D5: usuário b só vê o próprio
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := public.quote_dashboard();
  if (r ->> 'total')::int = 1 and (r ->> 'reached_value_cents')::bigint = 99900 then
    passed := passed + 1;
  else
    failures := failures || ' D5(' || r::text || ')';
  end if;
  reset role;

  -- D6: anon não executa
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  begin
    r := public.quote_dashboard();
    failures := failures || ' D6';
  exception when insufficient_privilege then passed := passed + 1;
  end;
  reset role;

  raise exception 'RESULTADO DO TESTE: % ok; falhas:%', passed, coalesce(nullif(failures, ''), ' nenhuma');
end;
$$;
