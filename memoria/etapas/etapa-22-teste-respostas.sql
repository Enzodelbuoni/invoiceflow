-- Teste da migração quote_responses: aprovar/recusar pela página pública,
-- conferências do servidor (status, validade, dono, termos, dados), uma
-- resposta só, leitura pública com a resposta, RLS e cascata. Tudo num bloco
-- que termina em RAISE EXCEPTION (o Postgres desfaz TUDO).
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  ca uuid;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  q record;
  q_ok uuid; q_dec uuid; q_owner uuid; q_draft uuid; q_cancel uuid; q_late uuid; q_exp uuid; q_b uuid;
  pub_ok uuid; pub_dec uuid; pub_owner uuid; pub_draft uuid; pub_cancel uuid; pub_late uuid; pub_exp uuid; pub_b uuid;
  doc jsonb;
  r record;
  ts timestamptz;
  n bigint;
  t text;
  passed int := 0;
  failures text := '';
  base_quote jsonb;
  item_ok jsonb;
begin
  insert into auth.users (id, email, aud, role)
  values (a, 'resp-a-' || a || '@example.com', 'authenticated', 'authenticated'),
         (b, 'resp-b-' || b || '@example.com', 'authenticated', 'authenticated');

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.clients (name) values ('Cliente A') returning id into ca;

  item_ok := jsonb_build_object('service_id', null, 'name', 'Hora técnica', 'description', null,
    'quantity_hundredths', 200, 'unit', 'hour', 'unit_price_cents', 15000, 'subtotal_cents', 30000);
  base_quote := jsonb_build_object('client_id', ca, 'title', 'Orçamento A', 'description', null,
    'valid_until', v_today, 'discount_type', null, 'discount_value', null, 'tax_rate_bps', null,
    'subtotal_cents', 30000, 'discount_total_cents', 0, 'tax_total_cents', 0, 'total_cents', 30000,
    'notes', null, 'terms', 'Pagamento em 2x.');

  -- Validade = hoje (vale até o fim do dia): ainda pode ser respondida.
  select * into q from public.create_quote(base_quote, jsonb_build_array(item_ok)); q_ok := q.id;
  perform public.send_quote(q_ok);
  select * into q from public.create_quote(base_quote, jsonb_build_array(item_ok)); q_dec := q.id;
  perform public.send_quote(q_dec);
  select * into q from public.create_quote(base_quote, jsonb_build_array(item_ok)); q_owner := q.id;
  perform public.send_quote(q_owner);
  select * into q from public.create_quote(base_quote, jsonb_build_array(item_ok)); q_draft := q.id;
  select * into q from public.create_quote(base_quote, jsonb_build_array(item_ok)); q_cancel := q.id;
  perform public.send_quote(q_cancel);
  perform public.cancel_quote(q_cancel);
  select * into q from public.create_quote(base_quote, jsonb_build_array(item_ok)); q_b := q.id;
  perform public.send_quote(q_b);
  reset role;

  -- Vencida pela data (antes da rotina diária) e já marcada como expirada.
  insert into public.quotes (user_id, client_id, quote_number, title, valid_until, status, sent_at,
    subtotal_cents, discount_total_cents, tax_total_cents, total_cents)
  values (a, ca, '2000-901', 'Vencida', v_today - 1, 'sent', now(), 0, 0, 0, 0)
  returning id, public_id into q_late, pub_late;
  insert into public.quotes (user_id, client_id, quote_number, title, valid_until, status, sent_at,
    subtotal_cents, discount_total_cents, tax_total_cents, total_cents)
  values (a, ca, '2000-902', 'Expirada', v_today - 3, 'expired', now(), 0, 0, 0, 0)
  returning id, public_id into q_exp, pub_exp;

  select public_id into pub_ok from public.quotes where id = q_ok;
  select public_id into pub_dec from public.quotes where id = q_dec;
  select public_id into pub_owner from public.quotes where id = q_owner;
  select public_id into pub_draft from public.quotes where id = q_draft;
  select public_id into pub_cancel from public.quotes where id = q_cancel;
  select public_id into pub_b from public.quotes where id = q_b;

  -- Como visitante sem conta (anon)
  perform set_config('request.jwt.claims', '', true);
  set local role anon;

  -- R1: aprovar sem aceitar os termos → 23514, nada muda
  begin
    perform public.approve_quote(pub_ok, 'Bruno Cliente', 'bruno@cliente.com', false);
    failures := failures || ' R1';
  exception when check_violation then passed := passed + 1;
  end;

  -- R2: nome curto, e-mail inválido, nome nulo → 23514
  begin
    perform public.approve_quote(pub_ok, ' B ', 'bruno@cliente.com', true);
    failures := failures || ' R2a';
  exception when check_violation then passed := passed + 1;
  end;
  begin
    perform public.approve_quote(pub_ok, 'Bruno Cliente', 'bruno-sem-arroba', true);
    failures := failures || ' R2b';
  exception when check_violation then passed := passed + 1;
  end;
  begin
    perform public.approve_quote(pub_ok, null, 'bruno@cliente.com', true);
    failures := failures || ' R2c';
  exception when check_violation then passed := passed + 1;
  end;

  -- R3: aprovar → approved + approved_at + resposta + evento (com o "de onde")
  ts := public.approve_quote(pub_ok, '  Bruno Cliente ', ' Bruno@Cliente.COM ', true, '203.0.113.7', 'Mozilla/5.0 Teste');
  reset role;
  select * into r from public.quote_responses where quote_id = q_ok;
  select status into t from public.quotes where id = q_ok;
  if t = 'approved' and (select approved_at from public.quotes where id = q_ok) = ts
     and r.decision = 'approved' and r.signer_name = 'Bruno Cliente' and r.signer_email = 'bruno@cliente.com'
     and r.ip_address = '203.0.113.7'::inet and r.user_agent = 'Mozilla/5.0 Teste' and r.user_id = a
     and r.created_at = ts and r.reason is null then
    passed := passed + 1;
  else
    failures := failures || ' R3(' || coalesce(t, '?') || ')';
  end if;
  select count(*) into n from public.quote_events
  where quote_id = q_ok and type = 'approved' and metadata ->> 'from' = 'sent';
  if n = 1 then passed := passed + 1; else failures := failures || ' R3b'; end if;
  -- As tentativas recusadas não deixaram resposta a mais
  select count(*) into n from public.quote_responses where quote_id = q_ok;
  if n = 1 then passed := passed + 1; else failures := failures || ' R3c'; end if;

  -- R4: aprovar de novo ou recusar a aprovada → 55000
  set local role anon;
  begin
    perform public.approve_quote(pub_ok, 'Outra Pessoa', 'outra@cliente.com', true);
    failures := failures || ' R4a';
  exception when object_not_in_prerequisite_state then passed := passed + 1;
  end;
  begin
    perform public.decline_quote(pub_ok, 'Mudei de ideia');
    failures := failures || ' R4b';
  exception when object_not_in_prerequisite_state then passed := passed + 1;
  end;

  -- R5: recusar uma visualizada, com motivo → declined + declined_at + motivo
  perform public.register_quote_view(pub_dec);
  ts := public.decline_quote(pub_dec, '  Achei caro.  ');
  reset role;
  select * into r from public.quote_responses where quote_id = q_dec;
  if (select status from public.quotes where id = q_dec) = 'declined'
     and (select declined_at from public.quotes where id = q_dec) = ts
     and r.decision = 'declined' and r.reason = 'Achei caro.' and r.signer_name is null and r.signer_email is null
     and r.ip_address is null then
    passed := passed + 1;
  else
    failures := failures || ' R5';
  end if;
  select count(*) into n from public.quote_events
  where quote_id = q_dec and type = 'declined' and metadata ->> 'from' = 'viewed';
  if n = 1 then passed := passed + 1; else failures := failures || ' R5b'; end if;

  -- R6: vencida pela data e expirada → 22023
  set local role anon;
  begin
    perform public.approve_quote(pub_late, 'Bruno Cliente', 'bruno@cliente.com', true);
    failures := failures || ' R6a';
  exception when invalid_parameter_value then passed := passed + 1;
  end;
  begin
    perform public.decline_quote(pub_exp, null);
    failures := failures || ' R6b';
  exception when invalid_parameter_value then passed := passed + 1;
  end;

  -- R7: cancelada → 55000; rascunho, inexistente e nulo → P0002
  begin
    perform public.approve_quote(pub_cancel, 'Bruno Cliente', 'bruno@cliente.com', true);
    failures := failures || ' R7a';
  exception when object_not_in_prerequisite_state then passed := passed + 1;
  end;
  begin
    perform public.approve_quote(pub_draft, 'Bruno Cliente', 'bruno@cliente.com', true);
    failures := failures || ' R7b';
  exception when no_data_found then passed := passed + 1;
  end;
  begin
    perform public.decline_quote(gen_random_uuid(), null);
    failures := failures || ' R7c';
  exception when no_data_found then passed := passed + 1;
  end;
  begin
    perform public.decline_quote(null, null);
    failures := failures || ' R7d';
  exception when no_data_found then passed := passed + 1;
  end;
  reset role;

  -- R8: o dono logado não responde à própria proposta → PT403
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.approve_quote(pub_owner, 'Ana Dona', 'ana@dona.com', true);
    failures := failures || ' R8a';
  exception when sqlstate 'PT403' then passed := passed + 1;
  end;
  begin
    perform public.decline_quote(pub_owner, null);
    failures := failures || ' R8b';
  exception when sqlstate 'PT403' then passed := passed + 1;
  end;

  -- R9: leitura pública para o dono → viewer_is_owner = true
  doc := public.get_public_quote(pub_owner);
  if (doc ->> 'viewer_is_owner')::boolean is true and doc -> 'response' = 'null'::jsonb then
    passed := passed + 1;
  else
    failures := failures || ' R9';
  end if;

  -- R10: o dono lê a resposta (com e-mail e IP) dos próprios orçamentos
  select count(*) into n from public.quote_responses where quote_id in (q_ok, q_dec);
  if n = 2 then passed := passed + 1; else failures := failures || ' R10(' || n || ')'; end if;

  -- R11: o dono não grava, não altera e não apaga respostas pela API
  begin
    insert into public.quote_responses (quote_id, user_id, decision, signer_name, signer_email)
    values (q_owner, a, 'approved', 'Forjado', 'forjado@x.com');
    failures := failures || ' R11a';
  exception when insufficient_privilege then passed := passed + 1;
  end;
  begin
    update public.quote_responses set signer_name = 'Outro' where quote_id = q_ok;
    failures := failures || ' R11b';
  exception when insufficient_privilege then passed := passed + 1;
  end;
  begin
    delete from public.quote_responses where quote_id = q_ok;
    failures := failures || ' R11c';
  exception when insufficient_privilege then passed := passed + 1;
  end;

  -- R12: nem muda o status para "aprovado" com UPDATE direto (guarda)
  begin
    update public.quotes set status = 'approved', approved_at = now() where id = q_owner;
    failures := failures || ' R12';
  exception when object_not_in_prerequisite_state then passed := passed + 1;
  end;
  reset role;

  -- R13: outro usuário logado (b) responde como visitante e não lê respostas alheias
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.approve_quote(pub_b, 'Bruno Logado', 'bruno@logado.com', true);
  select count(*) into n from public.quote_responses;
  if n = 0 then passed := passed + 1; else failures := failures || ' R13(' || n || ')'; end if;
  doc := public.get_public_quote(pub_b);
  if (doc ->> 'viewer_is_owner')::boolean is false then passed := passed + 1; else failures := failures || ' R13b'; end if;
  reset role;

  -- R14: leitura pública da aprovada: resposta só com decisão, nome e data
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  doc := public.get_public_quote(pub_ok);
  if doc -> 'quote' ->> 'status' = 'approved'
     and doc -> 'response' ->> 'decision' = 'approved'
     and doc -> 'response' ->> 'signer_name' = 'Bruno Cliente'
     and doc -> 'response' ? 'responded_at'
     and not (doc -> 'response' ?| array['signer_email', 'ip_address', 'user_agent', 'reason', 'id', 'user_id'])
     and (doc ->> 'viewer_is_owner')::boolean is false then
    passed := passed + 1;
  else
    failures := failures || ' R14';
  end if;
  -- recusada: sem nome e sem o motivo
  doc := public.get_public_quote(pub_dec);
  if doc -> 'response' ->> 'decision' = 'declined' and not (doc -> 'response' ? 'reason') then
    passed := passed + 1;
  else
    failures := failures || ' R14b';
  end if;
  -- cancelada continua mínima
  doc := public.get_public_quote(pub_cancel);
  if doc -> 'client' = 'null'::jsonb and not (doc -> 'quote' ? 'items') then
    passed := passed + 1;
  else
    failures := failures || ' R14c';
  end if;

  -- R15: anon sem acesso direto à tabela nem à função de trava
  begin
    perform 1 from public.quote_responses;
    failures := failures || ' R15a';
  exception when insufficient_privilege then passed := passed + 1;
  end;
  begin
    perform private.lock_quote_for_response(pub_owner);
    failures := failures || ' R15b';
  exception when insufficient_privilege then passed := passed + 1;
  end;
  reset role;

  -- R16: excluir a conta apaga as respostas em cascata
  delete from auth.users where id = a;
  select count(*) into n from public.quote_responses where user_id = a;
  if n = 0 then passed := passed + 1; else failures := failures || ' R16'; end if;

  raise exception 'RESULTADO DO TESTE: % ok; falhas:%', passed, coalesce(nullif(failures, ''), ' nenhuma');
end;
$$;
