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
- **Fase:** 2 — Autenticação & Clientes/Serviços (Sprints 3 e 4 ✅, próximo: Sprint 5 Serviços)
- **Concluído:** Sprint 1 (inicialização). Sprint 2 completo: identidade visual, componentes shadcn, layout da área privada (sidebar inset + header + Sheet no mobile), `StatusBadge`, `EmptyState`, `PageHeader`, tipografia e motion. Sprint 3 completo: telas de auth (RHF + Zod) + **Supabase Auth real** (proxy protegendo rotas, `/auth/confirm`, tabela `profiles` com RLS, testado de ponta a ponta). Sprint 4 completo: **CRUD de clientes** (tabela `clients` + RLS, camada de dados server-only, Server Actions, busca, máscaras e validação de CPF/CNPJ, tabela/cartões, detalhes, edição e exclusão).
- **Build:** `npm run lint` ✅ · `npm run build` ✅ · `npm run dev` ✅. Rotas: `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/dashboard` (área privada) e `/design-system` (vitrine, só em dev).
- **Backend:** **Supabase** (Auth + PostgreSQL + RLS). Projeto `invoiceflow`, ref **`btglemtjexvwperrbfud`**, região `sa-east-1`, Postgres 17, plano Free. Pasta ligada (`supabase link`) e `.env.local` preenchido. O usuário **nunca tinha usado Supabase**: explicar com calma. CLI autenticado na máquina dele (`npx supabase login`).
- **CLI do Supabase:** usar **`node node_modules/supabase/dist/supabase.js <cmd>`** (o `npx supabase` trava de forma intermitente). Comandos úteis em `memoria/etapas/etapa-06-supabase-auth.md`.

## Próximo passo

**Sprint 5 — Serviços** (Fase 2). Plano: ServiceTable, ServiceForm, ServiceDialog, DeleteServiceDialog, ServiceSearch; campos nome, descrição, unidade e preço. **Seguir exatamente o padrão do Sprint 4** (`memoria/etapas/etapa-07-clientes.md`):
1. Migração `services` via `migration new`:
   - `user_id` default `auth.uid()` → `profiles`;
   - `name` (2–120), `description` (≤ 1000), `unit` (lista fechada, ex.: hora, dia, projeto, unidade, mês, página, palavra, com CHECK);
   - **`price_cents bigint not null check (price_cents >= 0)`**: dinheiro em centavos inteiros, decisão alinhada ao Sprint 8; o plano fala em NUMERIC, mas centavos evitam erro de ponto flutuante no JS e mantêm exatidão;
   - `set_updated_at`, RLS das 4 operações, `revoke all` + grants, `db advisors`, teste de RLS por papéis.
2. Utilitário de dinheiro: `parseCurrencyInput("1.234,56") → 123456` e `formatCurrency` a partir de centavos, com testes. Campo de preço com máscara de moeda (aplicada no evento, ver o bug do RHF na etapa 7).
3. Schema Zod `src/lib/validations/service.js`, camada de dados `src/lib/data/services.js`, actions `src/actions/services.js`.
4. UI: `/services` (lista com busca, tabela/cartões, preço formatado + unidade), `/services/new`, `/services/[id]/edit`. Detalhes provavelmente desnecessários (serviço é simples), então editar direto pela lista.
5. Exclusão: serviço pode ser excluído sempre, porque os itens do orçamento guardam **snapshot** (nome, descrição, preço) e `service_id` vira `ON DELETE SET NULL` no Sprint 10.

Pendente também: a **landing page `/`** continua provisória. Refazer antes do deploy.

## Pendências com o usuário

- [x] ~~Criar o projeto Supabase~~ → feito (projeto criado pelo usuário, configurado por mim via CLI na etapa 6). Guia de referência: `docs/guia-supabase.md` (passos 1–6: conta, organização, projeto em São Paulo, URL + publishable key, configuração de Auth e templates de e-mail em pt-BR) e preencher o `.env.local`. Necessário para a etapa 6. **Nunca pedir nem exibir os valores; a secret key não deve ser usada.**
- [ ] **Testar a recuperação de senha com e-mail real** (só o usuário pode): cadastrar no app com o e-mail da conta Supabase, pedir o link e abri-lo **no mesmo navegador**. Passo a passo no fim de `docs/guia-supabase.md`.
- [ ] **Antes do deploy:** configurar SMTP próprio (ex.: Resend), religar "Confirm email" e reativar os templates pt-BR (`[auth.email.template.*]` no `config.toml`, arquivos em `supabase/templates/`). No Free sem SMTP: só entrega para a equipe, máximo 2 por hora, e **templates personalizados são bloqueados**.
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
- **Auth no servidor (etapa 6):** `src/proxy.js` (Next 16) → `updateSession` em `src/lib/supabase/proxy.js` com `getClaims()`. Páginas e actions privadas devem chamar `requireUser()` / `getCurrentUser()` de `src/lib/auth/server.js` (segunda barreira). Rotas protegidas e anti open redirect em `src/lib/auth/redirect.js`. Links de e-mail → `/auth/confirm` (aceita `code` PKCE e `token_hash`).
- **Banco (regras para toda migração):** criar com `supabase migration new` (nunca inventar o nome); RLS ligado; políticas `to authenticated` + `(select auth.uid())`; `using` + `with check` em update; **`revoke all from anon, authenticated` + grants mínimos explícitos**; funções de gatilho com `search_path=''` e `revoke execute`; depois `db advisors` + teste de RLS simulando papéis.
- **`config push`:** sempre ver a diferença antes (`printf 'n
' | ...`). O `config.toml` foi alinhado ao remoto em OTP (8), MFA/TOTP (ligado) e storage analytics (ligado).
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
  - **CRUD padrão (etapa 7):** migração com RLS + grants → `src/lib/br.js`/utilitários → schema Zod que normaliza para o banco → camada de dados `src/lib/data/<recurso>.js` (`server-only`, `DataError`, filtro por `user_id`, UUID validado, `cache` no get) → actions `src/actions/<recurso>.js` ("use server", revalida com o schema, devolve `{ ok, id }` ou `{ ok:false, message, fieldErrors }`) → páginas (lista em `(list)/` com `loading.js`, new, [id], [id]/edit, not-found) → componentes em `src/components/<recurso>/`.
  - **Máscara em input com RHF:** `event.target.value = mask(...)` antes de `registration.onChange(event)`. **Nunca** `setValue` dentro do onChange, porque o RHF pula a revalidação.
  - Tabela no desktop (`hidden md:block`) + cartões no mobile (`md:hidden`); link "esticado" (`after:absolute after:inset-0`) com as ações em `relative z-10`.
  - Formatação pt-BR (moeda, %, data) em `src/lib/format.js`.
  - Componente com troca animada (`AnimatePresence`) **não** deve ser filho direto de um `template.js` (o `*:animate-enter` se soma à animação do motion): envolver num `<div>`.
  - Atraso de animação isolado → `style={{ animationDelay }}` (classe `[animation-delay:...]` pode perder para o atalho `animation` do `animate-enter`).
  - shadcn CLI: para não sobrescrever arquivos customizados (ex.: `button.jsx`), rodar `printf 'n
' | npx shadcn add <comp>`. Depois converter CRLF → LF.
- **Rotas com route groups:** `(public)`, `(auth)`, `(dashboard)` conforme o plano. A home está em `src/app/(public)/page.js`.
- **Finais de linha:** `.gitattributes` força LF; `.vscode/settings.json` usa `files.eol: "\n"`.
- **VS Code do projeto** (`.vscode/settings.json`): `*.css` associado a `tailwindcss` (evita falsos avisos de `@theme`/`@apply`), autocomplete de classes em `cn()`/`cva()`, `.next` fora da busca/watcher. Extensões recomendadas: Tailwind CSS IntelliSense, ESLint, Prettier (o usuário já tem as três).
- `package.json` declara `engines.node >= 22.0.0` (o supabase-js 2.117 exige Node 22; o Next 16 sozinho aceitaria 20.9).
- Os documentos originais do usuário foram movidos para `docs/`.

## Problemas conhecidos / avisos

- `npm audit` acusa 5 vulnerabilidades "high" no pacote `braces` (via `fast-glob`/`micromatch`), usado apenas por ferramentas de dev (eslint-plugin-next e CLI do shadcn). Não vai para o bundle do navegador. Não rodar `npm audit fix --force` (quebraria versões).
- Testes no Chrome com aba oculta: páginas com `loading.js` (streaming) não revelam nem hidratam o conteúdo (ele fica em `div[hidden]` esperando `requestAnimationFrame`), e capturas de tela expiram. Testar interações em páginas sem streaming; disparar `focusout` (não `blur`) para validação no blur do RHF.
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
| 6 | 2026-10-06 | Sprint 3 (parte 2) — Supabase Auth real: proxy, /auth/confirm, profiles + RLS | [etapa-06-supabase-auth.md](etapas/etapa-06-supabase-auth.md) |
| 7 | 2026-10-06 | Sprint 4 — Clientes: CRUD completo com RLS, busca, máscaras e CPF/CNPJ | [etapa-07-clientes.md](etapas/etapa-07-clientes.md) |

## Roadmap (do plano de desenvolvimento)

**Fase 1 — Setup & Design System**
- [x] Sprint 1 — Inicialização
- [x] Sprint 2 — Design System + layout (sidebar/header/sheet mobile), StatusBadge, EmptyState, tipografia e motion

**Fase 2 — Autenticação & Clientes/Serviços**
- [x] Sprint 3 — Autenticação (signup, login, logout, recuperação, proxy, profiles)
- [x] Sprint 4 — Clientes (CRUD, RHF + Zod)
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
