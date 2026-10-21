-- Identidade visual (Sprint 22, etapa 39): logo e cor de destaque do negócio,
-- aplicados ao documento da proposta (página interna, pública e PDF).
--
-- Logo: o app recebe a imagem, confere o formato pelo conteúdo e a regrava
-- com o sharp (WebP de até 512 px, sem metadados) antes de enviar ao Storage.
-- O bucket é público (o cliente e o PDF leem sem login; o logo não é segredo),
-- mas só aceita WebP pequeno, e cada usuário só grava na própria pasta
-- (<user_id>/logo-<uuid>.webp). Nome novo a cada envio: a URL nunca fica velha
-- no cache.

-- ── Colunas do negócio ──────────────────────────────────────────────
alter table public.businesses
  add column logo_path text,
  add column accent_color text;

alter table public.businesses
  add constraint businesses_logo_path_check check (
    logo_path ~ '^[0-9a-f-]{36}/logo-[0-9a-f-]{36}\.webp$'
    and split_part(logo_path, '/', 1) = user_id::text
  ),
  -- Hex em minúsculas (#4f46e5). O contraste do texto é ajustado no app.
  add constraint businesses_accent_color_check check (accent_color ~ '^#[0-9a-f]{6}$');

-- ── Bucket dos logos ────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 524288, array['image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Leitura pública pela URL do bucket público (não precisa de política). As
-- políticas abaixo valem para a API do Storage com o login do usuário:
-- enviar, listar/ler pela API (o remove() precisa) e apagar, só na própria
-- pasta. Sem UPDATE: cada envio cria um arquivo novo (sem upsert).
create policy "Usuário envia logo na própria pasta"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Usuário lê os próprios logos pela API"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Usuário apaga os próprios logos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ── Leitura pública: o emitente leva o logo e a cor ─────────────────
-- Igual à da migração business_settings, com logo_path e accent_color no
-- `issuer` (o app monta a URL pública do logo).
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
    'address', b.address,
    'logo_path', b.logo_path,
    'accent_color', b.accent_color
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
