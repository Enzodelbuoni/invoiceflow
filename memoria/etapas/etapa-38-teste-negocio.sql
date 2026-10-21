
-- Teste da migração business_settings (etapa 38). Termina em RAISE EXCEPTION:
-- o Postgres desfaz tudo (usuários, perfis, negócios, orçamentos).
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  ca uuid;
  q record;
  pub uuid;
  j jsonb;
  n int;
  passed int := 0;
  failures text := '';
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  insert into auth.users (id, email, aud, role, raw_user_meta_data)
  values (a, 'biz-a-' || a || '@example.com', 'authenticated', 'authenticated', '{"full_name":"Ana Teste"}'),
         (b, 'biz-b-' || b || '@example.com', 'authenticated', 'authenticated', '{}');

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- T1: nome e telefone do perfil
  update public.profiles set full_name = 'Ana Souza', phone = '11912345678' where id = a;
  get diagnostics n = row_count;
  if n = 1 then passed := passed + 1; else failures := failures || ' T1'; end if;

  -- T2: e-mail do perfil não pode ser trocado pela API
  begin
    update public.profiles set email = 'outro@exemplo.com' where id = a;
    failures := failures || ' T2(passou)';
  exception when insufficient_privilege then passed := passed + 1;
  end;

  -- T3: telefone fora do padrão
  begin
    update public.profiles set phone = '(11) 9' where id = a;
    failures := failures || ' T3(passou)';
  exception when check_violation then passed := passed + 1;
  end;

  -- Proposta enviada de A
  insert into public.clients (name) values ('Cliente A') returning id into ca;
  select * into q from public.create_quote(
    jsonb_build_object('client_id', ca, 'title', 'Site', 'description', null, 'valid_until', v_today + 15,
      'discount_type', null, 'discount_value', null, 'tax_rate_bps', null, 'subtotal_cents', 10000,
      'discount_total_cents', 0, 'tax_total_cents', 0, 'total_cents', 10000, 'notes', null, 'terms', null),
    jsonb_build_array(jsonb_build_object('service_id', null, 'name', 'Item', 'description', null,
      'quantity_hundredths', 100, 'unit', 'unit', 'unit_price_cents', 10000, 'subtotal_cents', 10000)));
  perform public.send_quote(q.id);
  select public_id into pub from public.quotes where id = q.id;

  -- T4: sem negócio, o emitente é o perfil (como antes)
  j := public.get_public_quote(pub) -> 'issuer';
  if j ->> 'name' = 'Ana Souza' and j ->> 'email' like 'biz-a-%' and j ->> 'phone' = '11912345678'
     and j -> 'document' = 'null'::jsonb and j -> 'website' = 'null'::jsonb
  then passed := passed + 1; else failures := failures || ' T4(' || j::text || ')'; end if;

  -- T5: cria o negócio (user_id = auth.uid() por padrão) e faz upsert
  insert into public.businesses (name, document, email, phone, website, address)
  values ('Estúdio Aurora', '11222333000181', 'contato@aurora.com.br', '1133334444', 'https://aurora.com.br', 'Rua A, 1 — São Paulo/SP');
  insert into public.businesses (user_id, name, legal_name) values (a, 'Estúdio Aurora', 'Aurora Design Ltda')
  on conflict (user_id) do update set legal_name = excluded.legal_name;
  select count(*) into n from public.businesses where legal_name = 'Aurora Design Ltda' and document = '11222333000181';
  if n = 1 then passed := passed + 1; else failures := failures || ' T5'; end if;

  -- T6: anônimo vê o emitente com os dados do negócio
  reset role;
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  j := public.get_public_quote(pub) -> 'issuer';
  if j ->> 'name' = 'Estúdio Aurora' and j ->> 'email' = 'contato@aurora.com.br' and j ->> 'phone' = '1133334444'
     and j ->> 'legal_name' = 'Aurora Design Ltda' and j ->> 'document' = '11222333000181'
     and j ->> 'website' = 'https://aurora.com.br' and j ->> 'address' like 'Rua A%'
  then passed := passed + 1; else failures := failures || ' T6(' || j::text || ')'; end if;

  -- T7: anônimo não lê a tabela
  begin
    perform 1 from public.businesses;
    failures := failures || ' T7(passou)';
  exception when insufficient_privilege then passed := passed + 1;
  end;

  -- T8: nome do negócio em branco (null) → volta ao nome do perfil; e-mail null → e-mail da conta
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.businesses set name = null, email = null where user_id = a;
  j := public.get_public_quote(pub) -> 'issuer';
  if j ->> 'name' = 'Ana Souza' and j ->> 'email' like 'biz-a-%' and j ->> 'legal_name' = 'Aurora Design Ltda'
  then passed := passed + 1; else failures := failures || ' T8(' || j::text || ')'; end if;

  -- T9: CHECKs (nome só com espaços, site javascript:, site sem domínio, CPF/CNPJ curto)
  begin update public.businesses set name = '  ' where user_id = a; failures := failures || ' T9a';
  exception when check_violation then passed := passed + 1; end;
  begin update public.businesses set website = 'javascript:alert(1)' where user_id = a; failures := failures || ' T9b';
  exception when check_violation then passed := passed + 1; end;
  begin update public.businesses set website = 'https://localhost' where user_id = a; failures := failures || ' T9c';
  exception when check_violation then passed := passed + 1; end;
  begin update public.businesses set document = '123' where user_id = a; failures := failures || ' T9d';
  exception when check_violation then passed := passed + 1; end;

  -- T10: sem DELETE para o usuário
  begin
    delete from public.businesses where user_id = a;
    failures := failures || ' T10(passou)';
  exception when insufficient_privilege then passed := passed + 1;
  end;

  -- T11: B não vê nem altera o negócio de A, nem cria um em nome de A
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  select count(*) into n from public.businesses;
  if n = 0 then passed := passed + 1; else failures := failures || ' T11a'; end if;
  update public.businesses set name = 'Invasor' where user_id = a;
  get diagnostics n = row_count;
  if n = 0 then passed := passed + 1; else failures := failures || ' T11b'; end if;
  begin
    insert into public.businesses (user_id, name) values (a, 'Invasor');
    failures := failures || ' T11c(passou)';
  exception when insufficient_privilege or unique_violation then passed := passed + 1;
  end;
  -- B cria o próprio e só enxerga ele
  insert into public.businesses (name) values ('Negócio B');
  select count(*) into n from public.businesses;
  if n = 1 then passed := passed + 1; else failures := failures || ' T11d'; end if;

  raise exception 'RESULTADO: % ok; falhas:%', passed, coalesce(nullif(failures, ''), ' nenhuma');
end;
$$;
