-- Lista de orçamentos (Sprint 19, etapa 29): cada item passa a trazer também
-- o e-mail e o telefone do cliente, para o "Compartilhar" do menu de cada
-- linha mandar a proposta direto para ele (WhatsApp/e-mail), como na página do
-- orçamento. São dados do próprio usuário, lidos com o RLS valendo.
--
-- Mesma assinatura e mesmas regras da 20261019155526_list_quotes.sql; só o
-- objeto "client" de cada item ganhou "email" e "phone".

create or replace function public.list_quotes(
  p_query text default null,
  p_statuses text[] default null,
  p_since timestamptz default null,
  p_sort text default 'recent',
  p_limit integer default 20,
  p_offset integer default 0
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with words as (
    -- Palavras da busca, sem acentos e em minúsculas, com \ % _ escapados.
    select distinct replace(replace(replace(word, '\', '\\'), '%', '\%'), '_', '\_') as pattern
    from regexp_split_to_table(
      lower(extensions.unaccent('extensions.unaccent'::regdictionary, left(coalesce(p_query, ''), 100))),
      '\s+'
    ) as word
    where word <> ''
  ),
  matched as (
    select
      q.id, q.public_id, q.quote_number, q.title, q.status, q.total_cents, q.valid_until,
      q.created_at, q.sent_at, coalesce(q.sent_at, q.created_at) as reference_at,
      c.id as client_id, c.name as client_name, c.company as client_company,
      c.email as client_email, c.phone as client_phone
    from public.quotes q
    join public.clients c on c.id = q.client_id and c.user_id = q.user_id
    cross join lateral (
      select lower(extensions.unaccent(
        'extensions.unaccent'::regdictionary,
        concat_ws(' ', q.quote_number, q.title, c.name, c.company)
      )) as haystack
    ) as search
    where q.user_id = (select auth.uid())
      and (p_since is null or coalesce(q.sent_at, q.created_at) >= p_since)
      and not exists (select 1 from words w where search.haystack not like '%' || w.pattern || '%')
  ),
  ranked as (
    select
      m.*,
      row_number() over (
        order by
          case when p_sort = 'oldest' then m.reference_at end asc,
          case when p_sort = 'value_desc' then m.total_cents end desc,
          case when p_sort = 'value_asc' then m.total_cents end asc,
          case when p_sort = 'valid_until' then m.valid_until end asc,
          m.reference_at desc,
          m.id
      ) as position
    from matched m
    where p_statuses is null or m.status = any (p_statuses)
  )
  select jsonb_build_object(
    'counts', (
      select jsonb_build_object(
        'draft', count(*) filter (where status = 'draft'),
        'sent', count(*) filter (where status = 'sent'),
        'viewed', count(*) filter (where status = 'viewed'),
        'approved', count(*) filter (where status = 'approved'),
        'declined', count(*) filter (where status = 'declined'),
        'expired', count(*) filter (where status = 'expired'),
        'cancelled', count(*) filter (where status = 'cancelled')
      )
      from matched
    ),
    'total', (select count(*) from ranked),
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'public_id', r.public_id,
          'quote_number', r.quote_number,
          'title', r.title,
          'status', r.status,
          'total_cents', r.total_cents,
          'valid_until', r.valid_until,
          'created_at', r.created_at,
          'sent_at', r.sent_at,
          'client', jsonb_build_object(
            'id', r.client_id,
            'name', r.client_name,
            'company', r.client_company,
            'email', r.client_email,
            'phone', r.client_phone
          )
        )
        order by r.position
      )
      from ranked r
      where r.position > greatest(p_offset, 0)
        and r.position <= greatest(p_offset, 0) + least(greatest(p_limit, 1), 100)
    ), '[]'::jsonb)
  );
$$;

revoke execute on function public.list_quotes(text, text[], timestamptz, text, integer, integer) from public, anon;
grant execute on function public.list_quotes(text, text[], timestamptz, text, integer, integer) to authenticated;
