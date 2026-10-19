-- Teste da migração list_quotes: busca sem acentos (palavras em qualquer
-- ordem, curingas como texto), filtro de status, período igual ao do painel,
-- contagens por status, ordenações, paginação, RLS e anon sem acesso.
-- Bloco que termina em RAISE EXCEPTION (o Postgres desfaz TUDO).
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  ca1 uuid; ca2 uuid; cb uuid;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_year text := extract(year from (now() at time zone 'America/Sao_Paulo'))::text;
  titles text[] := array['Landing page institucional', 'Identidade visual', 'Desconto 100% garantido',
    'Manutenção mensal', 'Consultoria de SEO'];
  amounts bigint[] := array[100000, 300000, 200000, 50000, 400000];
  ids uuid[] := '{}';
  q record;
  pub uuid;
  r jsonb;
  d jsonb;
  t text;
  passed int := 0;
  failures text := '';
  base jsonb;
  item jsonb;
begin
  insert into auth.users (id, email, aud, role)
  values (a, 'lista-a-' || a || '@example.com', 'authenticated', 'authenticated'),
         (b, 'lista-b-' || b || '@example.com', 'authenticated', 'authenticated');

  -- Usuário b: 1 orçamento (não pode aparecer para a)
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.clients (name) values ('João de B') returning id into cb;
  item := jsonb_build_object('service_id', null, 'name', 'Item', 'description', null,
    'quantity_hundredths', 100, 'unit', 'unit', 'unit_price_cents', 99900, 'subtotal_cents', 99900);
  base := jsonb_build_object('client_id', cb, 'title', 'Landing page de B', 'description', null,
    'valid_until', v_today + 15, 'discount_type', null, 'discount_value', null, 'tax_rate_bps', null,
    'subtotal_cents', 99900, 'discount_total_cents', 0, 'tax_total_cents', 0, 'total_cents', 99900,
    'notes', null, 'terms', null);
  perform public.create_quote(base, jsonb_build_array(item));
  reset role;

  -- Usuário a, hoje: 1 rascunho, 1 enviado, 1 visualizado, 1 aprovado, 1 cancelado
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.clients (name, company) values ('João Ávila', 'Estúdio Aurora') returning id into ca1;
  insert into public.clients (name) values ('Maria Souza') returning id into ca2;
  for i in 1..5 loop
    item := jsonb_build_object('service_id', null, 'name', 'Item', 'description', null,
      'quantity_hundredths', 100, 'unit', 'unit', 'unit_price_cents', amounts[i], 'subtotal_cents', amounts[i]);
    base := jsonb_build_object('client_id', case when i in (3, 4) then ca2 else ca1 end, 'title', titles[i],
      'description', null, 'valid_until', v_today + 15, 'discount_type', null, 'discount_value', null,
      'tax_rate_bps', null, 'subtotal_cents', amounts[i], 'discount_total_cents', 0, 'tax_total_cents', 0,
      'total_cents', amounts[i], 'notes', null, 'terms', null);
    select * into q from public.create_quote(base, jsonb_build_array(item));
    ids := ids || q.id;
    if i >= 2 then perform public.send_quote(q.id); end if;
    if i = 5 then perform public.cancel_quote(q.id); end if;
  end loop;
  reset role;

  perform set_config('request.jwt.claims', '', true);
  select public_id into pub from public.quotes where id = ids[3];
  set local role anon;
  perform public.register_quote_view(pub);
  reset role;
  select public_id into pub from public.quotes where id = ids[4];
  set local role anon;
  perform public.approve_quote(pub, 'Cliente Teste', 'cliente@teste.com', true);
  reset role;

  -- Datas no passado, inseridos direto (as guardas não deixam mudar as datas):
  -- expirado enviado há 100 dias; rascunho criado há 60 dias; criado há 60 dias e enviado ontem.
  insert into public.quotes (user_id, client_id, quote_number, title, valid_until, status, sent_at, created_at,
    subtotal_cents, discount_total_cents, tax_total_cents, total_cents)
  values
    (a, ca2, '2000-951', 'Aplicativo antigo', v_today - 85, 'expired', now() - interval '100 days',
      now() - interval '110 days', 700000, 0, 0, 700000),
    (a, ca1, '2000-952', 'Rascunho antigo', v_today + 10, 'draft', null, now() - interval '60 days',
      10000, 0, 0, 10000),
    (a, ca1, '2000-953', 'Enviado depois', v_today + 5, 'sent', now() - interval '1 day',
      now() - interval '60 days', 600000, 0, 0, 600000);

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- L1: sem filtros → 8, contagens por status e o formato do item
  r := public.list_quotes();
  if (r ->> 'total')::int = 8 and jsonb_array_length(r -> 'items') = 8
     and r -> 'counts' = '{"draft":2,"sent":2,"viewed":1,"approved":1,"declined":0,"expired":1,"cancelled":1}'::jsonb
     and exists (
       select 1 from jsonb_array_elements(r -> 'items') e
       where e ->> 'title' = 'Landing page institucional' and e ->> 'status' = 'draft'
         and e -> 'client' ->> 'name' = 'João Ávila' and e -> 'client' ->> 'company' = 'Estúdio Aurora'
         and (e ->> 'public_id')::uuid is not null and (e ->> 'total_cents')::bigint = 100000
         and e ->> 'valid_until' = (v_today + 15)::text and e ->> 'sent_at' is null
     ) then
    passed := passed + 1;
  else
    failures := failures || ' L1(' || r::text || ')';
  end if;

  -- L2: mais recentes (padrão): os 5 de hoje, depois ontem, 60 e 100 dias; valor desconhecido = padrão
  select string_agg(e ->> 'title', '|' order by o) into t
  from jsonb_array_elements(public.list_quotes() -> 'items') with ordinality as x(e, o) where o > 5;
  if t = 'Enviado depois|Rascunho antigo|Aplicativo antigo'
     and public.list_quotes(p_sort => 'xyz') = public.list_quotes() then
    passed := passed + 1;
  else
    failures := failures || ' L2(' || coalesce(t, 'null') || ')';
  end if;

  -- L3: ordenações por valor, mais antigos e validade
  select string_agg(e ->> 'title', '|' order by o) into t
  from jsonb_array_elements(public.list_quotes(p_sort => 'value_desc') -> 'items') with ordinality as x(e, o);
  if t = 'Aplicativo antigo|Enviado depois|Consultoria de SEO|Identidade visual|Desconto 100% garantido|'
         || 'Landing page institucional|Manutenção mensal|Rascunho antigo' then
    passed := passed + 1;
  else
    failures := failures || ' L3a(' || coalesce(t, 'null') || ')';
  end if;
  select string_agg(e ->> 'title', '|' order by o) into t
  from jsonb_array_elements(public.list_quotes(p_sort => 'value_asc', p_limit => 2) -> 'items') with ordinality as x(e, o);
  if t = 'Rascunho antigo|Manutenção mensal' then passed := passed + 1; else failures := failures || ' L3b(' || coalesce(t, 'null') || ')'; end if;
  select string_agg(e ->> 'title', '|' order by o) into t
  from jsonb_array_elements(public.list_quotes(p_sort => 'oldest', p_limit => 3) -> 'items') with ordinality as x(e, o);
  if t = 'Aplicativo antigo|Rascunho antigo|Enviado depois' then passed := passed + 1; else failures := failures || ' L3c(' || coalesce(t, 'null') || ')'; end if;
  select string_agg(e ->> 'title', '|' order by o) into t
  from jsonb_array_elements(public.list_quotes(p_sort => 'valid_until', p_limit => 3) -> 'items') with ordinality as x(e, o);
  if t = 'Aplicativo antigo|Enviado depois|Rascunho antigo' then passed := passed + 1; else failures := failures || ' L3d(' || coalesce(t, 'null') || ')'; end if;

  -- L4: busca sem acentos e sem diferenciar maiúsculas, palavras em qualquer ordem,
  -- pelo cliente, pela empresa, pelo título e pelo número
  if (public.list_quotes(p_query => 'joao') ->> 'total')::int = 5
     and (public.list_quotes(p_query => '  ESTÚDIO   landing ') ->> 'total')::int = 1
     and (public.list_quotes(p_query => 'manutencao souza') ->> 'total')::int = 1
     and (public.list_quotes(p_query => v_year || '-00') ->> 'total')::int = 5
     and (public.list_quotes(p_query => '2000-952') -> 'items' -> 0 ->> 'title') = 'Rascunho antigo'
     and (public.list_quotes(p_query => '   ') ->> 'total')::int = 8 then
    passed := passed + 1;
  else
    failures := failures || ' L4';
  end if;

  -- L5: curingas do LIKE valem como texto; sem resultado → itens vazios e contagens zeradas
  r := public.list_quotes(p_query => 'zzz');
  if (public.list_quotes(p_query => '%') ->> 'total')::int = 1
     and (public.list_quotes(p_query => '_') ->> 'total')::int = 0
     and (public.list_quotes(p_query => '\') ->> 'total')::int = 0
     and (r ->> 'total')::int = 0 and r -> 'items' = '[]'::jsonb
     and r -> 'counts' = '{"draft":0,"sent":0,"viewed":0,"approved":0,"declined":0,"expired":0,"cancelled":0}'::jsonb then
    passed := passed + 1;
  else
    failures := failures || ' L5(' || r::text || ')';
  end if;

  -- L6: filtro de status não muda as contagens (cada aba mostra quantos teria)
  r := public.list_quotes(p_statuses => array['sent', 'viewed']);
  if (r ->> 'total')::int = 3 and jsonb_array_length(r -> 'items') = 3
     and (r -> 'counts' ->> 'draft')::int = 2
     and not exists (select 1 from jsonb_array_elements(r -> 'items') e where e ->> 'status' not in ('sent', 'viewed')) then
    passed := passed + 1;
  else
    failures := failures || ' L6(' || r::text || ')';
  end if;

  -- L7: busca + status juntos
  r := public.list_quotes(p_query => 'joao', p_statuses => array['draft']);
  if (r ->> 'total')::int = 2 and (r -> 'counts' ->> 'sent')::int = 2 and (r -> 'counts' ->> 'viewed')::int = 0 then
    passed := passed + 1;
  else
    failures := failures || ' L7(' || r::text || ')';
  end if;

  -- L8: período pela data de envio (ou de criação) → mesmas contagens do painel
  r := public.list_quotes(p_since => now() - interval '30 days');
  d := public.quote_dashboard(now() - interval '30 days');
  if (r ->> 'total')::int = 6 and r -> 'counts' = d -> 'by_status'
     and exists (select 1 from jsonb_array_elements(r -> 'items') e where e ->> 'title' = 'Enviado depois')
     and not exists (select 1 from jsonb_array_elements(r -> 'items') e where e ->> 'title' in ('Rascunho antigo', 'Aplicativo antigo'))
     and public.list_quotes() -> 'counts' = public.quote_dashboard() -> 'by_status' then
    passed := passed + 1;
  else
    failures := failures || ' L8(' || r::text || ' x ' || d::text || ')';
  end if;

  -- L9: paginação estável, total sem mudar, limites
  select string_agg(e ->> 'title', '|' order by o) into t
  from jsonb_array_elements(public.list_quotes(p_sort => 'value_desc', p_limit => 3, p_offset => 3) -> 'items')
    with ordinality as x(e, o);
  if t = 'Identidade visual|Desconto 100% garantido|Landing page institucional'
     and (public.list_quotes(p_limit => 3, p_offset => 3) ->> 'total')::int = 8
     and public.list_quotes(p_offset => 8) -> 'items' = '[]'::jsonb
     and jsonb_array_length(public.list_quotes(p_limit => 0) -> 'items') = 1
     and jsonb_array_length(public.list_quotes(p_limit => 1000) -> 'items') = 8
     and public.list_quotes(p_offset => -5) = public.list_quotes() then
    passed := passed + 1;
  else
    failures := failures || ' L9(' || coalesce(t, 'null') || ')';
  end if;
  reset role;

  -- L10: usuário b só vê o próprio (mesmo buscando pelo nome dos clientes de a)
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := public.list_quotes();
  if (r ->> 'total')::int = 1 and (r -> 'counts' ->> 'draft')::int = 1
     and (public.list_quotes(p_query => 'avila') ->> 'total')::int = 0
     and (public.list_quotes(p_query => 'joao') ->> 'total')::int = 1 then
    passed := passed + 1;
  else
    failures := failures || ' L10(' || r::text || ')';
  end if;
  reset role;

  -- L11: anon não executa
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  begin
    perform public.list_quotes();
    failures := failures || ' L11';
  exception when insufficient_privilege then passed := passed + 1;
  end;
  reset role;

  raise exception 'RESULTADO DO TESTE: % ok; falhas:%', passed, coalesce(nullif(failures, ''), ' nenhuma');
end;
$$;
