-- Teste da migração quote_sends_by_day: dias no fuso de São Paulo (virada do
-- dia em UTC), só as enviadas (sem rascunhos e canceladas), aprovadas e
-- somas, período, RLS (só os próprios), anon sem acesso e os totais batendo
-- com quote_dashboard. Bloco que termina em RAISE EXCEPTION (desfaz tudo).
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  ca uuid; cb uuid;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  q record;
  q_viewed uuid; q_approved uuid; q_declined uuid;
  pub uuid;
  r record;
  d jsonb;
  n bigint;
  passed int := 0;
  failures text := '';
  base jsonb;
  item jsonb;
begin
  insert into auth.users (id, email, aud, role)
  values (a, 'serie-a-' || a || '@example.com', 'authenticated', 'authenticated'),
         (b, 'serie-b-' || b || '@example.com', 'authenticated', 'authenticated');

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

  -- Usuário a, hoje: rascunho (100), enviado (200), visualizado (300),
  -- aprovado (400), recusado (500), cancelado depois de enviar (600) e um
  -- rascunho cancelado (700)
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
    if i in (6, 7) then perform public.cancel_quote(q.id); end if;
  end loop;
  reset role;

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

  -- Dois expirados antigos, inseridos direto, nos dois lados da virada do dia:
  -- 02:00 UTC de 01/03 = 23:00 de 28/02 em SP; 03:30 UTC de 01/03 = 00:30 de 01/03 em SP.
  insert into public.quotes (user_id, client_id, quote_number, title, valid_until, status, sent_at, created_at,
    subtotal_cents, discount_total_cents, tax_total_cents, total_cents)
  values
    (a, ca, '2000-951', 'Antigo 1', '2026-03-15', 'expired', '2026-03-01 02:00:00+00', '2026-02-27 12:00:00+00',
      80000, 0, 0, 80000),
    (a, ca, '2000-952', 'Antigo 2', '2026-03-15', 'expired', '2026-03-01 03:30:00+00', '2026-02-27 12:00:00+00',
      90000, 0, 0, 90000);

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- S1: desde sempre → 3 dias (28/02, 01/03 e hoje), em ordem
  select count(*), min(s.day), max(s.day) into r from public.quote_sends_by_day() s;
  if r.count = 3 and r.min = '2026-02-28' and r.max = v_today then
    passed := passed + 1;
  else
    failures := failures || ' S1(' || r::text || ')';
  end if;

  -- S2: hoje = enviado, visualizado, aprovado e recusado (sem rascunhos e canceladas)
  select * into r from public.quote_sends_by_day() s where s.day = v_today;
  if r.reached = 4 and r.approved = 1
     and r.reached_value_cents = 20000 + 30000 + 40000 + 50000 and r.approved_value_cents = 40000 then
    passed := passed + 1;
  else
    failures := failures || ' S2(' || r::text || ')';
  end if;

  -- S3: fuso de São Paulo na virada do dia (um em cada dia) e aprovadas = 0 (não nulo)
  select count(*) into n from public.quote_sends_by_day() s
  where (s.day = '2026-02-28' and s.reached = 1 and s.reached_value_cents = 80000 and s.approved_value_cents = 0)
     or (s.day = '2026-03-01' and s.reached = 1 and s.reached_value_cents = 90000 and s.approved = 0);
  if n = 2 then passed := passed + 1; else failures := failures || ' S3(' || n || ')'; end if;

  -- S4: últimos 30 dias → só hoje
  select count(*) into n from public.quote_sends_by_day(now() - interval '30 days');
  if n = 1 then passed := passed + 1; else failures := failures || ' S4(' || n || ')'; end if;

  -- S5: as somas da série batem com o quote_dashboard (enviadas e valores)
  d := public.quote_dashboard();
  select sum(s.reached) as reached, sum(s.approved) as approved,
         sum(s.reached_value_cents) as reached_value, sum(s.approved_value_cents) as approved_value
  into r from public.quote_sends_by_day() s;
  if r.reached = (d ->> 'reached')::int and r.approved = (d -> 'by_status' ->> 'approved')::int
     and r.reached_value = (d ->> 'reached_value_cents')::bigint
     and r.approved_value = (d ->> 'approved_value_cents')::bigint then
    passed := passed + 1;
  else
    failures := failures || ' S5(' || r::text || ' x ' || d::text || ')';
  end if;
  reset role;

  -- S6: usuário b só vê o próprio
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*), sum(s.reached_value_cents) as value into r from public.quote_sends_by_day() s;
  if r.count = 1 and r.value = 99900 then passed := passed + 1; else failures := failures || ' S6(' || r::text || ')'; end if;
  reset role;

  -- S7: anon não executa
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  begin
    perform 1 from public.quote_sends_by_day();
    failures := failures || ' S7';
  exception when insufficient_privilege then passed := passed + 1;
  end;
  reset role;

  raise exception 'RESULTADO DO TESTE: % ok; falhas:%', passed, coalesce(nullif(failures, ''), ' nenhuma');
end;
$$;
