-- Teste da migração list_quotes_client_contacts: cada item da lista traz o
-- e-mail e o telefone do cliente (ou null), sem mudar o resto (o teste da
-- etapa 28 roda junto). Bloco que termina em RAISE EXCEPTION (desfaz tudo).
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c_full uuid; c_bare uuid; cb uuid;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  r jsonb;
  passed int := 0;
  failures text := '';
  base jsonb;
  item jsonb := jsonb_build_object('service_id', null, 'name', 'Item', 'description', null,
    'quantity_hundredths', 100, 'unit', 'unit', 'unit_price_cents', 10000, 'subtotal_cents', 10000);
begin
  insert into auth.users (id, email, aud, role)
  values (a, 'contato-a-' || a || '@example.com', 'authenticated', 'authenticated'),
         (b, 'contato-b-' || b || '@example.com', 'authenticated', 'authenticated');

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.clients (name, email, phone) values ('Cliente de B', 'b@cliente.com', '11911112222') returning id into cb;
  base := jsonb_build_object('client_id', cb, 'title', 'Orçamento de B', 'description', null,
    'valid_until', v_today + 15, 'discount_type', null, 'discount_value', null, 'tax_rate_bps', null,
    'subtotal_cents', 10000, 'discount_total_cents', 0, 'tax_total_cents', 0, 'total_cents', 10000,
    'notes', null, 'terms', null);
  perform public.create_quote(base, jsonb_build_array(item));
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.clients (name, company, email, phone)
  values ('Ana Completa', 'Empresa A', 'ana@cliente.com', '17997216930') returning id into c_full;
  insert into public.clients (name) values ('Bruno Sem Contato') returning id into c_bare;
  perform public.create_quote(base || jsonb_build_object('client_id', c_full, 'title', 'Com contato'), jsonb_build_array(item));
  perform public.create_quote(base || jsonb_build_object('client_id', c_bare, 'title', 'Sem contato'), jsonb_build_array(item));

  -- C1: cliente com e-mail e telefone
  r := public.list_quotes(p_query => 'com contato');
  if (r ->> 'total')::int = 1
     and r -> 'items' -> 0 -> 'client' = jsonb_build_object('id', c_full, 'name', 'Ana Completa',
       'company', 'Empresa A', 'email', 'ana@cliente.com', 'phone', '17997216930') then
    passed := passed + 1;
  else
    failures := failures || ' C1(' || r::text || ')';
  end if;

  -- C2: cliente sem contato → null (as chaves existem)
  r := public.list_quotes(p_query => 'sem contato');
  if (r ->> 'total')::int = 1
     and r -> 'items' -> 0 -> 'client' ? 'email' and r -> 'items' -> 0 -> 'client' ? 'phone'
     and jsonb_typeof(r -> 'items' -> 0 -> 'client' -> 'email') = 'null'
     and jsonb_typeof(r -> 'items' -> 0 -> 'client' -> 'phone') = 'null' then
    passed := passed + 1;
  else
    failures := failures || ' C2(' || r::text || ')';
  end if;

  -- C3: os contatos não entram na busca (só número, título, nome e empresa)
  if (public.list_quotes(p_query => 'ana@cliente') ->> 'total')::int = 0
     and (public.list_quotes(p_query => '17997') ->> 'total')::int = 0 then
    passed := passed + 1;
  else
    failures := failures || ' C3';
  end if;

  -- C4: o usuário a não vê o cliente (nem o contato) de b
  r := public.list_quotes();
  if (r ->> 'total')::int = 2 and position('b@cliente.com' in r::text) = 0 then
    passed := passed + 1;
  else
    failures := failures || ' C4(' || r::text || ')';
  end if;
  reset role;

  -- C5: anon continua sem acesso
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  begin
    perform public.list_quotes();
    failures := failures || ' C5';
  exception when insufficient_privilege then passed := passed + 1;
  end;
  reset role;

  raise exception 'RESULTADO DO TESTE: % ok; falhas:%', passed, coalesce(nullif(failures, ''), ' nenhuma');
end;
$$;
