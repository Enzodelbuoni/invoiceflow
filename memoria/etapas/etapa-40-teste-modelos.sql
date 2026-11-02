-- Teste da migração quote_templates (etapa 40). Termina em RAISE EXCEPTION:
-- o Postgres desfaz tudo (usuários, perfis, serviços, modelos).
-- Antes do push: rodar com "begin;" + a migração na frente, num arquivo só.
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  sa uuid;
  sb uuid;
  t1 uuid;
  t2 uuid;
  v_updated timestamptz;
  n int;
  r record;
  passed int := 0;
  failures text := '';
  item_a jsonb;
  base jsonb := jsonb_build_object('name', 'Site institucional', 'title', 'Criação de site', 'description', null,
    'validity_days', 15, 'discount_type', 'percent', 'discount_value', 1000, 'tax_rate_bps', 500,
    'notes', 'Hospedagem por conta do cliente.', 'terms', '50% na aprovação.');
begin
  insert into auth.users (id, email, aud, role, raw_user_meta_data)
  values (a, 'tpl-a-' || a || '@example.com', 'authenticated', 'authenticated', '{"full_name":"Ana Teste"}'),
         (b, 'tpl-b-' || b || '@example.com', 'authenticated', 'authenticated', '{"full_name":"Bia Teste"}');

  -- Serviço de B (para tentar usar no modelo de A)
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.services (name, unit, price_cents) values ('Serviço da B', 'hour', 10000) returning id into sb;

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  insert into public.services (name, unit, price_cents) values ('Design', 'project', 480000) returning id into sa;
  insert into public.clients (name) values ('Cliente A');
  item_a := jsonb_build_object('service_id', sa, 'name', 'Design', 'description', 'Layout das páginas',
    'quantity_hundredths', 100, 'unit', 'project', 'unit_price_cents', 480000);

  -- T1: cria modelo com 2 itens (1 do catálogo, 1 avulso) na ordem
  t1 := public.create_quote_template(base, jsonb_build_array(item_a,
    jsonb_build_object('service_id', null, 'name', 'Hora técnica', 'description', null,
      'quantity_hundredths', 150, 'unit', 'hour', 'unit_price_cents', 15033)));
  select count(*) into n from public.quote_template_items
  where template_id = t1 and ((position = 0 and service_id = sa) or (position = 1 and service_id is null and quantity_hundredths = 150));
  if n = 2 and (select user_id from public.quote_templates where id = t1) = a
  then passed := passed + 1; else failures := failures || ' T1'; end if;

  -- T2: modelo sem itens (só termos) é permitido
  t2 := public.create_quote_template(base || jsonb_build_object('name', 'Termos padrão', 'title', null), '[]'::jsonb);
  if t2 is not null then passed := passed + 1; else failures := failures || ' T2'; end if;

  -- T3: nome repetido (maiúsculas e espaços não diferenciam)
  begin
    perform public.create_quote_template(base || jsonb_build_object('name', '  SITE institucional '), '[]'::jsonb);
    failures := failures || ' T3(passou)';
  exception when unique_violation then passed := passed + 1;
  end;

  -- T4: CHECKs (nome curto, validade 0 e 366, desconto acima de 100%, tipo sem valor, título só com espaços)
  begin perform public.create_quote_template(base || '{"name":"X"}', '[]'); failures := failures || ' T4a';
  exception when check_violation then passed := passed + 1; end;
  begin perform public.create_quote_template(base || '{"name":"Validade 0","validity_days":0}', '[]'); failures := failures || ' T4b';
  exception when check_violation then passed := passed + 1; end;
  begin perform public.create_quote_template(base || '{"name":"Validade 366","validity_days":366}', '[]'); failures := failures || ' T4c';
  exception when check_violation then passed := passed + 1; end;
  begin perform public.create_quote_template(base || '{"name":"Desc 101","discount_value":10001}', '[]'); failures := failures || ' T4d';
  exception when check_violation then passed := passed + 1; end;
  begin perform public.create_quote_template(base || '{"name":"Desc sem valor","discount_value":null}', '[]'); failures := failures || ' T4e';
  exception when check_violation then passed := passed + 1; end;
  begin perform public.create_quote_template(base || '{"name":"Titulo vazio","title":"   "}', '[]'); failures := failures || ' T4f';
  exception when check_violation then passed := passed + 1; end;

  -- T5: mais de 100 itens
  begin
    perform public.create_quote_template(base || '{"name":"Muitos itens"}',
      (select jsonb_agg(item_a) from generate_series(1, 101)));
    failures := failures || ' T5(passou)';
  exception when invalid_parameter_value then passed := passed + 1;
  end;

  -- T6: editar com o updated_at certo substitui campos e itens
  select updated_at into v_updated from public.quote_templates where id = t1;
  perform public.update_quote_template(t1, v_updated,
    base || '{"name":"Site institucional (novo)","validity_days":30,"discount_type":null,"discount_value":null}',
    jsonb_build_array(item_a));
  select * into r from public.quote_templates where id = t1;
  select count(*) into n from public.quote_template_items where template_id = t1;
  if r.name = 'Site institucional (novo)' and r.validity_days = 30 and r.discount_type is null and n = 1
  then passed := passed + 1; else failures := failures || ' T6'; end if;

  -- T7: editar com updated_at antigo → PT409 (conflito)
  begin
    perform public.update_quote_template(t1, v_updated - interval '1 second', base, '[]'::jsonb);
    failures := failures || ' T7(passou)';
  exception when sqlstate 'PT409' then passed := passed + 1;
  end;

  -- T8: editar modelo que não existe → P0002
  begin
    perform public.update_quote_template(gen_random_uuid(), v_updated, base, '[]'::jsonb);
    failures := failures || ' T8(passou)';
  exception when no_data_found then passed := passed + 1;
  end;

  -- T9: serviço de outra pessoa no item → FK composta recusa
  begin
    perform public.create_quote_template(base || '{"name":"Com serviço alheio"}',
      jsonb_build_array(item_a || jsonb_build_object('service_id', sb)));
    failures := failures || ' T9(passou)';
  exception when foreign_key_violation then passed := passed + 1;
  end;

  -- T9b: correção em quotes: desconto percentual sem valor agora é recusado
  begin
    perform public.create_quote(
      jsonb_build_object('client_id', (select id from public.clients where name = 'Cliente A' limit 1), 'title', 'Site',
        'description', null, 'valid_until', (now() at time zone 'America/Sao_Paulo')::date + 15,
        'discount_type', 'percent', 'discount_value', null, 'tax_rate_bps', null, 'subtotal_cents', 10000,
        'discount_total_cents', 0, 'tax_total_cents', 0, 'total_cents', 10000, 'notes', null, 'terms', null),
      jsonb_build_array(jsonb_build_object('service_id', null, 'name', 'Item', 'description', null,
        'quantity_hundredths', 100, 'unit', 'unit', 'unit_price_cents', 10000, 'subtotal_cents', 10000)));
    failures := failures || ' T9b(passou)';
  exception when check_violation then passed := passed + 1;
  end;

  -- T10: excluir o serviço → item fica avulso, com o snapshot
  delete from public.services where id = sa;
  select count(*) into n from public.quote_template_items
  where template_id = t1 and service_id is null and name = 'Design' and unit_price_cents = 480000;
  if n = 1 then passed := passed + 1; else failures := failures || ' T10'; end if;

  -- T11: B não vê, não altera e não exclui os modelos de A, nem põe itens neles
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  select count(*) into n from public.quote_templates;
  if n = 0 and not exists (select 1 from public.quote_template_items)
  then passed := passed + 1; else failures := failures || ' T11a'; end if;
  begin
    perform public.update_quote_template(t1, v_updated, base, '[]'::jsonb);
    failures := failures || ' T11b(passou)';
  exception when no_data_found then passed := passed + 1;
  end;
  update public.quote_templates set name = 'Invasor' where id = t1;
  get diagnostics n = row_count;
  if n = 0 then passed := passed + 1; else failures := failures || ' T11c'; end if;
  delete from public.quote_templates where id = t1;
  get diagnostics n = row_count;
  if n = 0 then passed := passed + 1; else failures := failures || ' T11d'; end if;
  begin
    insert into public.quote_template_items (template_id, position, name, quantity_hundredths, unit, unit_price_cents)
    values (t1, 5, 'Invasor', 100, 'unit', 1);
    failures := failures || ' T11e(passou)';
  exception when foreign_key_violation then passed := passed + 1;
  end;
  begin
    insert into public.quote_template_items (template_id, user_id, position, name, quantity_hundredths, unit, unit_price_cents)
    values (t1, a, 5, 'Invasor', 100, 'unit', 1);
    failures := failures || ' T11f(passou)';
  exception when insufficient_privilege then passed := passed + 1;
  end;
  -- B pode usar o mesmo nome de modelo que A
  perform public.create_quote_template(base, '[]'::jsonb);
  select count(*) into n from public.quote_templates;
  if n = 1 then passed := passed + 1; else failures := failures || ' T11g'; end if;

  -- T12: anônimo não lê as tabelas nem chama as funções
  reset role;
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  begin perform 1 from public.quote_templates; failures := failures || ' T12a';
  exception when insufficient_privilege then passed := passed + 1; end;
  begin perform 1 from public.quote_template_items; failures := failures || ' T12b';
  exception when insufficient_privilege then passed := passed + 1; end;
  begin perform public.create_quote_template(base, '[]'::jsonb); failures := failures || ' T12c';
  exception when insufficient_privilege then passed := passed + 1; end;

  -- T13: A exclui um modelo → itens em cascata
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  delete from public.quote_templates where id = t1;
  get diagnostics n = row_count;
  if n = 1 and not exists (select 1 from public.quote_template_items where template_id = t1)
  then passed := passed + 1; else failures := failures || ' T13'; end if;

  -- T14: excluir a conta apaga os modelos (cascata a partir de profiles)
  reset role;
  delete from auth.users where id = a;
  if not exists (select 1 from public.quote_templates where user_id = a)
  then passed := passed + 1; else failures := failures || ' T14'; end if;

  raise exception 'RESULTADO: % ok; falhas:%', passed, coalesce(nullif(failures, ''), ' nenhuma');
end;
$$;
