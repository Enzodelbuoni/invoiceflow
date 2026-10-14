-- Teste da migração quote_downloads: evento "downloaded" com quem baixou
-- (cliente/dono), sem rascunho/cancelada, repetição em 10 minutos ignorada,
-- ninguém grava evento direto. Bloco que termina em RAISE EXCEPTION (desfaz tudo).
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  ca uuid;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  q record;
  q_sent uuid; q_draft uuid; q_cancel uuid;
  pub_sent uuid; pub_draft uuid; pub_cancel uuid;
  n bigint;
  passed int := 0;
  failures text := '';
  base_quote jsonb;
  item_ok jsonb;
begin
  insert into auth.users (id, email, aud, role)
  values (a, 'dl-a-' || a || '@example.com', 'authenticated', 'authenticated'),
         (b, 'dl-b-' || b || '@example.com', 'authenticated', 'authenticated');

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.clients (name) values ('Cliente A') returning id into ca;
  item_ok := jsonb_build_object('service_id', null, 'name', 'Hora técnica', 'description', null,
    'quantity_hundredths', 200, 'unit', 'hour', 'unit_price_cents', 15000, 'subtotal_cents', 30000);
  base_quote := jsonb_build_object('client_id', ca, 'title', 'Orçamento A', 'description', null,
    'valid_until', v_today + 15, 'discount_type', null, 'discount_value', null, 'tax_rate_bps', null,
    'subtotal_cents', 30000, 'discount_total_cents', 0, 'tax_total_cents', 0, 'total_cents', 30000,
    'notes', null, 'terms', null);
  select * into q from public.create_quote(base_quote, jsonb_build_array(item_ok)); q_sent := q.id;
  perform public.send_quote(q_sent);
  select * into q from public.create_quote(base_quote, jsonb_build_array(item_ok)); q_draft := q.id;
  select * into q from public.create_quote(base_quote, jsonb_build_array(item_ok)); q_cancel := q.id;
  perform public.send_quote(q_cancel);
  perform public.cancel_quote(q_cancel);
  reset role;
  select public_id into pub_sent from public.quotes where id = q_sent;
  select public_id into pub_draft from public.quotes where id = q_draft;
  select public_id into pub_cancel from public.quotes where id = q_cancel;

  -- D1: cliente (anon) baixa → evento "downloaded" com by = client
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  perform public.register_quote_download(pub_sent);
  -- D2: baixar de novo em seguida não duplica
  perform public.register_quote_download(pub_sent);
  reset role;
  select count(*) into n from public.quote_events
  where quote_id = q_sent and type = 'downloaded' and metadata ->> 'by' = 'client';
  if n = 1 then passed := passed + 1; else failures := failures || ' D1/D2(' || n || ')'; end if;

  -- D3: o dono logado baixa → outro evento, com by = owner (e também não duplica)
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.register_quote_download(pub_sent);
  perform public.register_quote_download(pub_sent);
  reset role;
  select count(*) into n from public.quote_events
  where quote_id = q_sent and type = 'downloaded' and metadata ->> 'by' = 'owner';
  if n = 1 then passed := passed + 1; else failures := failures || ' D3(' || n || ')'; end if;

  -- D4: outro usuário logado conta como cliente (e cai na janela de 10 min do cliente)
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.register_quote_download(pub_sent);
  reset role;
  select count(*) into n from public.quote_events where quote_id = q_sent and type = 'downloaded';
  if n = 2 then passed := passed + 1; else failures := failures || ' D4(' || n || ')'; end if;

  -- D5: depois de 10 minutos, um novo download do cliente conta de novo
  update public.quote_events set created_at = now() - interval '11 minutes'
  where quote_id = q_sent and type = 'downloaded';
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  perform public.register_quote_download(pub_sent);
  reset role;
  select count(*) into n from public.quote_events
  where quote_id = q_sent and type = 'downloaded' and metadata ->> 'by' = 'client';
  if n = 2 then passed := passed + 1; else failures := failures || ' D5(' || n || ')'; end if;

  -- D6: rascunho, cancelada, inexistente e nulo → nada
  set local role anon;
  perform public.register_quote_download(pub_draft);
  perform public.register_quote_download(pub_cancel);
  perform public.register_quote_download(gen_random_uuid());
  perform public.register_quote_download(null);
  reset role;
  select count(*) into n from public.quote_events where quote_id in (q_draft, q_cancel) and type = 'downloaded';
  if n = 0 then passed := passed + 1; else failures := failures || ' D6(' || n || ')'; end if;

  -- D7: ninguém grava evento direto (nem o dono, nem anon)
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.quote_events (quote_id, user_id, type) values (q_sent, a, 'downloaded');
    failures := failures || ' D7a';
  exception when insufficient_privilege then passed := passed + 1;
  end;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  begin
    insert into public.quote_events (quote_id, user_id, type) values (q_sent, a, 'downloaded');
    failures := failures || ' D7b';
  exception when insufficient_privilege then passed := passed + 1;
  end;
  reset role;

  -- D8: o dono lê os eventos de download; outro usuário não
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.quote_events where quote_id = q_sent and type = 'downloaded';
  reset role;
  if n = 3 then passed := passed + 1; else failures := failures || ' D8a(' || n || ')'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.quote_events where quote_id = q_sent;
  reset role;
  if n = 0 then passed := passed + 1; else failures := failures || ' D8b(' || n || ')'; end if;

  raise exception 'RESULTADO DO TESTE: % ok; falhas:%', passed, coalesce(nullif(failures, ''), ' nenhuma');
end;
$$;
