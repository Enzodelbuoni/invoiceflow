-- Dashboard (Sprint 18, parte 2): série das propostas enviadas por dia, para o
-- gráfico "enviadas e aprovadas". O app agrupa os dias em semanas, meses ou
-- anos (conforme o período escolhido) e preenche os intervalos sem envio.
--
-- Mesmas definições de quote_dashboard (etapa 26), para os números baterem:
-- - "enviadas" = chegaram ao cliente: sent, viewed, approved, declined e
--   expired (canceladas fora);
-- - cada proposta conta no dia do ENVIO (no fuso de São Paulo), inclusive as
--   aprovadas depois: o gráfico mostra, das enviadas em cada período, quantas
--   foram aprovadas (a mesma conta da taxa de conversão);
-- - p_since filtra pela data de envio; nulo = desde sempre.
--
-- SECURITY INVOKER: o RLS vale; o filtro explícito por user_id é a segunda
-- barreira. Só authenticated executa.

create function public.quote_sends_by_day(p_since timestamptz default null)
returns table (
  day date,
  reached integer,
  approved integer,
  reached_value_cents bigint,
  approved_value_cents bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    (coalesce(q.sent_at, q.created_at) at time zone 'America/Sao_Paulo')::date,
    count(*)::integer,
    (count(*) filter (where q.status = 'approved'))::integer,
    sum(q.total_cents)::bigint,
    coalesce(sum(q.total_cents) filter (where q.status = 'approved'), 0)::bigint
  from public.quotes q
  where q.user_id = (select auth.uid())
    and q.status in ('sent', 'viewed', 'approved', 'declined', 'expired')
    and (p_since is null or coalesce(q.sent_at, q.created_at) >= p_since)
  group by 1
  order by 1;
$$;

revoke execute on function public.quote_sends_by_day(timestamptz) from public, anon;
grant execute on function public.quote_sends_by_day(timestamptz) to authenticated;
