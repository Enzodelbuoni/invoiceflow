-- PDF da proposta (Sprint 16, parte 2): o servidor gera o arquivo a partir da
-- página pública e registra o evento "downloaded" no histórico (regra 9 do
-- plano: "download quando aplicável").
--
-- Quem grava é esta função (os usuários não têm INSERT em quote_events). Ela
-- decide sozinha quem baixou (o dono logado ou o cliente), então o metadata não
-- pode ser forjado. Cliques repetidos do mesmo lado em 10 minutos contam uma
-- vez só: o histórico não enche e o endpoint público não vira um jeito de
-- inflar eventos.

create function public.register_quote_download(p_public_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_viewer uuid := (select auth.uid());
  v_id uuid;
  v_user uuid;
  v_status text;
  v_by text;
begin
  select q.id, q.user_id, q.status into v_id, v_user, v_status
  from public.quotes q
  where q.public_id = p_public_id;

  -- Rascunho e cancelada não têm documento público (nem PDF).
  if not found or v_status in ('draft', 'cancelled') then
    return;
  end if;

  v_by := case when v_viewer is not null and v_viewer = v_user then 'owner' else 'client' end;

  if exists (
    select 1
    from public.quote_events e
    where e.quote_id = v_id
      and e.type = 'downloaded'
      and e.metadata ->> 'by' = v_by
      and e.created_at > now() - interval '10 minutes'
  ) then
    return;
  end if;

  insert into public.quote_events (quote_id, user_id, type, metadata)
  values (v_id, v_user, 'downloaded', jsonb_build_object('by', v_by));
end;
$$;

revoke execute on function public.register_quote_download(uuid) from public;
grant execute on function public.register_quote_download(uuid) to anon, authenticated;
