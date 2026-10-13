-- Teste da migração public_quote_access: leitura pública só do necessário,
-- rascunho invisível, cancelado mínimo, registro de visualização (e quando
-- NÃO registra). Tudo num bloco que termina em RAISE EXCEPTION (desfaz tudo).
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  ca uuid;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  q record;
  q_draft uuid; q_sent uuid; q_owner uuid; q_cancel uuid; q_late uuid;
  pub_draft uuid; pub_sent uuid; pub_owner uuid; pub_cancel uuid; pub_late uuid;
  doc jsonb;
  n bigint;
  t text;
  passed int := 0;
  failures text := '';
  base_quote jsonb;
  item_ok jsonb;
begin
  insert into auth.users (id, email, aud, role)
  values (a, 'pub-a-' || a || '@example.com', 'authenticated', 'authenticated'),
         (b, 'pub-b-' || b || '@example.com', 'authenticated', 'authenticated');
  update public.profiles set full_name = 'Ana Freelancer', phone = '11999998888' where id = a;

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.clients (name, document, address) values ('Cliente A', '45268805827', 'Rua X, 1') returning id into ca;

  item_ok := jsonb_build_object('service_id', null, 'name', 'Hora técnica', 'description', null,
    'quantity_hundredths', 200, 'unit', 'hour', 'unit_price_cents', 15000, 'subtotal_cents', 30000);
  base_quote := jsonb_build_object('client_id', ca, 'title', 'Orçamento A', 'description', null,
    'valid_until', v_today + 15, 'discount_type', null, 'discount_value', null, 'tax_rate_bps', null,
    'subtotal_cents', 30000, 'discount_total_cents', 0, 'tax_total_cents', 0, 'total_cents', 30000,
    'notes', null, 'terms', null);

  select * into q from public.create_quote(base_quote, jsonb_build_array(item_ok)); q_draft := q.id;
  select * into q from public.create_quote(base_quote, jsonb_build_array(item_ok)); q_sent := q.id;
  perform public.send_quote(q_sent);
  select * into q from public.create_quote(base_quote, jsonb_build_array(item_ok)); q_owner := q.id;
  perform public.send_quote(q_owner);
  select * into q from public.create_quote(base_quote, jsonb_build_array(item_ok)); q_cancel := q.id;
  perform public.send_quote(q_cancel);
  perform public.cancel_quote(q_cancel);
  select public_id into pub_draft from public.quotes where id = q_draft;
  select public_id into pub_sent from public.quotes where id = q_sent;
  select public_id into pub_owner from public.quotes where id = q_owner;
  select public_id into pub_cancel from public.quotes where id = q_cancel;

  -- P1: o dono abrindo o próprio link NÃO marca como visualizado
  perform public.register_quote_view(pub_owner);
  select status into t from public.quotes where id = q_owner;
  if t = 'sent' then passed := passed + 1; else failures := failures || ' P1(' || t || ')'; end if;

  -- Como visitante sem conta (anon)
  reset role;
  perform set_config('request.jwt.claims', '', true);
  set local role anon;

  -- P2: rascunho e id inexistente → NULL
  if public.get_public_quote(pub_draft) is null and public.get_public_quote(gen_random_uuid()) is null
     and public.get_public_quote(null) is null then
    passed := passed + 1;
  else
    failures := failures || ' P2';
  end if;

  -- P3: enviado → documento completo, sem ids internos
  doc := public.get_public_quote(pub_sent);
  if doc -> 'quote' ->> 'status' = 'sent'
     and (doc -> 'quote' ->> 'total_cents')::bigint = 30000
     and jsonb_array_length(doc -> 'quote' -> 'items') = 1
     and doc -> 'client' ->> 'document' = '45268805827'
     and doc -> 'issuer' ->> 'name' = 'Ana Freelancer' then
    passed := passed + 1;
  else
    failures := failures || ' P3';
  end if;
  if not (doc -> 'quote' ?| array['id', 'user_id', 'client_id', 'public_id', 'updated_at'])
     and not (doc -> 'quote' -> 'items' -> 0 ?| array['id', 'quote_id', 'service_id', 'user_id'])
     and not (doc -> 'client' ? 'id') and not (doc -> 'issuer' ? 'id') then
    passed := passed + 1;
  else
    failures := failures || ' P4';
  end if;

  -- P5: visitante abre → viewed + evento "viewed"; abrir de novo não duplica
  perform public.register_quote_view(pub_sent);
  perform public.register_quote_view(pub_sent);
  reset role;
  select status into t from public.quotes where id = q_sent;
  select count(*) into n from public.quote_events where quote_id = q_sent and type = 'viewed';
  if t = 'viewed' and n = 1 then passed := passed + 1; else failures := failures || ' P5(' || t || ',' || n || ')'; end if;

  -- P6: cancelado → só número, status e título (sem itens, valores, cliente)
  set local role anon;
  doc := public.get_public_quote(pub_cancel);
  if doc -> 'quote' ->> 'status' = 'cancelled' and doc -> 'client' = 'null'::jsonb
     and not (doc -> 'quote' ?| array['items', 'total_cents', 'notes']) and doc -> 'issuer' ->> 'name' = 'Ana Freelancer' then
    passed := passed + 1;
  else
    failures := failures || ' P6';
  end if;

  -- P7: visualizar cancelado ou rascunho não muda nada
  perform public.register_quote_view(pub_cancel);
  perform public.register_quote_view(pub_draft);
  reset role;
  select count(*) into n from public.quotes where id in (q_cancel, q_draft) and status in ('cancelled', 'draft');
  if n = 2 then passed := passed + 1; else failures := failures || ' P7'; end if;

  -- P8: outro usuário logado (b) conta como visitante
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.register_quote_view(pub_owner);
  reset role;
  select status into t from public.quotes where id = q_owner;
  if t = 'viewed' then passed := passed + 1; else failures := failures || ' P8(' || t || ')'; end if;

  -- P9: enviado com a validade vencida (antes da rotina diária) não vira "viewed"
  insert into public.quotes (user_id, client_id, quote_number, title, valid_until, status, sent_at,
    subtotal_cents, discount_total_cents, tax_total_cents, total_cents)
  values (a, ca, '2000-902', 'Vencido', v_today - 1, 'sent', now(), 0, 0, 0, 0)
  returning id, public_id into q_late, pub_late;
  set local role anon;
  perform public.register_quote_view(pub_late);
  reset role;
  select status into t from public.quotes where id = q_late;
  if t = 'sent' then passed := passed + 1; else failures := failures || ' P9(' || t || ')'; end if;

  -- P10: anon continua sem acesso direto às tabelas
  set local role anon;
  begin
    perform 1 from public.quotes;
    failures := failures || ' P10';
  exception when insufficient_privilege then passed := passed + 1;
  end;
  reset role;

  raise exception 'RESULTADO DO TESTE: % ok; falhas:%', passed, coalesce(nullif(failures, ''), ' nenhuma');
end;
$$;
