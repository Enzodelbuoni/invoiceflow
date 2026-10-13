-- Teste da migração create_quotes: RLS, CHECKs, FKs compostas, numeração e a
-- função create_quote. Tudo roda num bloco que termina em RAISE EXCEPTION, então
-- o Postgres desfaz TUDO (usuários, clientes, orçamentos, contadores).
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  ca uuid; cb uuid; sa uuid; sb uuid;
  v_year text := extract(year from (now() at time zone 'America/Sao_Paulo'))::text;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  q record;
  q1 uuid; q2 uuid;
  n bigint;
  t text;
  passed int := 0;
  failures text := '';
  base_quote jsonb;
  item_ok jsonb;
begin
  insert into auth.users (id, email, aud, role)
  values (a, 'rls-a-' || a || '@example.com', 'authenticated', 'authenticated'),
         (b, 'rls-b-' || b || '@example.com', 'authenticated', 'authenticated');

  -- Dados de cada usuário (criados como o próprio usuário, pelo RLS).
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.clients (name) values ('Cliente B') returning id into cb;
  insert into public.services (name, unit, price_cents) values ('Serviço B', 'hour', 10000) returning id into sb;

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  insert into public.clients (name) values ('Cliente A') returning id into ca;
  insert into public.services (name, unit, price_cents) values ('Serviço A', 'hour', 15000) returning id into sa;

  item_ok := jsonb_build_object('service_id', sa, 'name', 'Hora técnica', 'description', null,
    'quantity_hundredths', 200, 'unit', 'hour', 'unit_price_cents', 15000, 'subtotal_cents', 30000);
  base_quote := jsonb_build_object('client_id', ca, 'title', 'Orçamento A', 'description', null,
    'valid_until', v_today + 15, 'discount_type', null, 'discount_value', null, 'tax_rate_bps', null,
    'subtotal_cents', 30000, 'discount_total_cents', 0, 'tax_total_cents', 0, 'total_cents', 30000,
    'notes', null, 'terms', null);

  -- T1: cria o 1º orçamento → AAAA-001
  select * into q from public.create_quote(base_quote, jsonb_build_array(item_ok));
  q1 := q.id;
  if q.quote_number = v_year || '-001' then passed := passed + 1; else failures := failures || ' T1(' || q.quote_number || ')'; end if;

  -- T2: desconto 10% + imposto 5% (mesmos números do motor de cálculos: total 115810) → AAAA-002
  select * into q from public.create_quote(
    base_quote || jsonb_build_object('discount_type', 'percent', 'discount_value', 1000, 'tax_rate_bps', 500,
      'subtotal_cents', 122550, 'discount_total_cents', 12255, 'tax_total_cents', 5515, 'total_cents', 115810),
    jsonb_build_array(
      jsonb_build_object('service_id', null, 'name', 'Suporte', 'description', 'Horas', 'quantity_hundredths', 150,
        'unit', 'hour', 'unit_price_cents', 15033, 'subtotal_cents', 22550),
      jsonb_build_object('service_id', null, 'name', 'Design', 'description', null, 'quantity_hundredths', 100,
        'unit', 'project', 'unit_price_cents', 100000, 'subtotal_cents', 100000)));
  q2 := q.id;
  select count(*) into n from public.quote_items where quote_id = q2;
  if q.quote_number = v_year || '-002' and n = 2 then passed := passed + 1; else failures := failures || ' T2'; end if;

  -- T3: subtotal que não bate com os itens → 23514 (e não consome número)
  begin
    perform public.create_quote(base_quote || jsonb_build_object('subtotal_cents', 30001, 'total_cents', 30001), jsonb_build_array(item_ok));
    failures := failures || ' T3';
  exception when check_violation then passed := passed + 1;
  end;

  -- T4: total de desconto incoerente → CHECK
  begin
    perform public.create_quote(base_quote || jsonb_build_object('discount_type', 'percent', 'discount_value', 1000,
      'discount_total_cents', 1, 'total_cents', 29999), jsonb_build_array(item_ok));
    failures := failures || ' T4';
  exception when check_violation then passed := passed + 1;
  end;

  -- T5: subtotal do item incoerente (2 × 150,00 ≠ 299,00) → CHECK
  begin
    perform public.create_quote(base_quote || jsonb_build_object('subtotal_cents', 29900, 'total_cents', 29900),
      jsonb_build_array(item_ok || jsonb_build_object('subtotal_cents', 29900)));
    failures := failures || ' T5';
  exception when check_violation then passed := passed + 1;
  end;

  -- T6: cliente de OUTRO usuário → FK composta recusa
  begin
    perform public.create_quote(base_quote || jsonb_build_object('client_id', cb), jsonb_build_array(item_ok));
    failures := failures || ' T6';
  exception when foreign_key_violation then passed := passed + 1;
  end;

  -- T7: serviço de OUTRO usuário no item → FK composta recusa
  begin
    perform public.create_quote(base_quote, jsonb_build_array(item_ok || jsonb_build_object('service_id', sb)));
    failures := failures || ' T7';
  exception when foreign_key_violation then passed := passed + 1;
  end;

  -- T8: validade no passado e acima de 1 ano → 22023
  begin
    perform public.create_quote(base_quote || jsonb_build_object('valid_until', v_today - 1), jsonb_build_array(item_ok));
    failures := failures || ' T8a';
  exception when invalid_parameter_value then passed := passed + 1;
  end;
  begin
    perform public.create_quote(base_quote || jsonb_build_object('valid_until', v_today + 366), jsonb_build_array(item_ok));
    failures := failures || ' T8b';
  exception when invalid_parameter_value then passed := passed + 1;
  end;

  -- T9: sem itens → 22023
  begin
    perform public.create_quote(base_quote, '[]'::jsonb);
    failures := failures || ' T9';
  exception when invalid_parameter_value then passed := passed + 1;
  end;

  -- T10: a próxima criação continua a sequência (as falhas não deixaram buraco) → AAAA-003
  select * into q from public.create_quote(base_quote, jsonb_build_array(item_ok));
  if q.quote_number = v_year || '-003' then passed := passed + 1; else failures := failures || ' T10(' || q.quote_number || ')'; end if;

  -- T11: inserir direto como "aprovado" → RLS recusa
  begin
    insert into public.quotes (client_id, quote_number, title, valid_until, status, subtotal_cents,
      discount_total_cents, tax_total_cents, total_cents)
    values (ca, v_year || '-900', 'Falso', v_today + 1, 'approved', 0, 0, 0, 0);
    failures := failures || ' T11';
  exception when insufficient_privilege then passed := passed + 1;
  end;

  -- T12: o contador de números não é acessível pela API
  begin
    perform 1 from private.quote_counters;
    failures := failures || ' T12';
  exception when insufficient_privilege then passed := passed + 1;
  end;

  -- T13: excluir cliente com orçamentos → 23503
  begin
    delete from public.clients where id = ca;
    failures := failures || ' T13';
  exception when foreign_key_violation then passed := passed + 1;
  end;

  -- T14: excluir o serviço → itens ficam com service_id NULL e o snapshot continua
  delete from public.services where id = sa;
  select count(*) into n from public.quote_items where quote_id = q1 and service_id is null and name = 'Hora técnica';
  if n = 1 then passed := passed + 1; else failures := failures || ' T14'; end if;

  -- T15: outro usuário (B) não vê, não altera e não exclui os orçamentos de A
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  select count(*) into n from public.quotes where user_id = a;
  if n = 0 then passed := passed + 1; else failures := failures || ' T15a'; end if;
  select count(*) into n from public.quote_items where quote_id in (q1, q2);
  if n = 0 then passed := passed + 1; else failures := failures || ' T15b'; end if;
  update public.quotes set title = 'Invadido' where id = q1;
  get diagnostics n = row_count;
  if n = 0 then passed := passed + 1; else failures := failures || ' T15c'; end if;
  delete from public.quotes where id = q1;
  get diagnostics n = row_count;
  if n = 0 then passed := passed + 1; else failures := failures || ' T15d'; end if;

  -- T16: B não consegue pôr itens no orçamento de A (FK composta com user_id)
  begin
    insert into public.quote_items (quote_id, position, name, quantity_hundredths, unit, unit_price_cents, subtotal_cents)
    values (q1, 50, 'Intruso', 100, 'unit', 100, 100);
    failures := failures || ' T16';
  exception when foreign_key_violation then passed := passed + 1;
  end;

  -- T17: anon não lê orçamentos nem chama a função
  reset role;
  set local role anon;
  begin
    perform 1 from public.quotes;
    failures := failures || ' T17a';
  exception when insufficient_privilege then passed := passed + 1;
  end;
  begin
    perform public.create_quote(base_quote, jsonb_build_array(item_ok));
    failures := failures || ' T17b';
  exception when insufficient_privilege then passed := passed + 1;
  end;

  -- T18: número com mais de 3 dígitos (contador em 999 → AAAA-1000)
  reset role;
  update private.quote_counters set last_number = 999 where user_id = a;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  -- o serviço A foi excluído no T14: item sem service_id
  select * into q from public.create_quote(base_quote, jsonb_build_array(item_ok || jsonb_build_object('service_id', null)));
  if q.quote_number = v_year || '-1000' then passed := passed + 1; else failures := failures || ' T18(' || q.quote_number || ')'; end if;

  -- T19: excluir a CONTA apaga tudo em cascata (o NO ACTION do cliente não bloqueia)
  reset role;
  delete from auth.users where id = a;
  select count(*) into n from public.quotes where user_id = a;
  if n = 0 then passed := passed + 1; else failures := failures || ' T19'; end if;

  raise exception 'RESULTADO DO TESTE: % ok; falhas:%', passed, coalesce(nullif(failures, ''), ' nenhuma');
end;
$$;
