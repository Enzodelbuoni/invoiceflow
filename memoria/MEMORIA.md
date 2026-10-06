# MEMÓRIA DO PROJETO — InvoiceFlow

> **Para o Claude:** este arquivo é carregado automaticamente em toda sessão (via `CLAUDE.md`).
> Ele é a fonte da verdade sobre o andamento do projeto. Ao concluir uma etapa:
> 1. Crie `memoria/etapas/etapa-XX-<nome>.md` com o detalhe do que foi feito.
> 2. Atualize as seções **Estado atual**, **Próximo passo**, **Pendências**, **Decisões** e **Histórico** abaixo.
> 3. Marque os sprints concluídos no **Roadmap**.

---

## Resumo do projeto

SaaS para freelancers criarem propostas/orçamentos profissionais: clientes, serviços, construtor de orçamento com cálculo automático (subtotal, desconto, impostos, total), status (rascunho → enviado → visualizado → aprovado/recusado), link público para o cliente aprovar com aceite eletrônico, PDF, compartilhamento por WhatsApp e métricas de conversão.

- Requisitos: `docs/info.txt`
- Plano completo (22 sprints, modelagem, regras de negócio): `docs/InvoiceFlow_Plano_de_Desenvolvimento.txt`

## Forma de trabalho combinada com o usuário

- Idioma: **português**.
- Construir **em etapas pequenas**: fazer um pouco → reportar o que foi feito → seguir. Nunca tentar fazer tudo de uma vez.
- **Avisar o usuário sempre que houver algum problema** (erros, decisões que dependem dele, riscos).
- Ao fim de cada etapa, registrar tudo nesta pasta `memoria/`.

## Estado atual

- **Data da última atualização:** 2026-10-06
- **Local do projeto:** `C:\dev\invoiceflow` (movido para fora do OneDrive na etapa 2 — o caminho antigo em `OneDrive\Área de Trabalho\meus-projetos\invoiceflow` não deve mais ser usado)
- **Fase:** 2 — Autenticação & Clientes/Serviços (Sprint 3 em andamento)
- **Concluído:** Sprint 1 (inicialização), exceto criação do projeto Supabase, que depende do usuário. Sprint 2 completo: identidade visual, componentes shadcn, layout da área privada (sidebar inset + header + Sheet no mobile), `StatusBadge`, `EmptyState`, `PageHeader`, tipografia e motion. Sprint 3 **parte 1**: telas de login, cadastro, recuperação e nova senha (RHF + Zod), com autenticação **simulada** (`AUTH_DEMO_MODE`).
- **Build:** `npm run lint` ✅ · `npm run build` ✅ · `npm run dev` ✅. Rotas: `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/dashboard` (área privada) e `/design-system` (vitrine, só em dev).
- **Backend:** **Supabase** (Auth + PostgreSQL + RLS). O usuário cogitou Firebase, comparamos e ele decidiu manter o Supabase (2026-10-06). **Ele nunca usou Supabase**: explicar os passos com calma. Guia de criação em `docs/guia-supabase.md`.

## Próximo passo

**Etapa 06 — Sprint 3 (parte 2): conectar o Supabase Auth.** Depende do usuário seguir `docs/guia-supabase.md` e preencher o `.env.local`.
1. Conferir o `.env.local` **sem imprimir valores** (só presença e formato: URL `https://*.supabase.co`, chave começando com `sb_publishable_`).
2. **Ler antes** a documentação atual do `@supabase/ssr` para Next.js 16: o arquivo é `src/proxy.js` (função `proxy`) + helper `src/lib/supabase/proxy.js`, que renova a sessão com `supabase.auth.getClaims()`. Para autorização no servidor usar **`getClaims()`**, nunca `getSession()`.
3. Trocar o miolo de `src/lib/auth/client.js` pelo Supabase (manter a interface `signIn/signUp/signOut/requestPasswordReset/confirmPasswordReset` + `AuthError`), mapear os erros do Supabase (`invalid_credentials`, `user_already_exists`, `weak_password`, `over_email_send_rate_limit`, `same_password`…) para mensagens pt-BR e pôr `AUTH_DEMO_MODE = false`. Avaliar se login e cadastro ficam no cliente ou viram Server Actions.
4. Rota `src/app/auth/confirm/route.js` com `verifyOtp({ type, token_hash })`: sucesso → redireciona para `next` (**validar que é caminho relativo**, para não virar open redirect); falha → `/reset-password?erro=link-invalido` (ou `/login` com erro, se for confirmação de cadastro). Os templates de e-mail do guia já apontam para essa rota.
5. `/reset-password`: mostrar "link inválido" também quando não houver sessão. Após trocar a senha o usuário já está logado, então decidir entre ir para `/dashboard` ou deslogar e mandar para `/login`.
6. Cadastro: `signUp` com `options.data.full_name`. Se a confirmação de e-mail estiver ligada (`data.session === null`), mostrar o estado "Confirme seu e-mail" em vez de redirecionar. Hoje está **desligada** (ver pendências).
7. Migração SQL: tabela `profiles` (id → `auth.users`, full_name, email, avatar_url, phone, timestamps), **RLS ligado** (o próprio usuário lê e edita só a sua linha), trigger `on auth.users insert` criando o profile. Guardar o SQL versionado (ex.: `supabase/migrations/`) e orientar o usuário a rodá-lo no **SQL Editor** do painel (passo a passo, porque ele é iniciante).
8. Proteger `/dashboard`, `/clients`, `/services`, `/quotes` e `/settings` (sem sessão → `/login`); quem já está logado e abre `/login` ou `/signup` → `/dashboard`. Trocar o `PLACEHOLDER_USER` do `src/app/(dashboard)/layout.js` pelos dados reais.

Pendente também: a **landing page `/`** continua provisória (já tem título serif e botões de entrar/cadastrar). Refazer antes do deploy.

## Pendências com o usuário

- [ ] **Criar o projeto Supabase** seguindo `docs/guia-supabase.md` (passos 1–6: conta, organização, projeto em São Paulo, URL + publishable key, configuração de Auth e templates de e-mail em pt-BR) e preencher o `.env.local`. Necessário para a etapa 6. **Nunca pedir nem exibir os valores; a secret key não deve ser usada.**
- [ ] **Antes do deploy:** configurar SMTP próprio (ex.: Resend) e religar "Confirm email". O e-mail padrão do Supabase só entrega para membros da equipe e no máximo 2 por hora.
- [ ] **Antes do deploy:** evitar a pausa do plano Free (7 dias com pouca atividade), por exemplo com um ping agendado (GitHub Actions). Projeto pausado se reativa em **Resume project** (até 1 ano).
- [x] ~~Projeto dentro do OneDrive~~ → resolvido na etapa 2 (movido para `C:\dev\invoiceflow`).
- [ ] Criar repositório remoto no GitHub (opcional, quando o usuário quiser).
- [ ] (Opcional, requer admin) Adicionar `C:\dev` às exclusões do Windows Defender para acelerar `npm install`/build. Não foi feito — só sugerido.

## Decisões técnicas (importante lembrar)

- **Next.js 16.3.8** — tem mudanças em relação a versões antigas. Ler `node_modules/next/dist/docs/` antes de usar APIs (ver `AGENTS.md`).
  - `middleware.js` agora se chama **`proxy.js`** (fica em `src/proxy.js`, função exportada `proxy`).
  - `params`, `searchParams`, `cookies()` e `headers()` são **assíncronos** (usar `await`).
  - Turbopack é o bundler padrão em dev e build.
- **JavaScript puro**, sem TypeScript (`jsconfig.json` com alias `@/*` → `./src/*`).
- **shadcn/ui 4.x** com base **Radix** e preset **Nova** (ícones Lucide, fonte Geist). `components.json` com `tsx: false`.
  - O helper `cn()` vem do pacote `cn` (substituto de clsx + tailwind-merge, mantido pelo shadcn): `src/lib/utils.js`.
  - O pacote `shadcn` fica em `dependencies` porque o `globals.css` importa `shadcn/tailwind.css`.
- **Tailwind v4** — configuração via CSS (`@theme inline` no `globals.css`), sem `tailwind.config.js`.
- **Backend = Supabase (confirmado em 2026-10-06, depois de cogitar o Firebase).** Motivos: dados relacionais (dashboard, filtros e busca em SQL), regras de negócio atômicas no banco (aprovação, numeração, NUMERIC), integração SSR oficial com o Next.js (`@supabase/ssr`) e aderência ao plano e ao portfólio (PostgreSQL + RLS).
- **Autenticação no front (etapa 5):** formulários só usam `src/lib/auth/client.js` (`signIn`, `signUp`, `signOut`, `requestPasswordReset`, `confirmPasswordReset`, `AuthError`, `getAuthErrorMessage`). Schemas em `src/lib/validations/auth.js` (**Zod v4: usar `{ error: "..." }`**). Formulários com RHF + `zodResolver` + componentes `Field`/`FieldError` do shadcn, `mode: "onTouched"`.
- **Supabase:** `@supabase/ssr` com `getAll`/`setAll`. Variáveis: `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_...`). As chaves legadas `anon`/`service_role` serão desativadas até o fim de 2026: usar só as novas. A **secret key** (`sb_secret_...`) ignora o RLS: nunca no front e, de preferência, em nenhum lugar (para a página pública, usar função SQL `security definer` que expõe só os campos necessários).
  - `src/lib/supabase/client.js` → browser · `src/lib/supabase/server.js` → servidor (`import "server-only"`) · `src/lib/supabase/env.js` → leitura/validação das env vars.
  - O helper do proxy de sessão será `src/lib/supabase/proxy.js` (o plano original chamava de `middleware.js`).
- **Zod v4** + `@hookform/resolvers` v5 (compatível com Zod 4).
- **Identidade visual (etapa 3):** marca **índigo** (hue 268) em `--primary`. Tokens extras no `globals.css`: `--success`, `--warning` e `--status-{draft,sent,viewed,approved,declined,expired,cancelled}` (classes `text-status-sent`, `bg-status-sent/10`...). Padrão dos status: texto na cor + fundo tingido `/10` (claro) e `dark:/15` (escuro). Contrastes AA medidos em [etapa-03](etapas/etapa-03-design-tokens.md). Classes Tailwind de status devem ser escritas **por extenso** (sem interpolar `bg-status-${x}`), senão o Tailwind não as gera.
- **Tema claro/escuro:** `next-themes` com `defaultTheme="system"`. Providers globais (Theme, Tooltip, Toaster/sonner) ficam em `src/components/providers.jsx`; o `layout.js` raiz segue Server Component. Ao ler o tema no cliente, só usar depois de montar (`useSyncExternalStore`), para não divergir na hidratação.
- **Toasts:** `import { toast } from "sonner"` (Toaster com `richColors`, canto superior direito).
- **Lint do React 19** (`react-hooks/set-state-in-effect`): não chamar `setState` direto no corpo de `useEffect`. Preferir `useSyncExternalStore` para assinar APIs do navegador. O `src/hooks/use-mobile.js` do shadcn foi corrigido assim e precisa ser corrigido de novo se o shadcn o sobrescrever.
- **Vitrine `/design-system`:** só em dev (`notFound()` em produção). Usar para validar componentes novos do Design System.
- **Padrão visual (etapa 4) — o usuário exige acabamento caprichado, nada de shadcn cru:**
  - Fontes: **Instrument Serif** (`font-display`, só peso 400, sem bold) para títulos, números de destaque e estados vazios; **Inter** (`font-sans`) para a interface; **Geist Mono** (`font-mono`) para códigos.
  - Texto na cor da marca → `text-primary-ink` (não `text-primary`, que no escuro falha o contraste).
  - Sombras `shadow-xs..xl` vêm de `--elevation-*` (por tema). Motion: `animate-enter`, `animate-float`, `ease-out-expo`. Biblioteca `motion` v14 (`motion/react`) para `layoutId`/`AnimatePresence`.
  - Páginas privadas: usar `PageHeader` + seções como filhos diretos (o `template.js` faz o stagger de entrada). Listas vazias usam `EmptyState`. Status sempre via `StatusBadge` + `src/lib/constants/quote-status.js`.
  - Ação ainda não implementada → `ComingSoonButton` (toast), nunca um link para 404.
  - Formatação pt-BR (moeda, %, data) em `src/lib/format.js`.
  - Componente com troca animada (`AnimatePresence`) **não** deve ser filho direto de um `template.js` (o `*:animate-enter` se soma à animação do motion): envolver num `<div>`.
  - Atraso de animação isolado → `style={{ animationDelay }}` (classe `[animation-delay:...]` pode perder para o atalho `animation` do `animate-enter`).
  - shadcn CLI: para não sobrescrever arquivos customizados (ex.: `button.jsx`), rodar `printf 'n
' | npx shadcn add <comp>`. Depois converter CRLF → LF.
- **Rotas com route groups:** `(public)`, `(auth)`, `(dashboard)` conforme o plano. A home está em `src/app/(public)/page.js`.
- **Finais de linha:** `.gitattributes` força LF; `.vscode/settings.json` usa `files.eol: "\n"`.
- **VS Code do projeto** (`.vscode/settings.json`): `*.css` associado a `tailwindcss` (evita falsos avisos de `@theme`/`@apply`), autocomplete de classes em `cn()`/`cva()`, `.next` fora da busca/watcher. Extensões recomendadas: Tailwind CSS IntelliSense, ESLint, Prettier (o usuário já tem as três).
- `package.json` declara `engines.node >= 20.9.0` (mínimo do Next 16).
- Os documentos originais do usuário foram movidos para `docs/`.

## Problemas conhecidos / avisos

- `npm audit` acusa 5 vulnerabilidades "high" no pacote `braces` (via `fast-glob`/`micromatch`), usado apenas por ferramentas de dev (eslint-plugin-next e CLI do shadcn). Não vai para o bundle do navegador. Não rodar `npm audit fix --force` (quebraria versões).
- Testes no Chrome: se `document.visibilityState === "hidden"` (janela em segundo plano), o clique não move o foco, o teclado não chega, os menus Radix não abrem e as animações só avançam com screenshot. Saídas: setter nativo + evento `input` para preencher campos, `PointerEvent('pointerdown')` para abrir menus Radix e `element.click()` nos itens.
- Testes no Chrome (Claude in Chrome): o monitor do usuário é ultrawide (viewport ~3018 px CSS) e o screenshot vem reduzido, então **clicar por coordenada erra o alvo**. Usar refs do `find` ou `javascript_tool`. O `resize_window` não muda a viewport: para testar mobile, usar iframes de 390 px (e recarregar a aba depois, porque mexer no `<body>` quebra o React da página).
- No Windows, ao parar o `npm run dev` em background, o processo `node` filho pode continuar escutando a porta 3000. Verificar com `Get-NetTCPConnection -LocalPort 3000 -State Listen`, conferir pela linha de comando (`Get-CimInstance Win32_Process`) que é o `next ... start-server.js` do invoiceflow e só então encerrar o PID.

## Histórico de etapas

| # | Data       | Etapa                                   | Detalhes |
|---|------------|-----------------------------------------|----------|
| 1 | 2026-10-06 | Sprint 1 — Inicialização do projeto     | [etapa-01-setup.md](etapas/etapa-01-setup.md) |
| 2 | 2026-10-06 | Mudança para fora do OneDrive + ajustes de ambiente | [etapa-02-mudanca-de-pasta.md](etapas/etapa-02-mudanca-de-pasta.md) |
| 3 | 2026-10-06 | Sprint 2 (parte 1) — identidade visual, componentes shadcn, providers, vitrine | [etapa-03-design-tokens.md](etapas/etapa-03-design-tokens.md) |
| 4 | 2026-10-06 | Sprint 2 (parte 2) — layout da área privada, StatusBadge, EmptyState, tipografia e motion | [etapa-04-layout-e-polimento-visual.md](etapas/etapa-04-layout-e-polimento-visual.md) |
| 5 | 2026-10-06 | Sprint 3 (parte 1) — telas de autenticação (modo demonstração) + guia do Supabase | [etapa-05-telas-de-autenticacao.md](etapas/etapa-05-telas-de-autenticacao.md) |

## Roadmap (do plano de desenvolvimento)

**Fase 1 — Setup & Design System**
- [x] Sprint 1 — Inicialização (falta só o projeto Supabase do usuário)
- [x] Sprint 2 — Design System + layout (sidebar/header/sheet mobile), StatusBadge, EmptyState, tipografia e motion

**Fase 2 — Autenticação & Clientes/Serviços**
- [ ] Sprint 3 — Autenticação (signup, login, logout, recuperação, proxy, profiles) — **parte 1 ✅** (telas + validação, auth simulada); falta a parte 2 (Supabase)
- [ ] Sprint 4 — Clientes (CRUD, RHF + Zod)
- [ ] Sprint 5 — Serviços (CRUD)

**Fase 3 — Quote Builder**
- [ ] Sprint 6 — Estrutura do construtor
- [ ] Sprint 7 — React Hook Form + Zod (useFieldArray)
- [ ] Sprint 8 — Motor de cálculos (função pura + testes)
- [ ] Sprint 9 — Zustand (estado de UI)
- [ ] Sprint 10 — Persistência (draft, quote_number, public_id, snapshot)

**Fase 4 — Visualização, Exportação & Assinatura**
- [ ] Sprint 11 — QuotePreview
- [ ] Sprint 12 — Máquina de estados
- [ ] Sprint 13 — Imutabilidade
- [ ] Sprint 14 — Página pública
- [ ] Sprint 15 — Aprovação/aceite
- [ ] Sprint 16 — PDF
- [ ] Sprint 17 — Compartilhamento (link + WhatsApp)

**Fase 5 — Dashboard, Métricas & Polimento**
- [ ] Sprint 18 — Dashboard
- [ ] Sprint 19 — Lista de orçamentos (busca, filtros)
- [ ] Sprint 20 — Responsividade
- [ ] Sprint 21 — Estados de UX
- [ ] Sprint 22 — Qualidade (a11y, testes, CI/CD, deploy, README final)
