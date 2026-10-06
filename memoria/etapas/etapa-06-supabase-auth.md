# Etapa 06 — Sprint 3 (parte 2): Supabase Auth conectado

**Data:** 2026-10-06
**Status:** ✅ Concluída (o teste de recuperação de senha com e-mail real fica com o usuário)

## Contexto

O usuário pediu para eu fazer "a etapa do Supabase sem ele", depois de instalar o plugin oficial `supabase@claude-plugins-official`.
- O MCP do plugin não carregou na sessão (foi instalado com ela aberta) e exige OAuth.
- Usei o **CLI do Supabase**: o usuário só rodou `npx supabase login` no próprio terminal.
- O projeto `invoiceflow` (ref `btglemtjexvwperrbfud`, região `sa-east-1`, Postgres 17) **já existia**: o usuário o criou seguindo o guia. Usei esse projeto. Na conta também há o "Notas Enzo" (pausado), que não foi tocado.

## O que foi feito

### Infra do Supabase (via CLI)
- `supabase` CLI **2.120.0** como devDependency. `supabase init` e `supabase link --project-ref btglemtjexvwperrbfud` (não precisou da senha do banco: o CLI usa um "login role" temporário pela Management API).
- **`.env.local` gerado por script:** a saída de `projects api-keys` foi direto para um Node que grava a URL e a **publishable key**, sem exibir valores. A secret key não foi gravada.
- **Migrações** (`supabase db push --linked`):
  1. `20261006174424_create_profiles.sql`:
     - tabela `profiles` (id → `auth.users` com cascade, full_name ≤ 80, email, avatar_url, phone, timestamps);
     - RLS e políticas select/update do dono (`to authenticated` + `(select auth.uid()) = id`, com `using` + `with check` no update);
     - gatilho `on_auth_user_created` → `handle_new_user()` (security definer, `search_path=''`);
     - gatilho `profiles_set_updated_at` → `set_updated_at()`;
     - `revoke execute` das duas funções para public/anon/authenticated.
  2. `20261006180457_restrict_profiles_grants.sql`: `revoke all` de anon/authenticated + `grant select, update` para authenticated (ver problemas).
- **Advisors** (`supabase db advisors --linked`): **No issues found**.
- **Auth** (`supabase config push`, a partir do `supabase/config.toml`):
  - Redirect URLs `http://localhost:3000/**` (o Site URL remoto já era `http://localhost:3000`);
  - **Confirm email desligado**;
  - senha mínima **8** + `letters_digits`.
  - OTP (8), MFA/TOTP (ligado) e storage analytics foram **alinhados ao valor remoto** no `config.toml`, para o push não alterá-los. Os templates pt-BR ficaram **desativados** (ver problemas).

### Código
- `src/proxy.js` + `src/lib/supabase/proxy.js`: sessão renovada com `getClaims()`, rotas privadas → `/login?next=...`, logado em `/login|/signup|/forgot-password` → `/dashboard`. Redirecionamentos copiam os cookies. Sem env vars, deixa tudo passar (modo demonstração).
- `src/lib/auth/redirect.js`: `PROTECTED_PREFIXES`, `GUEST_ONLY_PATHS`, `getSafeRedirect()` (anti open redirect com `new URL`; 13 casos testados).
- `src/lib/auth/client.js`:
  - Supabase de verdade; `AUTH_DEMO_MODE = !isSupabaseConfigured()`;
  - erros do auth-js (`code`) → mensagens pt-BR;
  - `signUp` devolve `{ needsEmailConfirmation }`;
  - `emailRedirectTo` e `redirectTo` apontam para `${origin}/auth/confirm?next=...`.
- `src/lib/auth/server.js` (`server-only`): `getCurrentUser()` (com `cache`, `getClaims` + `profiles.full_name`; usuário fictício em demo) e `requireUser()`.
- `src/app/auth/confirm/route.js`: aceita **`?code=`** (templates padrão, PKCE → `exchangeCodeForSession`) e **`?token_hash=&type=`** (templates próprios → `verifyOtp`). Falha → `/reset-password?erro=link-invalido` ou `/login?erro=link-invalido`.
- **Telas:**
  - layout privado com `requireUser()` (segunda barreira, como pede a doc do Next 16);
  - `/login` lê `?next` (validado) e `?erro`;
  - `/reset-password` sem sessão → "link inválido"; após trocar a senha → `/dashboard`;
  - cadastro com painel "Confirme seu e-mail".
- `package.json`: `engines.node >= 22.0.0` (supabase-js 2.117 exige Node 22).
- `docs/guia-supabase.md` atualizado: situação atual, 5.3 corrigido (templates só com SMTP) e "Como testar a recuperação de senha".

## Verificação

- `npm run lint` ✅ · `npm run build` ✅ (`ƒ Proxy`, `/auth/confirm` dinâmica).
- Proteção testada com build + Supabase falso (localhost:3100) e depois com o projeto real.
- **Ponta a ponta no Chrome com o Supabase real** (conta de teste `@example.com`, credenciais aleatórias que não foram exibidas):
  - cadastro → toast → `/dashboard` com nome e e-mail reais na sidebar;
  - logado em `/login` → `/dashboard`;
  - Sair → `/login` com toast;
  - deslogado em `/quotes` → `/login?next=%2Fquotes`;
  - senha errada → "E-mail ou senha incorretos.";
  - senha certa → volta para `/quotes`;
  - recuperação para `@example.com` → "Este endereço de e-mail não é aceito. Use outro." (o Supabase recusa esse domínio);
  - console sem erros.
- **RLS testado no banco** (simulando os papéis com `set local role` + `request.jwt.claims`):

  | Caso | Resultado |
  |---|---|
  | Gatilho criou o perfil | ✅ |
  | Dono atualiza e `updated_at` muda | ✅ (o `revoke execute` não impede o gatilho) |
  | Outro usuário | vê 0 linhas |
  | anon | `permission denied` |

- **Limpeza:** conta de teste apagada (`delete from auth.users` com cascade). O banco ficou com **0 usuários e 0 perfis**. Arquivo de credenciais removido.

## Problemas encontrados

1. **MCP do plugin não disponível na sessão:** instalado com a sessão aberta e exige OAuth. Para usar: reiniciar o Claude Code (`claude --continue`) e autenticar em `/mcp`. Não foi necessário (o CLI resolveu).
2. **`npx supabase ...` travava** de forma intermitente (sem nenhuma saída, nem com `--debug`). **Solução:** chamar o CLI direto: `node node_modules/supabase/dist/supabase.js <comando>`. A partir da 2.x recente o CLI é um programa Node (`dist/supabase.js`), não mais um binário.
3. **Permissões padrão amplas:** o projeto foi criado com "expor tabelas novas automaticamente", então `anon` e `authenticated` ganharam ALL (inclusive `TRUNCATE`, que não passa pelo RLS). O `GRANT` da migração só somava permissões. Corrigido com a 2ª migração. **Regra:** toda migração faz `revoke all on <tabela> from anon, authenticated` + `grant` explícito.
4. **Templates de e-mail bloqueados no plano Free** sem SMTP próprio (HTTP 400 no `config push`, que derruba o push de Auth inteiro). Os templates ficam comentados no `config.toml`, com os arquivos prontos em `supabase/templates/`. Os e-mails saem em inglês, e a rota `/auth/confirm` aceita o `?code=` do fluxo padrão. **Limitação do fluxo padrão (PKCE):** o link precisa ser aberto no **mesmo navegador** que pediu o e-mail.
5. **`config push` com o `config.toml` padrão mudaria configurações não pedidas** (OTP 8→6, desligar MFA/TOTP, storage analytics). Sempre revisar a diferença primeiro (`printf 'n\nn\n' | ... config push`) e alinhar o `config.toml` ao remoto.
6. A consulta via `db query --linked` devolve os dados entre marcadores de "untrusted data". Os dados do banco são tratados como dados, nunca como instruções.

## Comandos úteis (CLI)

```bash
S="node node_modules/supabase/dist/supabase.js"
$S db query --linked "select ..."           # SQL no projeto remoto
$S migration new <nome>                      # cria o arquivo de migração
$S db push --linked --dry-run                # ensaia; sem --dry-run aplica (pede confirmação; usar --yes)
$S db advisors --linked                      # auditoria de segurança e desempenho
printf 'n\nn\n' | $S config push --project-ref btglemtjexvwperrbfud   # só mostra a diferença
```
