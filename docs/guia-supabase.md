# Guia: criar e conectar o projeto Supabase

Passo a passo para criar o projeto Supabase do InvoiceFlow, pensado para quem nunca usou.

> ✅ **Situação em 06/10/2026:** o projeto `invoiceflow` (São Paulo) já existe e foi configurado pelo Claude via CLI do Supabase (`npx supabase login` feito pelo usuário). Este guia fica como referência, ou para recriar o projeto do zero. O que já foi feito automaticamente:
> - `.env.local` gerado com a URL e a publishable key;
> - migrações aplicadas (`supabase db push`);
> - configurações de Auth aplicadas (`supabase config push`, a partir de `supabase/config.toml`).

> Nomes de menus conferidos na documentação oficial em 06/10/2026. O painel do Supabase é em inglês e às vezes muda de lugar: se algum nome estiver diferente, procure o equivalente.

## Antes de começar: o que é o Supabase

O Supabase é um "backend pronto". Ao criar um projeto, você ganha:

- **Um banco PostgreSQL** só seu: onde ficarão clientes, serviços e orçamentos.
- **Auth**: cadastro, login, logout e recuperação de senha, com os e-mails já prontos.
- **APIs automáticas**: o app conversa com o banco usando uma **chave pública** (*publishable key*).
- **RLS (Row Level Security)**: regras dentro do próprio banco do tipo "cada usuário só enxerga as próprias linhas". É isso que torna seguro usar a chave pública no navegador.

### Plano gratuito (Free)

- Até **2 projetos grátis**, sem cartão de crédito.
- Banco de **500 MB** e **50 mil usuários ativos por mês**: muito mais do que o InvoiceFlow vai precisar.
- ⚠️ **Pausa por inatividade:** se o projeto passar **7 dias com pouca atividade**, o Supabase o pausa (e avisa por e-mail antes). Para reativar: abra o projeto no painel e clique em **Resume project**. Dá para reativar em até 1 ano. Quando o app estiver publicado no portfólio, configuramos um acesso automático periódico para ele nunca pausar.

---

## Passo 1: criar a conta

1. Acesse **https://supabase.com** e clique em **Start your project**.
2. Entre com **GitHub** (recomendado, porque o repositório também vai para lá) ou com e-mail e senha.

## Passo 2: criar a organização

No primeiro acesso o Supabase pede uma **organização**, que é só uma "pasta" que agrupa projetos.

- **Name:** seu nome ou `InvoiceFlow`
- **Type:** `Personal`
- **Plan:** `Free`

Clique em **Create organization**.

## Passo 3: criar o projeto

1. Clique em **New project**.
2. Preencha:
   - **Organization:** a que você acabou de criar.
   - **Project name:** `invoiceflow`
   - **Database Password:** clique em **Generate a password** e **guarde num gerenciador de senhas**. Ela é a senha "de administrador" do banco. O app não usa essa senha, mas ela é necessária para ferramentas de banco no futuro e não dá para ver de novo depois (só redefinir).
   - **Region:** `South America (São Paulo)`. ⚠️ **Não dá para trocar depois.** São Paulo deixa o app mais rápido para usuários no Brasil.
   - Demais opções (segurança, *Data API* etc.): deixe **no padrão**.
3. Clique em **Create new project** e aguarde de 1 a 2 minutos enquanto o banco é preparado.

## Passo 4: copiar a URL e a chave pública

1. No topo do painel do projeto, clique em **Connect**. Escolha a aba de framework (*App Frameworks*) e **Next.js**. Ou vá em ⚙ **Project Settings** → **API Keys**.
2. Você vai precisar de dois valores:

   | O que | Como é | Vai para |
   |---|---|---|
   | **Project URL** | `https://xxxxxxxxxxxx.supabase.co` | `NEXT_PUBLIC_SUPABASE_URL` |
   | **Publishable key** | começa com `sb_publishable_` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |

### Sobre as chaves (importante)

- **Publishable key** (`sb_publishable_...`): pública, pode ficar no navegador. É a que usamos.
- **Secret key** (`sb_secret_...`): **ignora todas as regras de segurança do banco**. Não precisamos dela agora. **Nunca** a coloque no código, no `.env.local` do front, no Git ou num chat.
- Se aparecerem as chaves antigas **`anon`** e **`service_role`**: são o formato legado e serão desativadas até o fim de 2026. Use as novas.

## Passo 5: configurar a autenticação

No menu lateral do projeto, abra **Authentication**.

### 5.1 URLs permitidas

**Authentication → URL Configuration**

- **Site URL:** `http://localhost:3000`
- **Redirect URLs** → **Add URL**: `http://localhost:3000/**`

Isso diz ao Supabase para onde os links dos e-mails podem levar. No deploy adicionamos o domínio de produção.

### 5.2 Login por e-mail

**Authentication → Sign In / Providers** (em alguns painéis aparece só como **Providers**) → **Email**

- **Enable Email provider:** deixe **ligado**.
- **Confirm email:** **desligue por enquanto** e clique em **Save**. Motivo: o serviço de e-mail grátis do Supabase **só entrega para os e-mails da sua equipe** (o seu) e no máximo **2 por hora**. Com a confirmação ligada, qualquer conta de teste com outro e-mail ficaria travada sem conseguir confirmar. Antes do deploy configuramos um serviço de e-mail próprio (ex.: Resend, que tem plano grátis) e religamos.
- Se houver **Minimum password length**, coloque **8**, igual à validação do formulário.

### 5.3 E-mails em português (só com SMTP próprio)

⚠️ **No plano Free, com o e-mail padrão do Supabase, não é possível personalizar os templates.** A API responde: *"Email template modification is not available for free tier projects using the default email provider"*. Por isso, por enquanto, os e-mails saem com o **texto padrão, em inglês**.

O app já funciona com os templates padrão: o link do e-mail passa pelo Supabase e volta para `/auth/confirm?code=...`, que abre a sessão. ⚠️ Esse link precisa ser aberto **no mesmo navegador** em que a recuperação foi pedida.

Os templates em português já estão prontos no repositório (`supabase/templates/recovery.html` e `confirmation.html`). Quando configurarmos um SMTP próprio (ex.: Resend), é só reativar os blocos `[auth.email.template.*]` no `supabase/config.toml` e rodar `supabase config push`.

## Passo 6: preencher o `.env.local`

1. Na pasta do projeto, crie o arquivo a partir do modelo (PowerShell):

   ```powershell
   Copy-Item .env.example .env.local
   ```

2. Abra o `.env.local` no VS Code e preencha:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxx
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

3. Salve. O `.env.local` já está no `.gitignore` e não vai para o Git.

## Passo 7: me avisar

Diga "pronto" na conversa, **sem colar os valores**. Eu confiro se as variáveis estão no formato certo, sem exibir o conteúdo, e começo a etapa 6:

- login, cadastro, logout e recuperação de senha de verdade;
- proteção das páginas privadas (sem login → vai para `/login`);
- tabela `profiles` com as regras RLS;
- seu nome real no menu do usuário.

---

## Como testar a recuperação de senha

O e-mail padrão do Supabase **só entrega para os e-mails da equipe da organização**, ou seja, o da sua conta Supabase. Para testar:

1. Crie uma conta no app (`/signup`) **com o mesmo e-mail da sua conta Supabase**.
2. Saia, vá em **Esqueceu a senha?** e peça o link para esse e-mail.
3. Abra o e-mail (em inglês, "Reset Your Password") **no mesmo navegador** e clique no link.
4. Você cai em `/reset-password`, já com a sessão de recuperação aberta. Defina a nova senha.

Limite: **2 e-mails por hora** no plano Free.

## Resumo do que guardar e onde

| Item | Onde guardar | Segredo? |
|---|---|---|
| Database Password | Gerenciador de senhas | **Sim** |
| Project URL | `.env.local` | Não |
| Publishable key | `.env.local` | Não (é pública por design) |
| Secret key | Não copie por enquanto | **Sim, muito** |
