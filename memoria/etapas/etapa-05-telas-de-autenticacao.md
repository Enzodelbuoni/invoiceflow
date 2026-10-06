# Etapa 05 — Sprint 3 (parte 1): telas de autenticação + guia do Supabase

**Data:** 2026-10-06
**Status:** ✅ Concluída (a autenticação ainda é simulada: "modo demonstração")

## Decisão de backend: Supabase (depois de cogitar Firebase)

1. Depois do commit da etapa 4, o usuário pediu para usar **Firebase** na etapa 6. Escrevi um guia do Firebase e troquei o `.env.example`.
2. Ele perguntou qual era mais vantajoso. Recomendei o **Supabase** para este projeto:
   - dados relacionais (dashboard, filtros e busca em SQL);
   - regras de negócio atômicas no banco (aprovação, numeração, NUMERIC);
   - integração SSR oficial com o Next.js;
   - aderência ao plano e ao `info.txt` (PostgreSQL + RLS).

   O ponto contra o Supabase é a pausa do plano Free por inatividade.
3. **O usuário decidiu pelo Supabase** e pediu um guia no lugar do do Firebase, porque **nunca usou Supabase**.
   - `docs/guia-firebase.md` foi apagado (nunca chegou a ser commitado) e substituído por **`docs/guia-supabase.md`**. O guia, para iniciante, cobre:
     - o que é o Supabase e o plano Free;
     - criar conta, organização e projeto em São Paulo;
     - copiar a URL e a publishable key;
     - configurar o Auth: URLs, provedor de e-mail com "Confirm email" **desligado** por enquanto, senha mínima 8;
     - os templates "Reset Password" e "Confirm signup" em pt-BR, apontando para `/auth/confirm?token_hash=...`;
     - preencher o `.env.local`.
   - `.env.example` voltou para o Supabase (URL + publishable key + site URL), agora com aviso sobre a secret key.

Fatos conferidos na documentação oficial em 2026-10-06:
- **Chaves:**
  - publishable `sb_publishable_...`: pública;
  - secret `sb_secret_...`: ignora o RLS e é só para o servidor;
  - legadas `anon`/`service_role`: serão desativadas até o fim de 2026.
  - Ficam em **Project Settings → API Keys** ou no botão **Connect**.
- **Next 16:** arquivo `proxy`, que renova o token com `supabase.auth.getClaims()`. Para proteger páginas usar `getClaims`; o `getSession` não é confiável para autorização.
- **Recuperação de senha (SSR/PKCE):**
  - `resetPasswordForEmail` envia o e-mail, cujo template usa `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=...`;
  - a rota `/auth/confirm` chama `verifyOtp({ type, token_hash })` e abre a sessão;
  - na nova senha, `updateUser({ password })`.
- **Projetos hospedados exigem confirmação de e-mail por padrão.**
- **E-mail padrão do Supabase:** só entrega para membros da equipe da organização e no máximo **2 por hora**. Recomendam SMTP próprio, que começa com 30/hora e é ajustável.
- **Plano Free:**
  - 2 projetos, 500 MB de banco, 50 mil MAU;
  - pausa após **7 dias com pouca atividade** (com e-mail de aviso antes);
  - reativação pelo botão **Resume project** em até **1 ano**.

### Ajustes no código por causa do Supabase
- `/reset-password` não lê mais `oobCode` (era do Firebase). Agora mostra "Link inválido ou expirado" quando recebe `?erro=link-invalido` (a `/auth/confirm` vai redirecionar assim na etapa 6). Senão, mostra o formulário.
- `ResetPasswordForm` não recebe mais `code`. `confirmPasswordReset({ password })` (no Supabase, `updateUser` na sessão de recuperação).

## O que foi feito

### Componentes shadcn novos
`field`, `input-group`, `spinner`, `checkbox` (o `checkbox` ainda não é usado; fica para o aceite do Sprint 15).
- O CLI quis sobrescrever o `button.jsx` (diferença só de formatação). Foi mantida a nossa versão: rodei com `printf 'n\n' | npx shadcn add ...`, que responde "não" ao prompt. Com `--yes` o CLI para na pergunta e instala só parte dos componentes.
- CRLF → LF nos arquivos novos. `aria-label` do Spinner traduzido para "Carregando".

### Validação (`src/lib/validations/auth.js`)
- `loginSchema`, `signupSchema` (nome, e-mail, senha **sem** confirmação; o campo tem mostrar/ocultar), `forgotPasswordSchema`, `resetPasswordSchema` (com confirmação e `.refine` entre campos).
- E-mail: `trim` + `toLowerCase` + `z.email()`. Senha nova: 8–128 caracteres, ao menos 1 letra (aceita acentos) e 1 número.
- `PASSWORD_REQUIREMENTS` (alimenta o checklist visual) e `getPasswordStrength()` (0–4).
- **Zod v4:** mensagens com `{ error: "..." }` (o `message` está obsoleto). `zodResolver` do `@hookform/resolvers` v5 funciona com Zod 4 (testado em Node).

### Camada de autenticação (`src/lib/auth/client.js`)
- `AUTH_DEMO_MODE = true`: `signIn`, `signUp`, `signOut`, `requestPasswordReset` e `confirmPasswordReset` só simulam latência e resolvem com sucesso. **Nada sai do navegador.**
- `AuthError(code, message)` + `getAuthErrorMessage(error)`. Os formulários só conhecem essa interface. **Na etapa 6 troca-se o miolo pelo Supabase sem mexer nos formulários.**

### Componentes (`src/components/auth/`)
| Arquivo | O quê |
|---|---|
| `auth-brand-panel.jsx` | Painel da marca (só em `lg+`): fundo índigo escuro com brilhos e grade mascarada, título serif "Propostas que *fecham* negócio.", **proposta de exemplo** flutuando (StatusBadge "Aprovado", itens, total em serif) e notificação "Proposta aprovada" que entra com 900 ms de atraso. Destaques no rodapé. |
| `auth-heading.jsx` | Título serif + descrição. |
| `password-input.jsx` | `InputGroup` com botão mostrar/ocultar (`aria-pressed`, ícone troca com animação). |
| `password-strength.jsx` | 4 barras (Muito fraca → Forte, com cores) + checklist animado dos requisitos (com texto para leitor de tela). |
| `form-alert.jsx` | Erro geral do formulário (`role="alert"`). |
| `submit-button.jsx` | Botão h-10 com spinner, `aria-busy` e seta que desliza no hover. |
| `login-form.jsx`, `signup-form.jsx`, `forgot-password-form.jsx`, `reset-password-form.jsx` | React Hook Form + Zod, `mode: "onTouched"`, `aria-invalid`, `aria-describedby`, foco no primeiro erro, `autoComplete` corretos. Após o sucesso: toast e `router.push` dentro de `useTransition` (o botão segue "carregando" até a navegação terminar). |

### Rotas `(auth)`
- `layout.js`: grade em 2 colunas (painel da marca + formulário). No mobile só o formulário, com o logo no topo. `ThemeToggle` e selo "Modo demonstração: nenhum dado é enviado" (some quando `AUTH_DEMO_MODE` for `false`).
- `template.js`: entrada em sequência (0, 90, 180 ms).
- `/login`, `/signup`, `/forgot-password` (o estado de sucesso "Verifique seu e-mail" não revela se a conta existe), `/reset-password` (com `?erro=link-invalido` mostra "Link inválido ou expirado"; senão, o formulário de nova senha).

### Outras mudanças
- `NavUser`: "Sair" chama `signOut()`, mostra toast e leva para `/login`.
- Home `/`: título serif, botões "Criar conta grátis" e "Entrar". Saiu o indicador "Supabase configurado".

## Verificação

- `npm run lint` ✅ · `npm run build` ✅ (`/login`, `/signup`, `/forgot-password` estáticas; `/reset-password` dinâmica).
- Chrome:
  - **Login:** envio vazio mostra erros em pt-BR, `aria-invalid`, `aria-describedby` e foco no e-mail. Mostrar senha OK. Login demo → toast → `/dashboard`.
  - **Cadastro:** medidor de força Muito fraca → Razoável → Forte, com checklist animado.
  - **Recuperação:** "Enviando…" → painel de sucesso com transição.
  - **Nova senha:** link inválido e validação dos dois campos OK.
  - **Sair:** menu da conta → "Sair" → toast → `/login`.
  - Atrasos do stagger conferidos (0, 0.09, 0.18 s). Tema claro e escuro conferidos. Console sem erros.
- Mobile (iframes de 390 px): sem rolagem horizontal, painel da marca oculto, logo no topo.

## Problemas encontrados

- **Notificação cobria o selo "Aprovado"** no painel da marca: movida para cima do cartão (`-top-14`).
- **Animação dupla** na recuperação de senha: o `motion.form`/`motion.div` era filho direto do `template.js` e recebia a animação CSS junto com a do motion. Corrigido envolvendo o componente num `<div>`. **Regra:** componente com troca animada (AnimatePresence) não deve ser filho direto de um `template.js` com `*:animate-enter`.
- **Rodapé duplicado** no sucesso da recuperação ("Voltar para o login" duas vezes): o rodapé foi para dentro do componente e só aparece no estado do formulário.
- **Ambiente de teste:** a aba do Chrome estava oculta (`document.visibilityState === "hidden"`). Nesse estado:
  - o clique não move o foco e o teclado não chega à página;
  - os menus do Radix não abrem com clique;
  - as animações só avançam quando há screenshot.

  Para testar mesmo assim: preencher campos com o setter nativo + evento `input`, abrir menus Radix com `PointerEvent('pointerdown')` e então `click()` no item. **Não é bug do app.**
- `animate-enter` + `animation-delay` em classes separadas: a ordem no CSS não é garantida, então atrasos isolados vão como `style={{ animationDelay }}`. Nos `template.js` funciona porque os atrasos usam variantes `[&>*:nth-child(n)]` (conferido no navegador).
