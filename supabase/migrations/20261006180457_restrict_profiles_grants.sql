-- Corrige as permissões de public.profiles para o mínimo necessário.
--
-- Este projeto foi criado com "expor tabelas novas automaticamente" ligado, então
-- as default privileges já davam ALL (inclusive DELETE e TRUNCATE) para anon e
-- authenticated. O GRANT da migração anterior só acrescentava permissões. O RLS
-- protegia as linhas, mas TRUNCATE não passa pelo RLS.
--
-- Regra para as próximas migrações: sempre `revoke all` + `grant` explícito.

revoke all on public.profiles from anon, authenticated;
grant select, update on public.profiles to authenticated;
