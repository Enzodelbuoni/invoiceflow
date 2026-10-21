-- Teste da migração branding (etapa 39). Termina em RAISE EXCEPTION: o
-- Postgres desfaz tudo (usuários, negócios, orçamentos, objetos do Storage).
-- Antes do push: rodar com `begin;` + a migração na frente.
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  ca uuid;
  q record;
  pub uuid;
  j jsonb;
  n int;
  v_logo text;
  passed int := 0;
  failures text := '';
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  insert into auth.users (id, email, aud, role)
  values (a, 'brand-a-' || a || '@example.com', 'authenticated', 'authenticated'),
         (b, 'brand-b-' || b || '@example.com', 'authenticated', 'authenticated');
  v_logo := a || '/logo-' || gen_random_uuid() || '.webp';

  -- T1: bucket público, só WebP, até 512 KB
  select count(*) into n from storage.buckets
  where id = 'logos' and public and file_size_limit = 524288 and allowed_mime_types = array['image/webp'];
  if n = 1 then passed := passed + 1; else failures := failures || ' T1'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- T2: logo na própria pasta + cor em minúsculas
  insert into public.businesses (name, logo_path, accent_color) values ('Aurora', v_logo, '#0f766e');
  select count(*) into n from public.businesses where logo_path = v_logo and accent_color = '#0f766e';
  if n = 1 then passed := passed + 1; else failures := failures || ' T2'; end if;

  -- T3: CHECKs (logo na pasta de outro, extensão errada, caminho com ../, cor fora do formato)
  begin update public.businesses set logo_path = b || '/logo-' || gen_random_uuid() || '.webp' where user_id = a;
    failures := failures || ' T3a'; exception when check_violation then passed := passed + 1; end;
  begin update public.businesses set logo_path = a || '/logo-' || gen_random_uuid() || '.png' where user_id = a;
    failures := failures || ' T3b'; exception when check_violation then passed := passed + 1; end;
  begin update public.businesses set logo_path = a || '/../' || b || '/logo.webp' where user_id = a;
    failures := failures || ' T3c'; exception when check_violation then passed := passed + 1; end;
  begin update public.businesses set accent_color = '#0F766E' where user_id = a;
    failures := failures || ' T3d'; exception when check_violation then passed := passed + 1; end;
  begin update public.businesses set accent_color = 'red' where user_id = a;
    failures := failures || ' T3e'; exception when check_violation then passed := passed + 1; end;

  -- T4: proposta enviada → a página pública leva logo e cor
  insert into public.clients (name) values ('Cliente A') returning id into ca;
  select * into q from public.create_quote(
    jsonb_build_object('client_id', ca, 'title', 'Site', 'description', null, 'valid_until', v_today + 15,
      'discount_type', null, 'discount_value', null, 'tax_rate_bps', null, 'subtotal_cents', 10000,
      'discount_total_cents', 0, 'tax_total_cents', 0, 'total_cents', 10000, 'notes', null, 'terms', null),
    jsonb_build_array(jsonb_build_object('service_id', null, 'name', 'Item', 'description', null,
      'quantity_hundredths', 100, 'unit', 'unit', 'unit_price_cents', 10000, 'subtotal_cents', 10000)));
  perform public.send_quote(q.id);
  select public_id into pub from public.quotes where id = q.id;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  j := public.get_public_quote(pub) -> 'issuer';
  if j ->> 'logo_path' = v_logo and j ->> 'accent_color' = '#0f766e' and j ->> 'name' = 'Aurora'
  then passed := passed + 1; else failures := failures || ' T4(' || j::text || ')'; end if;

  -- T5: anônimo não lista o bucket pela API
  select count(*) into n from storage.objects where bucket_id = 'logos';
  if n = 0 then passed := passed + 1; else failures := failures || ' T5'; end if;

  -- T6: Storage — A grava na própria pasta, não na de B
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into storage.objects (bucket_id, name, owner_id) values ('logos', v_logo, a::text);
    passed := passed + 1;
  exception when others then failures := failures || ' T6a(' || sqlstate || ': ' || sqlerrm || ')';
  end;
  begin
    insert into storage.objects (bucket_id, name, owner_id) values ('logos', b || '/logo-x.webp', a::text);
    failures := failures || ' T6b(passou)';
  exception when insufficient_privilege then passed := passed + 1;
  end;
  begin
    insert into storage.objects (bucket_id, name, owner_id) values ('logos', 'logo-solto.webp', a::text);
    failures := failures || ' T6c(passou)';
  exception when insufficient_privilege then passed := passed + 1;
  end;

  -- T7: B não enxerga o arquivo de A pela API
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  select count(*) into n from storage.objects where bucket_id = 'logos';
  if n = 0 then passed := passed + 1; else failures := failures || ' T7'; end if;

  -- T8: A enxerga o próprio
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  select count(*) into n from storage.objects where bucket_id = 'logos' and name = v_logo;
  if n = 1 then passed := passed + 1; else failures := failures || ' T8'; end if;

  raise exception 'RESULTADO: % ok; falhas:%', passed, coalesce(nullif(failures, ''), ' nenhuma');
end;
$$;
