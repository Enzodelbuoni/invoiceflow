-- Configurações (Sprint 22, etapa 38): dados do negócio, o emitente das
-- propostas. O perfil (profiles) é a pessoa; o negócio (businesses) é como ela
-- aparece para o cliente. Campo do negócio em branco → vale o do perfil (nome,
-- e-mail da conta, telefone). A identidade visual (logo e cor) entra depois
-- nesta mesma tabela.
--
-- Os dados do emitente são lidos na hora (como os do cliente): mudar o
-- telefone aqui atualiza também as propostas já enviadas.

-- ── Perfil: o usuário só altera nome e telefone ─────────────────────
-- O GRANT de UPDATE era da tabela inteira: dava para trocar o `email` (que
-- espelha o da conta e aparece nas propostas) direto pela API.
revoke update on public.profiles from authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

-- Telefone só com dígitos, como o dos clientes (a interface formata).
alter table public.profiles
  add constraint profiles_phone_digits check (phone ~ '^[0-9]{10,11}$');

-- ── Negócio ─────────────────────────────────────────────────────────
-- 1:1 com o perfil; a linha nasce no primeiro "Salvar" (upsert).
create table public.businesses (
  user_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  -- Nome que aparece nas propostas (nome fantasia ou profissional).
  name text check (char_length(btrim(name)) between 2 and 120),
  legal_name text check (char_length(legal_name) <= 160), -- razão social
  document text check (document ~ '^([0-9]{11}|[0-9]{14})$'), -- CPF (11) ou CNPJ (14)
  email text check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  phone text check (phone ~ '^[0-9]{10,11}$'),
  -- Endereço completo (com http/https: nunca javascript: num link da proposta).
  website text check (website ~* '^https?://[^\s/]+\.[^\s]+$' and char_length(website) <= 200),
  address text check (char_length(address) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.businesses is 'Dados do negócio de cada usuário: o emitente das propostas (1:1 com profiles).';

create trigger businesses_set_updated_at
  before update on public.businesses
  for each row execute function public.set_updated_at();

alter table public.businesses enable row level security;

-- Sem DELETE: a linha some junto com o perfil (cascade). O upsert do PostgREST
-- (ON CONFLICT DO UPDATE) precisa de SELECT, INSERT e UPDATE.
revoke all on public.businesses from anon, authenticated;
grant select, insert, update on public.businesses to authenticated;
grant select, insert, update, delete on public.businesses to service_role;

create policy "Usuário lê o próprio negócio"
  on public.businesses for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Usuário cria o próprio negócio"
  on public.businesses for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Usuário atualiza o próprio negócio"
  on public.businesses for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ── Leitura pública: o emitente vem do negócio ──────────────────────
-- Igual à da migração quote_responses; muda só o `issuer`, que ganha razão
-- social, documento, site e endereço, e usa o nome/e-mail/telefone do negócio
-- quando preenchidos (senão os do perfil, como antes).
create or replace function public.get_public_quote(p_public_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_quote public.quotes;
  v_issuer jsonb;
  v_owner boolean;
begin
  select q.* into v_quote
  from public.quotes q
  where q.public_id = p_public_id and q.status <> 'draft';

  if not found then
    return null;
  end if;

  v_owner := coalesce((select auth.uid()) = v_quote.user_id, false);

  select jsonb_build_object(
    'name', coalesce(nullif(btrim(b.name), ''), nullif(btrim(p.full_name), ''), split_part(p.email, '@', 1)),
    'legal_name', b.legal_name,
    'document', b.document,
    'email', coalesce(b.email, p.email),
    'phone', coalesce(b.phone, p.phone),
    'website', b.website,
    'address', b.address
  ) into v_issuer
  from public.profiles p
  left join public.businesses b on b.user_id = p.id
  where p.id = v_quote.user_id;

  if v_quote.status = 'cancelled' then
    return jsonb_build_object(
      'quote', jsonb_build_object(
        'quote_number', v_quote.quote_number,
        'status', v_quote.status,
        'title', v_quote.title
      ),
      'client', null,
      'issuer', v_issuer,
      'response', null,
      'viewer_is_owner', v_owner
    );
  end if;

  return jsonb_build_object(
    'quote', jsonb_build_object(
      'quote_number', v_quote.quote_number,
      'status', v_quote.status,
      'title', v_quote.title,
      'description', v_quote.description,
      'created_at', v_quote.created_at,
      'sent_at', v_quote.sent_at,
      'approved_at', v_quote.approved_at,
      'declined_at', v_quote.declined_at,
      'valid_until', v_quote.valid_until,
      'discount_type', v_quote.discount_type,
      'discount_value', v_quote.discount_value,
      'tax_rate_bps', v_quote.tax_rate_bps,
      'subtotal_cents', v_quote.subtotal_cents,
      'discount_total_cents', v_quote.discount_total_cents,
      'tax_total_cents', v_quote.tax_total_cents,
      'total_cents', v_quote.total_cents,
      'notes', v_quote.notes,
      'terms', v_quote.terms,
      'items', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'name', i.name,
            'description', i.description,
            'quantity_hundredths', i.quantity_hundredths,
            'unit', i.unit,
            'unit_price_cents', i.unit_price_cents,
            'subtotal_cents', i.subtotal_cents
          )
          order by i.position
        )
        from public.quote_items i
        where i.quote_id = v_quote.id
      ), '[]'::jsonb)
    ),
    'client', (
      select jsonb_build_object(
        'name', c.name,
        'company', c.company,
        'email', c.email,
        'phone', c.phone,
        'document', c.document,
        'address', c.address
      )
      from public.clients c
      where c.id = v_quote.client_id and c.user_id = v_quote.user_id
    ),
    'issuer', v_issuer,
    'response', (
      select jsonb_build_object(
        'decision', r.decision,
        'signer_name', r.signer_name,
        'responded_at', r.created_at
      )
      from public.quote_responses r
      where r.quote_id = v_quote.id
    ),
    'viewer_is_owner', v_owner
  );
end;
$$;
