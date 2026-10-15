-- Dashboard (Sprint 18): os números do painel calculados no banco, numa
-- consulta só, em vez de trazer todos os orçamentos e somar no app.
--
-- SECURITY INVOKER: o RLS vale (cada um só vê os próprios orçamentos); o filtro
-- explícito por user_id é a segunda barreira e usa o índice (user_id, created_at).
--
-- Definições (combinadas com o usuário em 2026-10-14):
-- - "enviadas" (reached) = chegaram ao cliente: sent, viewed, approved, declined
--   e expired. Canceladas ficam de fora (o dono tirou do ar, muitas vezes por
--   engano) e não derrubam a taxa de conversão.
-- - conversão = aprovadas ÷ enviadas (a divisão fica no app).
-- - período: pela data de envio; o que nunca foi enviado (rascunho, cancelado
--   antes de enviar), pela data de criação. p_since nulo = desde sempre.

create function public.quote_dashboard(p_since timestamptz default null)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'total', count(*),
    'by_status', jsonb_build_object(
      'draft', count(*) filter (where q.status = 'draft'),
      'sent', count(*) filter (where q.status = 'sent'),
      'viewed', count(*) filter (where q.status = 'viewed'),
      'approved', count(*) filter (where q.status = 'approved'),
      'declined', count(*) filter (where q.status = 'declined'),
      'expired', count(*) filter (where q.status = 'expired'),
      'cancelled', count(*) filter (where q.status = 'cancelled')
    ),
    'reached', count(*) filter (where q.status in ('sent', 'viewed', 'approved', 'declined', 'expired')),
    'reached_value_cents', coalesce(sum(q.total_cents) filter (
      where q.status in ('sent', 'viewed', 'approved', 'declined', 'expired')
    ), 0),
    'approved_value_cents', coalesce(sum(q.total_cents) filter (where q.status = 'approved'), 0),
    'open_value_cents', coalesce(sum(q.total_cents) filter (where q.status in ('sent', 'viewed')), 0)
  )
  from public.quotes q
  where q.user_id = (select auth.uid())
    and (p_since is null or coalesce(q.sent_at, q.created_at) >= p_since);
$$;

revoke execute on function public.quote_dashboard(timestamptz) from public, anon;
grant execute on function public.quote_dashboard(timestamptz) to authenticated;
