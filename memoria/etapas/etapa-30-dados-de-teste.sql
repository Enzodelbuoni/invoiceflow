-- Dados de teste da etapa 30 (levantamento de responsividade), criados pelas
-- funções do app (create_quote, send_quote, approve/decline) na conta de teste
-- do usuário. Textos longos de propósito (nome, empresa, e-mail, título,
-- itens), 12 orçamentos: rascunhos, enviados, 1 aprovado e 1 recusado.
-- Uso: só com a conta sem orçamentos/serviços e com 1 usuário no banco;
--   node node_modules/supabase/dist/supabase.js db query --linked -f <este arquivo>
-- Limpeza (pelo id do cliente original da conta):
--   delete from public.quotes where user_id = (select id from auth.users);
--   delete from public.clients where id <> '<cliente original>';
--   delete from public.services; delete from private.quote_counters;
create function pg_temp.payload(p_client uuid, p_title text, p_items jsonb, p_disc int, p_tax int,
  p_notes text, p_terms text, p_valid date, out q jsonb, out items jsonb)
language plpgsql as $$
declare
  it jsonb;
  sub bigint := 0;
  line bigint;
  disc bigint := 0;
  tax bigint := 0;
begin
  items := '[]'::jsonb;
  for it in select * from jsonb_array_elements(p_items) loop
    line := round((it ->> 'quantity_hundredths')::numeric * (it ->> 'unit_price_cents')::numeric / 100);
    sub := sub + line;
    items := items || jsonb_build_array(it || jsonb_build_object('subtotal_cents', line));
  end loop;
  if p_disc is not null then disc := round(sub::numeric * p_disc / 10000); end if;
  if p_tax is not null then tax := round((sub - disc)::numeric * p_tax / 10000); end if;
  q := jsonb_build_object('client_id', p_client, 'title', p_title, 'description',
    'Projeto pensado para apresentar a empresa com clareza, captar contatos qualificados e facilitar a atualização do conteúdo pela própria equipe.',
    'valid_until', p_valid, 'discount_type', case when p_disc is null then null else 'percent' end,
    'discount_value', p_disc, 'tax_rate_bps', p_tax, 'subtotal_cents', sub, 'discount_total_cents', disc,
    'tax_total_cents', tax, 'total_cents', sub - disc + tax, 'notes', p_notes, 'terms', p_terms);
end;
$$;

do $$
declare
  uid uuid;
  c_long uuid;
  c_orig uuid;
  s1 uuid; s2 uuid; s3 uuid;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  p record;
  q record;
  ids uuid[] := '{}';
  pub uuid;
  items_long jsonb;
  notes text := 'Prazo estimado de 30 dias úteis a partir da aprovação e do envio dos conteúdos (textos, fotos e logotipo). Inclui duas rodadas de ajustes por etapa.';
  terms text := 'Pagamento em duas parcelas: 50% na aprovação e 50% na entrega. Valores válidos até a data indicada. Alterações de escopo depois da aprovação são orçadas à parte. Hospedagem e domínio não estão incluídos, salvo quando indicado nos itens.';
begin
  select id into uid from auth.users;
  select id into c_orig from public.clients where user_id = uid;
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  set local role authenticated;

  insert into public.clients (name, company, email, phone, document, address, notes)
  values ('Maria Eduarda Albuquerque de Souza Figueiredo', 'Construtora Horizonte Engenharia e Participações Ltda',
    'maria.eduarda.figueiredo@construtorahorizonte.com.br', '11987654321', '11222333000181',
    'Avenida Brigadeiro Faria Lima, 3477, conjunto 1203, Itaim Bibi, São Paulo – SP, 04538-133',
    'Prefere contato por WhatsApp no período da tarde.')
  returning id into c_long;

  insert into public.services (name, description, unit, price_cents) values
    ('Desenvolvimento de landing page responsiva', 'Página única com até 6 seções, formulário de contato e integração com o Google Analytics.', 'project', 480000)
    returning id into s1;
  insert into public.services (name, description, unit, price_cents) values
    ('Hora técnica de suporte', 'Ajustes, correções e pequenas melhorias.', 'hour', 15033) returning id into s2;
  insert into public.services (name, unit, price_cents) values
    ('Gestão mensal de redes sociais', 'month', 120000) returning id into s3;

  items_long := jsonb_build_array(
    jsonb_build_object('service_id', s1, 'name', 'Desenvolvimento de landing page responsiva',
      'description', 'Página única com até 6 seções, formulário de contato com envio para o e-mail da empresa, integração com o Google Analytics e otimização básica para mecanismos de busca.',
      'quantity_hundredths', 200, 'unit', 'project', 'unit_price_cents', 480000),
    jsonb_build_object('service_id', s2, 'name', 'Hora técnica de suporte', 'description', 'Ajustes, correções e pequenas melhorias.',
      'quantity_hundredths', 1250, 'unit', 'hour', 'unit_price_cents', 15033),
    jsonb_build_object('service_id', s3, 'name', 'Gestão mensal de redes sociais', 'description', null,
      'quantity_hundredths', 300, 'unit', 'month', 'unit_price_cents', 120000),
    jsonb_build_object('service_id', null, 'name', 'Sessão de fotos de produtos em estúdio com tratamento de imagens',
      'description', 'Até 40 fotos editadas, entregues em alta resolução e em versões otimizadas para a web.',
      'quantity_hundredths', 100, 'unit', 'unit', 'unit_price_cents', 235000));

  -- 1: rascunho longo (4 itens, desconto 10%, imposto 5%, observações e termos)
  select * into p from pg_temp.payload(c_long, 'Redesenho completo do site institucional com área do cliente e blog integrado',
    items_long, 1000, 500, notes, terms, v_today + 15);
  select * into q from public.create_quote(p.q, p.items); ids := ids || q.id;

  -- 2: enviado (o mesmo conteúdo, para a página pública em aberto)
  select * into p from pg_temp.payload(c_long, 'Redesenho completo do site institucional com área do cliente e blog integrado',
    items_long, 1000, 500, notes, terms, v_today + 15);
  select * into q from public.create_quote(p.q, p.items); ids := ids || q.id;
  perform public.send_quote(q.id);

  -- 3: aprovado (curto)
  select * into p from pg_temp.payload(c_orig, 'Manutenção mensal do site', jsonb_build_array(items_long -> 1), null, null,
    null, null, v_today + 10);
  select * into q from public.create_quote(p.q, p.items); ids := ids || q.id;
  perform public.send_quote(q.id);

  -- 4: recusado
  select * into p from pg_temp.payload(c_long, 'Campanha de lançamento do empreendimento Vista Verde',
    jsonb_build_array(items_long -> 2, items_long -> 3), null, 500, null, terms, v_today + 20);
  select * into q from public.create_quote(p.q, p.items); ids := ids || q.id;
  perform public.send_quote(q.id);

  -- 5 a 12: mais alguns para a lista e o painel
  for i in 5..12 loop
    select * into p from pg_temp.payload(case when i % 2 = 0 then c_long else c_orig end,
      (array['Loja virtual', 'Identidade visual', 'Consultoria de SEO', 'Aplicativo de agendamento'])[1 + i % 4],
      jsonb_build_array(items_long -> (i % 4)), null, null, null, null, v_today + i);
    select * into q from public.create_quote(p.q, p.items); ids := ids || q.id;
    if i % 3 <> 0 then perform public.send_quote(q.id); end if;
  end loop;
  reset role;

  perform set_config('request.jwt.claims', '', true);
  select public_id into pub from public.quotes where id = ids[3];
  set local role anon;
  perform public.approve_quote(pub, 'José Carlos da Silva Pereira', 'jose@example.com', true);
  reset role;
  select public_id into pub from public.quotes where id = ids[4];
  set local role anon;
  perform public.decline_quote(pub, 'O orçamento ficou acima do previsto para este semestre. Podemos retomar a conversa no ano que vem.');
  reset role;
end;
$$;

select q.quote_number, q.status, q.public_id, q.id from public.quotes q order by q.quote_number;
