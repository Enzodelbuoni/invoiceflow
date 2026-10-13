-- Máquina de estados do orçamento (Sprint 12) + histórico de eventos.
--
--   draft ──enviar──▶ sent ──cliente abre──▶ viewed
--     │                 │                       │
--     └──cancelar──▶ cancelled ◀──cancelar──────┤
--                       sent/viewed ──▶ approved | declined (cliente, Sprint 15)
--                       sent/viewed ──▶ expired (rotina diária, validade vencida)
--
-- O status (e as datas de envio/aprovação/recusa) só muda pelas funções do app:
-- elas ligam a variável de transação invoiceflow.status_transition, e a guarda
-- recusa qualquer mudança sem ela (um UPDATE direto pela API não consegue
-- ligá-la: o PostgREST não expõe set_config). A guarda também confere se a
-- transição existe. Erros de negócio usam 55000/P0002/22023 — nunca a classe
-- 40 (o PostgREST repetiria a transação; ver etapa 17).

-- ── Guarda: identidade, conteúdo e status ───────────────────────────
create or replace function private.guard_quote_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.user_id, new.quote_number, new.public_id, new.created_at)
     is distinct from (old.user_id, old.quote_number, old.public_id, old.created_at) then
    raise exception 'Número, link público e dono do orçamento não podem ser alterados.' using errcode = '55000';
  end if;

  if old.status <> 'draft' and (
       new.client_id, new.title, new.description, new.valid_until,
       new.discount_type, new.discount_value, new.tax_rate_bps,
       new.subtotal_cents, new.discount_total_cents, new.tax_total_cents, new.total_cents,
       new.notes, new.terms
     ) is distinct from (
       old.client_id, old.title, old.description, old.valid_until,
       old.discount_type, old.discount_value, old.tax_rate_bps,
       old.subtotal_cents, old.discount_total_cents, old.tax_total_cents, old.total_cents,
       old.notes, old.terms
     ) then
    raise exception 'Orçamento enviado não pode ser alterado.' using errcode = '55000';
  end if;

  if (new.status, new.sent_at, new.approved_at, new.declined_at)
     is distinct from (old.status, old.sent_at, old.approved_at, old.declined_at) then
    if coalesce(current_setting('invoiceflow.status_transition', true), '') <> 'on' then
      raise exception 'O status do orçamento só muda pelas ações do app.' using errcode = '55000';
    end if;
    if new.status is distinct from old.status and not (
         (old.status = 'draft' and new.status in ('sent', 'cancelled'))
      or (old.status = 'sent' and new.status = 'viewed')
      or (old.status in ('sent', 'viewed') and new.status in ('approved', 'declined', 'expired', 'cancelled'))
    ) then
      raise exception 'Mudança de status não permitida (% → %).', old.status, new.status using errcode = '55000';
    end if;
  end if;

  return new;
end;
$$;

-- ── Histórico de eventos (seção 2.6 do plano) ───────────────────────
create table public.quote_events (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null,
  user_id uuid not null,
  type text not null check (
    type in ('created', 'updated', 'sent', 'viewed', 'approved', 'declined', 'expired', 'cancelled', 'downloaded')
  ),
  metadata jsonb,
  created_at timestamptz not null default now(),

  constraint quote_events_quote_fkey foreign key (quote_id, user_id)
    references public.quotes (id, user_id) on delete cascade
);

comment on table public.quote_events is 'Linha do tempo de cada orçamento (gravada por gatilho; base das métricas).';

-- Linha do tempo de um orçamento e eventos do usuário por data (métricas).
create index quote_events_quote_id_created_at_idx on public.quote_events (quote_id, created_at);
create index quote_events_user_id_created_at_idx on public.quote_events (user_id, created_at desc);

alter table public.quote_events enable row level security;
revoke all on public.quote_events from anon, authenticated;
-- Só leitura pela API: quem grava é o gatilho abaixo (ninguém forja eventos).
grant select on public.quote_events to authenticated;
grant select, insert, update, delete on public.quote_events to service_role;

create policy "Usuário lê os eventos dos próprios orçamentos"
  on public.quote_events for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Criado → "created"; mudou de status → o novo status; editado → "updated".
-- SECURITY DEFINER: grava no histórico sem dar INSERT aos usuários.
create function private.log_quote_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.quote_events (quote_id, user_id, type) values (new.id, new.user_id, 'created');
  elsif new.status is distinct from old.status then
    insert into public.quote_events (quote_id, user_id, type, metadata)
    values (new.id, new.user_id, new.status, jsonb_build_object('from', old.status));
  else
    insert into public.quote_events (quote_id, user_id, type) values (new.id, new.user_id, 'updated');
  end if;
  return null;
end;
$$;

revoke execute on function private.log_quote_event() from public, anon, authenticated;

create trigger quotes_log_event
  after insert or update on public.quotes
  for each row execute function private.log_quote_event();

-- Orçamentos que já existiam ganham o evento de criação.
insert into public.quote_events (quote_id, user_id, type, created_at)
select q.id, q.user_id, 'created', q.created_at
from public.quotes q;

-- ── Ações do dono (RPC) ─────────────────────────────────────────────
-- Enviar: só rascunho e com a validade em dia. SECURITY INVOKER (o RLS vale).
create function public.send_quote(p_quote_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_status text;
  v_valid_until date;
begin
  if v_user is null then
    raise exception 'Sessão inválida.' using errcode = '28000';
  end if;

  select q.status, q.valid_until into v_status, v_valid_until
  from public.quotes q
  where q.id = p_quote_id and q.user_id = v_user
  for update;

  if not found then
    raise exception 'Orçamento não encontrado.' using errcode = 'P0002';
  end if;
  if v_status <> 'draft' then
    raise exception 'Só rascunhos podem ser enviados.' using errcode = '55000';
  end if;
  if v_valid_until < v_today then
    raise exception 'A validade já passou.' using errcode = '22023';
  end if;

  perform set_config('invoiceflow.status_transition', 'on', true);
  update public.quotes q set status = 'sent', sent_at = now() where q.id = p_quote_id;
  perform set_config('invoiceflow.status_transition', '', true);
end;
$$;

-- Cancelar: rascunho, enviado ou visualizado (tira a proposta do ar).
create function public.cancel_quote(p_quote_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_status text;
begin
  if v_user is null then
    raise exception 'Sessão inválida.' using errcode = '28000';
  end if;

  select q.status into v_status
  from public.quotes q
  where q.id = p_quote_id and q.user_id = v_user
  for update;

  if not found then
    raise exception 'Orçamento não encontrado.' using errcode = 'P0002';
  end if;
  if v_status not in ('draft', 'sent', 'viewed') then
    raise exception 'Este orçamento não pode mais ser cancelado.' using errcode = '55000';
  end if;

  perform set_config('invoiceflow.status_transition', 'on', true);
  update public.quotes q set status = 'cancelled' where q.id = p_quote_id;
  perform set_config('invoiceflow.status_transition', '', true);
end;
$$;

revoke execute on function public.send_quote(uuid) from public, anon;
revoke execute on function public.cancel_quote(uuid) from public, anon;
grant execute on function public.send_quote(uuid) to authenticated;
grant execute on function public.cancel_quote(uuid) to authenticated;

-- ── Expiração (sent/viewed com a validade vencida → expired) ────────
-- Validade = até o fim do dia valid_until em São Paulo. Roda todo dia às
-- 00h01 de São Paulo (03h01 UTC); se o projeto ficar pausado, a próxima
-- execução pega todos os atrasados. A aprovação (Sprint 15) confere a validade
-- por conta própria, então não depende do horário da rotina.
create index quotes_open_valid_until_idx on public.quotes (valid_until) where status in ('sent', 'viewed');

create function private.expire_quotes()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  perform set_config('invoiceflow.status_transition', 'on', true);
  update public.quotes q
  set status = 'expired'
  where q.status in ('sent', 'viewed')
    and q.valid_until < (now() at time zone 'America/Sao_Paulo')::date;
  get diagnostics v_count = row_count;
  perform set_config('invoiceflow.status_transition', '', true);
  return v_count;
end;
$$;

revoke execute on function private.expire_quotes() from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule('invoiceflow-expire-quotes', '1 3 * * *', $$select private.expire_quotes()$$);

-- ── Exclusão: só rascunhos (regra 11: o que foi enviado é histórico) ──
-- Para tirar uma proposta enviada do ar, cancela-se. Excluir a conta continua
-- apagando tudo (a cascata não passa pelo RLS).
drop policy "Usuário exclui os próprios orçamentos" on public.quotes;

create policy "Usuário exclui os próprios rascunhos"
  on public.quotes for delete
  to authenticated
  using ((select auth.uid()) = user_id and status = 'draft');
