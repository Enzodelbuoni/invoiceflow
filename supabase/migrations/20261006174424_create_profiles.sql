-- Perfis dos usuários (1:1 com auth.users), conforme a seção 2.1 do plano.
-- Criado automaticamente no cadastro por um gatilho em auth.users.

-- ── Tabela ──────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 80),
  email text not null,
  avatar_url text,
  phone text check (char_length(phone) <= 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Dados de perfil de cada usuário (1:1 com auth.users).';

-- ── Segurança ───────────────────────────────────────────────────────
-- Desde 2026 tabelas novas não ficam expostas na Data API automaticamente:
-- o acesso precisa de GRANT explícito, e o RLS decide QUAIS linhas.
-- O perfil é criado pelo gatilho (não pelo usuário) e apagado em cascata,
-- então o usuário só precisa ler e editar o próprio.
alter table public.profiles enable row level security;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles to service_role;

create policy "Usuário lê o próprio perfil"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

-- UPDATE precisa de USING (qual linha pode alterar) e WITH CHECK (como pode ficar),
-- senão daria para "transferir" a linha para outro id.
create policy "Usuário atualiza o próprio perfil"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ── updated_at automático ───────────────────────────────────────────
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ── Perfil criado no cadastro ───────────────────────────────────────
-- SECURITY DEFINER é necessário: quem insere em auth.users é o serviço de Auth,
-- que não tem permissão em public.profiles. search_path vazio evita sequestro
-- de nomes. O nome vem dos metadados do cadastro (apenas exibição, nunca autorização).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 80),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Funções em public ganham EXECUTE para todos por padrão. Estas só devem rodar
-- como gatilho, então ninguém precisa executá-las diretamente.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
