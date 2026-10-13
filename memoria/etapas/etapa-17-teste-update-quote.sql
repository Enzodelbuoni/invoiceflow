-- Teste da migração update_quote: edição de rascunho, conferência de
-- "alterado em outro lugar", guardas de imutabilidade e RLS. Tudo roda num
-- bloco que termina em RAISE EXCEPTION, então o Postgres desfaz TUDO.
-- Obs.: now() é fixo dentro da transação, então updated_at não muda entre
-- gravações aqui; o caso "desatualizado" usa uma data antiga de propósito.
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  ca uuid; ca2 uuid; cb uuid; sa uuid;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  q record;
  q1 uuid; q2 uuid;
  v_number text;
  v_updated timestamptz;
  n bigint;
  t text;
  passed int := 0;
  failures text := '';
  base_quote jsonb;
  item_ok jsonb;
  edited jsonb;
  edited_items jsonb;
begin
  insert into auth.users (id, email, aud, role)
  values (a, 'upd-a-' || a || '@example.com', 'authenticated', 'authenticated'),
         (b, 'upd-b-' || b || '@example.com', 'authenticated', 'authenticated');

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.clients (name) values ('Cliente B') returning id into cb;

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  insert into public.clients (name) values ('Cliente A') returning id into ca;
  insert into public.clients (name) values ('Cliente A2') returning id into ca2;
  insert into public.services (name, unit, price_cents) values ('Serviço A', 'hour', 15000) returning id into sa;

  item_ok := jsonb_build_object('service_id', sa, 'name', 'Hora técnica', 'description', null,
    'quantity_hundredths', 200, 'unit', 'hour', 'unit_price_cents', 15000, 'subtotal_cents', 30000);
  base_quote := jsonb_build_object('client_id', ca, 'title', 'Orçamento A', 'description', null,
    'valid_until', v_today + 15, 'discount_type', null, 'discount_value', null, 'tax_rate_bps', null,
    'subtotal_cents', 30000, 'discount_total_cents', 0, 'tax_total_cents', 0, 'total_cents', 30000,
    'notes', null, 'terms', null);
  -- Versão editada: outro cliente, título, desconto 10% + imposto 5% (total 115810) e 2 itens novos.
  edited := base_quote || jsonb_build_object('client_id', ca2, 'title', 'Orçamento A (revisto)',
    'notes', 'Pagamento em 2x', 'discount_type', 'percent', 'discount_value', 1000, 'tax_rate_bps', 500,
    'subtotal_cents', 122550, 'discount_total_cents', 12255, 'tax_total_cents', 5515, 'total_cents', 115810);
  edited_items := jsonb_build_array(
    jsonb_build_object('service_id', null, 'name', 'Suporte', 'description', 'Horas', 'quantity_hundredths', 150,
      'unit', 'hour', 'unit_price_cents', 15033, 'subtotal_cents', 22550),
    jsonb_build_object('service_id', sa, 'name', 'Design', 'description', null, 'quantity_hundredths', 100,
      'unit', 'project', 'unit_price_cents', 100000, 'subtotal_cents', 100000));

  select * into q from public.create_quote(base_quote, jsonb_build_array(item_ok));
  q1 := q.id;
  v_number := q.quote_number;
  select updated_at into v_updated from public.quotes where id = q1;

  -- U1: editar o rascunho → mesmo número; campos, totais e itens trocados
  select * into q from public.update_quote(q1, v_updated, edited, edited_items);
  select count(*) into n from public.quotes
  where id = q1 and quote_number = v_number and client_id = ca2 and title = 'Orçamento A (revisto)'
    and notes = 'Pagamento em 2x' and total_cents = 115810 and status = 'draft';
  if q.id = q1 and q.quote_number = v_number and n = 1 then passed := passed + 1; else failures := failures || ' U1a'; end if;
  select string_agg(name, ',' order by position) into t from public.quote_items where quote_id = q1;
  if t = 'Suporte,Design' then passed := passed + 1; else failures := failures || ' U1b(' || coalesce(t, '-') || ')'; end if;

  -- U2: updated_at diferente do aberto para edição → PT409 (não sobrescreve)
  begin
    perform public.update_quote(q1, '2000-01-01'::timestamptz, base_quote, jsonb_build_array(item_ok));
    failures := failures || ' U2';
  exception when sqlstate 'PT409' then passed := passed + 1;
  end;

  -- U3: subtotal que não bate → 23514 e nada muda (título e itens continuam os da U1)
  begin
    perform public.update_quote(q1, v_updated, edited || jsonb_build_object('title', 'Não deveria', 'subtotal_cents', 1), edited_items);
    failures := failures || ' U3a';
  exception when check_violation then passed := passed + 1;
  end;
  select count(*) into n from public.quote_items where quote_id = q1;
  select title into t from public.quotes where id = q1;
  if n = 2 and t = 'Orçamento A (revisto)' then passed := passed + 1; else failures := failures || ' U3b'; end if;

  -- U4: cliente de outro usuário → FK composta recusa
  begin
    perform public.update_quote(q1, v_updated, edited || jsonb_build_object('client_id', cb), edited_items);
    failures := failures || ' U4';
  exception when foreign_key_violation then passed := passed + 1;
  end;

  -- U5: sem itens e validade vencida → 22023
  begin
    perform public.update_quote(q1, v_updated, edited, '[]'::jsonb);
    failures := failures || ' U5a';
  exception when invalid_parameter_value then passed := passed + 1;
  end;
  begin
    perform public.update_quote(q1, v_updated, edited || jsonb_build_object('valid_until', v_today - 1), edited_items);
    failures := failures || ' U5b';
  exception when invalid_parameter_value then passed := passed + 1;
  end;

  -- U6: número e link público nunca mudam, nem em rascunho → 55000
  begin
    update public.quotes set quote_number = '2000-001' where id = q1;
    failures := failures || ' U6a';
  exception when object_not_in_prerequisite_state then passed := passed + 1;
  end;
  begin
    update public.quotes set public_id = gen_random_uuid() where id = q1;
    failures := failures || ' U6b';
  exception when object_not_in_prerequisite_state then passed := passed + 1;
  end;

  -- U7: outro usuário (B) não edita o orçamento de A → "não encontrado" (P0002)
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  begin
    perform public.update_quote(q1, v_updated, edited, edited_items);
    failures := failures || ' U7';
  exception when no_data_found then passed := passed + 1;
  end;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);

  -- Marca como enviado (por enquanto um UPDATE direto ainda pode: Sprint 12).
  update public.quotes set status = 'sent', sent_at = now() where id = q1;

  -- U8: enviado não é editado pela função → 55000
  begin
    perform public.update_quote(q1, v_updated, edited, edited_items);
    failures := failures || ' U8';
  exception when object_not_in_prerequisite_state then passed := passed + 1;
  end;

  -- U9: enviado: UPDATE direto do conteúdo → 55000; mudança de status continua possível
  begin
    update public.quotes set total_cents = 1, subtotal_cents = 1 where id = q1;
    failures := failures || ' U9a';
  exception when object_not_in_prerequisite_state then passed := passed + 1;
  end;
  begin
    update public.quotes set title = 'Trocado' where id = q1;
    failures := failures || ' U9b';
  exception when object_not_in_prerequisite_state then passed := passed + 1;
  end;
  update public.quotes set status = 'viewed' where id = q1;
  get diagnostics n = row_count;
  if n = 1 then passed := passed + 1; else failures := failures || ' U9c'; end if;

  -- U10: itens de orçamento enviado: inserir, alterar e excluir → 55000
  begin
    insert into public.quote_items (quote_id, position, name, quantity_hundredths, unit, unit_price_cents, subtotal_cents)
    values (q1, 50, 'Extra', 100, 'unit', 100, 100);
    failures := failures || ' U10a';
  exception when object_not_in_prerequisite_state then passed := passed + 1;
  end;
  begin
    update public.quote_items set unit_price_cents = 1, subtotal_cents = 2 where quote_id = q1 and position = 0;
    failures := failures || ' U10b';
  exception when object_not_in_prerequisite_state then passed := passed + 1;
  end;
  begin
    delete from public.quote_items where quote_id = q1;
    failures := failures || ' U10c';
  exception when object_not_in_prerequisite_state then passed := passed + 1;
  end;

  -- U11: excluir o serviço usado no orçamento enviado → service_id NULL, snapshot intacto
  delete from public.services where id = sa;
  select count(*) into n from public.quote_items where quote_id = q1 and service_id is null and name = 'Design';
  if n = 1 then passed := passed + 1; else failures := failures || ' U11'; end if;

  -- U12: o create_quote continua funcionando com a guarda dos itens
  select * into q from public.create_quote(base_quote, jsonb_build_array(item_ok || jsonb_build_object('service_id', null)));
  q2 := q.id;
  select count(*) into n from public.quote_items where quote_id = q2;
  if n = 1 then passed := passed + 1; else failures := failures || ' U12'; end if;

  -- U13: excluir um orçamento (enviado ou rascunho) apaga os itens em cascata sem esbarrar na guarda
  delete from public.quotes where id = q2;
  select count(*) into n from public.quote_items where quote_id = q2;
  if n = 0 then passed := passed + 1; else failures := failures || ' U13'; end if;

  -- U14: anon não chama a função
  reset role;
  set local role anon;
  begin
    perform public.update_quote(q1, v_updated, edited, edited_items);
    failures := failures || ' U14';
  exception when insufficient_privilege then passed := passed + 1;
  end;

  -- U15: excluir a CONTA com um orçamento já visualizado apaga tudo em cascata
  reset role;
  delete from auth.users where id = a;
  select count(*) into n from public.quotes where user_id = a;
  if n = 0 then passed := passed + 1; else failures := failures || ' U15'; end if;

  raise exception 'RESULTADO DO TESTE: % ok; falhas:%', passed, coalesce(nullif(failures, ''), ' nenhuma');
end;
$$;
