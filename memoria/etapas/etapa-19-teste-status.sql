-- Teste da migração quote_status_machine: transições só pelas funções,
-- histórico de eventos, expiração, exclusão só de rascunhos e RLS. Tudo roda
-- num bloco que termina em RAISE EXCEPTION, então o Postgres desfaz TUDO.
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  ca uuid;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  q record;
  q1 uuid; q2 uuid; q3 uuid; q4 uuid;
  v_updated timestamptz;
  n bigint;
  t text;
  passed int := 0;
  failures text := '';
  base_quote jsonb;
  item_ok jsonb;
begin
  insert into auth.users (id, email, aud, role)
  values (a, 'st-a-' || a || '@example.com', 'authenticated', 'authenticated'),
         (b, 'st-b-' || b || '@example.com', 'authenticated', 'authenticated');

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.clients (name) values ('Cliente A') returning id into ca;

  item_ok := jsonb_build_object('service_id', null, 'name', 'Hora técnica', 'description', null,
    'quantity_hundredths', 200, 'unit', 'hour', 'unit_price_cents', 15000, 'subtotal_cents', 30000);
  base_quote := jsonb_build_object('client_id', ca, 'title', 'Orçamento A', 'description', null,
    'valid_until', v_today + 15, 'discount_type', null, 'discount_value', null, 'tax_rate_bps', null,
    'subtotal_cents', 30000, 'discount_total_cents', 0, 'tax_total_cents', 0, 'total_cents', 30000,
    'notes', null, 'terms', null);

  select * into q from public.create_quote(base_quote, jsonb_build_array(item_ok));
  q1 := q.id;

  -- S1: criar grava o evento "created"
  select count(*) into n from public.quote_events where quote_id = q1 and type = 'created';
  if n = 1 then passed := passed + 1; else failures := failures || ' S1'; end if;

  -- S2: editar (update_quote) grava "updated"
  select updated_at into v_updated from public.quotes where id = q1;
  perform public.update_quote(q1, v_updated, base_quote || jsonb_build_object('title', 'Orçamento A (rev)'), jsonb_build_array(item_ok));
  select count(*) into n from public.quote_events where quote_id = q1 and type = 'updated';
  if n = 1 then passed := passed + 1; else failures := failures || ' S2'; end if;

  -- S3: UPDATE direto do status (sem a função) → 55000
  begin
    update public.quotes set status = 'sent', sent_at = now() where id = q1;
    failures := failures || ' S3';
  exception when object_not_in_prerequisite_state then passed := passed + 1;
  end;

  -- S4: UPDATE direto só da data de envio → 55000
  begin
    update public.quotes set sent_at = now() where id = q1;
    failures := failures || ' S4';
  exception when object_not_in_prerequisite_state then passed := passed + 1;
  end;

  -- S5: enviar → sent + sent_at + evento "sent" (com "from": "draft")
  perform public.send_quote(q1);
  select count(*) into n from public.quotes where id = q1 and status = 'sent' and sent_at is not null;
  select count(*) + n * 10 into n from public.quote_events where quote_id = q1 and type = 'sent' and metadata ->> 'from' = 'draft';
  if n = 11 then passed := passed + 1; else failures := failures || ' S5(' || n || ')'; end if;

  -- S6: enviar de novo → 55000
  begin
    perform public.send_quote(q1);
    failures := failures || ' S6';
  exception when object_not_in_prerequisite_state then passed := passed + 1;
  end;

  -- S7: enviado → aprovado por UPDATE direto (fingir aprovação) → 55000
  begin
    update public.quotes set status = 'approved', approved_at = now() where id = q1;
    failures := failures || ' S7';
  exception when object_not_in_prerequisite_state then passed := passed + 1;
  end;

  -- S8: excluir orçamento enviado → RLS não deixa (0 linhas)
  delete from public.quotes where id = q1;
  get diagnostics n = row_count;
  if n = 0 then passed := passed + 1; else failures := failures || ' S8'; end if;

  -- S9: cancelar o enviado → cancelled + evento; cancelar de novo → 55000
  perform public.cancel_quote(q1);
  select count(*) into n from public.quotes where id = q1 and status = 'cancelled';
  if n = 1 then passed := passed + 1; else failures := failures || ' S9a'; end if;
  begin
    perform public.cancel_quote(q1);
    failures := failures || ' S9b';
  exception when object_not_in_prerequisite_state then passed := passed + 1;
  end;

  -- S10: enviar com a validade vencida → 22023 (rascunho com a data mudada direto)
  select * into q from public.create_quote(base_quote, jsonb_build_array(item_ok));
  q2 := q.id;
  update public.quotes set valid_until = v_today - 1 where id = q2;
  begin
    perform public.send_quote(q2);
    failures := failures || ' S10';
  exception when invalid_parameter_value then passed := passed + 1;
  end;

  -- S11: excluir rascunho → 1 linha (e os eventos dele vão junto)
  delete from public.quotes where id = q2;
  get diagnostics n = row_count;
  select count(*) into t from public.quote_events where quote_id = q2;
  if n = 1 and t = '0' then passed := passed + 1; else failures := failures || ' S11'; end if;

  -- S12: o dono não grava eventos direto
  begin
    insert into public.quote_events (quote_id, user_id, type) values (q1, a, 'approved');
    failures := failures || ' S12';
  exception when insufficient_privilege then passed := passed + 1;
  end;

  -- S13: outro usuário: não envia/cancela (P0002) e não vê os eventos
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  begin
    perform public.send_quote(q1);
    failures := failures || ' S13a';
  exception when no_data_found then passed := passed + 1;
  end;
  begin
    perform public.cancel_quote(q1);
    failures := failures || ' S13b';
  exception when no_data_found then passed := passed + 1;
  end;
  select count(*) into n from public.quote_events where quote_id = q1;
  if n = 0 then passed := passed + 1; else failures := failures || ' S13c'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);

  -- S14: o dono não chama a rotina de expiração
  begin
    perform private.expire_quotes();
    failures := failures || ' S14';
  exception when insufficient_privilege then passed := passed + 1;
  end;

  -- S15: anon não chama send/cancel
  reset role;
  set local role anon;
  begin
    perform public.send_quote(q1);
    failures := failures || ' S15a';
  exception when insufficient_privilege then passed := passed + 1;
  end;
  begin
    perform public.cancel_quote(q1);
    failures := failures || ' S15b';
  exception when insufficient_privilege then passed := passed + 1;
  end;

  -- S16: expiração: enviado com validade vencida → expired + evento; o que está em dia não muda
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select * into q from public.create_quote(base_quote, jsonb_build_array(item_ok));
  q4 := q.id;
  perform public.send_quote(q4);
  reset role;
  -- Como dono do banco (só no teste): um orçamento já enviado e vencido.
  insert into public.quotes (user_id, client_id, quote_number, title, valid_until, status, sent_at,
    subtotal_cents, discount_total_cents, tax_total_cents, total_cents)
  values (a, ca, '2000-901', 'Vencido', v_today - 1, 'sent', now(), 0, 0, 0, 0)
  returning id into q3;
  perform private.expire_quotes();
  select count(*) into n from public.quotes where id = q3 and status = 'expired';
  select count(*) + n * 10 into n from public.quotes where id = q4 and status = 'sent';
  if n = 11 then passed := passed + 1; else failures := failures || ' S16a(' || n || ')'; end if;
  select count(*) into n from public.quote_events where quote_id = q3 and type = 'expired';
  if n = 1 then passed := passed + 1; else failures := failures || ' S16b'; end if;

  -- S17: transição inexistente mesmo com a variável ligada (expired → sent) → 55000
  begin
    perform set_config('invoiceflow.status_transition', 'on', true);
    update public.quotes set status = 'sent' where id = q3;
    failures := failures || ' S17';
  exception when object_not_in_prerequisite_state then passed := passed + 1;
  end;
  perform set_config('invoiceflow.status_transition', '', true);

  -- S18: a rotina diária está agendada
  select count(*) into n from cron.job where jobname = 'invoiceflow-expire-quotes' and schedule = '1 3 * * *';
  if n = 1 then passed := passed + 1; else failures := failures || ' S18'; end if;

  -- S19: excluir a conta apaga orçamentos e eventos em cascata
  delete from auth.users where id = a;
  select count(*) into n from public.quote_events where user_id = a;
  if n = 0 then passed := passed + 1; else failures := failures || ' S19'; end if;

  raise exception 'RESULTADO DO TESTE: % ok; falhas:%', passed, coalesce(nullif(failures, ''), ' nenhuma');
end;
$$;
