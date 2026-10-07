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

- **Data da última atualização:** 2026-10-07
- **Local do projeto:** `C:\dev\invoiceflow` (movido para fora do OneDrive na etapa 2 — o caminho antigo em `OneDrive\Área de Trabalho\meus-projetos\invoiceflow` não deve mais ser usado)
- **Fase:** 3 — Quote Builder. **Sprint 6 em andamento:** partes 1 (estrutura de `/quotes/new`) e 2 (seletor de cliente + cadastro rápido) ✅ e commitadas ([etapa-09](etapas/etapa-09-construtor-estrutura-e-cliente.md)); próxima: parte 3 (itens). Fase 2 ✅ completa (Sprints 3, 4 e 5).
- **Concluído:** Sprint 1 (inicialização). Sprint 2 completo: identidade visual, componentes shadcn, layout da área privada (sidebar inset + header + Sheet no mobile), `StatusBadge`, `EmptyState`, `PageHeader`, tipografia e motion. Sprint 3 completo: telas de auth (RHF + Zod) + **Supabase Auth real** (proxy protegendo rotas, `/auth/confirm`, tabela `profiles` com RLS, testado de ponta a ponta). Sprint 4 completo: **CRUD de clientes** (tabela `clients` + RLS, camada de dados server-only, Server Actions, busca, máscaras e validação de CPF/CNPJ, tabela/cartões, detalhes, edição e exclusão). Sprint 5 completo: **CRUD de serviços** (tabela `services` com `price_cents`, dinheiro em centavos em `money.js`, campo de preço com máscara testada, prévia do item, peças de formulário compartilhadas) — ver [etapa-08](etapas/etapa-08-servicos.md).
- **Build:** `npm run lint` ✅ · `npm run build` ✅ · `npm test` ✅ (Vitest, 270 testes) · `npm run dev` ✅. Rotas: `/login`, `/signup`, `/forgot-password`, `/reset-password`, área privada (`/dashboard`, `/clients/**`, `/services/**`, `/quotes/new` em construção; `/quotes` e `/settings` ainda vazias) e `/design-system` (vitrine, só em dev).
- **Conta do usuário no banco:** existe uma conta criada por ele no app (1 usuário, 1 perfil, 1 cliente), e o Chrome dele fica logado nela em `localhost:3000`. Em 2026-10-07 ele disse que é **conta de teste dele e pode ser usada ou apagada**. Mesmo assim, preferir testar com contas descartáveis em `e2e.localhost` (ver "Testes no Chrome" em Problemas conhecidos) e apagar só a conta de teste, pelo e-mail.
- **Backend:** **Supabase** (Auth + PostgreSQL + RLS). Projeto `invoiceflow`, ref **`btglemtjexvwperrbfud`**, região `sa-east-1`, Postgres 17, plano Free. Pasta ligada (`supabase link`) e `.env.local` preenchido. O usuário **nunca tinha usado Supabase**: explicar com calma. CLI autenticado na máquina dele (`npx supabase login`).
- **CLI do Supabase:** usar **`node node_modules/supabase/dist/supabase.js <cmd>`** (o `npx supabase` trava de forma intermitente). Comandos úteis em `memoria/etapas/etapa-06-supabase-auth.md`.

## Próximo passo

**Sprint 6 — construtor de orçamentos (`/quotes/new`), parte 3: itens.** As partes 1 (estrutura) e 2 (seletor de cliente + `ClientDialog`) estão prontas e commitadas: ver [etapa-09](etapas/etapa-09-construtor-estrutura-e-cliente.md).

Como retomar (ao abrir a sessão, ler a etapa 09 e `src/components/quotes/`):
1. **Parte 3 — itens** (`quote-items.jsx`, hoje só o estado vazio): adicionar do catálogo (Popover + Command como no `client-selector.jsx`, com os serviços carregados no servidor numa consulta enxuta, tipo `listServiceOptions`) e item avulso; cada linha (`QuoteItemRow`) com nome, descrição, quantidade, unidade e preço (`CurrencyField`), remover e reordenar; `useFieldArray`; `ServiceDialog` para cadastro rápido de serviço (mesmo padrão do `ClientDialog`, com `stopPropagation` no submit).
2. **Parte 4 — desconto e impostos** (`quote-adjustments.jsx`): desconto percentual **ou** valor fixo, imposto percentual; precisa de um campo de percentual (máscara + testes, como o de moeda).
3. Depois: Sprint 7 (schema Zod do orçamento, cliente obrigatório, ≥ 1 item, quantidade > 0, validade ≥ hoje), Sprint 8 (`calculateQuoteTotals` puro, em centavos, com testes) ligando o resumo, Sprint 9 (Zustand), Sprint 10 (migração + salvar rascunho).

Decisões já tomadas para essas partes:
- **Dinheiro em centavos** em tudo (`money.js`); quantidade com unidade: `formatServiceUnit(unit, qtd)` ("1,5 hora").
- **Snapshot:** o item copia nome, descrição, unidade e preço do serviço; o preço pode ser ajustado no orçamento.
- **Sprint 10 (migração `quotes`/`quote_items`):** `quotes.client_id` → **ON DELETE RESTRICT** (a camada de clientes já traduz o erro 23503); `quote_items.service_id` → **ON DELETE SET NULL**; valores em centavos `bigint`; limites de `QUOTE_LIMITS`.
- Impostos: regra simples/configurável (plano, regra 4); a base de cálculo (subtotal com ou sem desconto) se decide no Sprint 8.
- Ideia para o Sprint 20: no celular, barra fixa no rodapé com o total e "Salvar".

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
  - **CRUD padrão (etapa 7):** migração com RLS + grants → `src/lib/br.js`/utilitários → schema Zod que normaliza para o banco (textos via `src/lib/validations/text.js`, **limites contados como o Postgres**; teste que confere os limites lendo a migração) → camada de dados `src/lib/data/<recurso>.js` (`server-only`, peças de `data/shared.js`: `DataError`, `databaseError`, `getDataContext`, `isUuid`, `sanitizeSearch`; filtro por `user_id`, `cache` no get) → actions `src/actions/<recurso>.js` ("use server", `parseInput(schema, values)` + `toFailure(scope, error)` de `src/lib/action-result.js`, devolve `{ ok, id }` ou `{ ok:false, message, fieldErrors }`). Testes de módulos `server-only` usam `vi.mock("server-only", () => ({}))` → páginas (lista em `(list)/` com `loading.js`, new, [id], [id]/edit, not-found) → componentes em `src/components/<recurso>/`.
  - **Máscara em input com RHF:** `event.target.value = mask(...)` antes de `registration.onChange(event)`. **Nunca** `setValue` dentro do onChange, porque o RHF pula a revalidação.
  - **Formulários (etapa 8):** usar as peças de `src/components/shared/form-fields.jsx` (`FormSection`, `TextField`, `TextareaField` com `maxLength` → contador, `SelectField`, `CurrencyField`), `SearchInput` nas listas e `ConfirmDeleteDialog` (invólucros `Delete<Recurso>Dialog` com textos, action e toast). Valores do banco → formulário com `to<Recurso>FormValues` no arquivo de validação.
  - **Campo de valor em reais:** `CurrencyField`/`CurrencyInput`. Regras em `src/lib/currency-input.js` (funções puras testadas); o componente só aplica o resultado no `<input>`.
  - **Datas de calendário (etapa 9):** texto "AAAA-MM-DD" e `src/lib/dates.js`. "Hoje" vem do servidor (`todayIso()`) por prop. Nunca `new Date("AAAA-MM-DD")` formatado no fuso de SP (mostra o dia anterior).
  - **Formulário dentro de diálogo/portal:** `onSubmit={(e) => { e.stopPropagation(); return handleSubmit(fn)(e) }}`, senão o submit sobe (pela árvore React) até o formulário de fora. Botões dentro de form sempre com `type="button"` (o `ComingSoonButton` já tem por padrão).
  - **Listas para seletores:** consulta enxuta só com o que a interface mostra (`listClientOptions`), nunca a linha inteira. Busca local com `matchesSearch` (`src/lib/search.js`); no cmdk, `value` = id e o texto em `keywords`.
  - **Seletor com lista (Popover + Command):** padrão em `client-selector.jsx`, incluindo o cuidado com o foco (voltar ao botão visível; não devolver o foco quando a lista fecha para abrir um diálogo).
  - Tabela no desktop (`hidden md:block`) + cartões no mobile (`md:hidden`); link "esticado" (`after:absolute after:inset-0`) com as ações em `relative z-10`.
  - Formatação pt-BR de % e datas em `src/lib/format.js`; **moeda em `src/lib/money.js`** (recebe centavos).
  - Componente com troca animada (`AnimatePresence`) **não** deve ser filho direto de um `template.js` (o `*:animate-enter` se soma à animação do motion): envolver num `<div>`.
  - Atraso de animação isolado → `style={{ animationDelay }}` (classe `[animation-delay:...]` pode perder para o atalho `animation` do `animate-enter`).
  - shadcn CLI: para não sobrescrever arquivos customizados (ex.: `button.jsx`), rodar `printf 'n
' | npx shadcn add <comp>`. Depois converter CRLF → LF.
- **Rotas com route groups:** `(public)`, `(auth)`, `(dashboard)` conforme o plano. A home está em `src/app/(public)/page.js`.
- **Finais de linha:** `.gitattributes` força LF; `.vscode/settings.json` usa `files.eol: "\n"`.
- **VS Code do projeto** (`.vscode/settings.json`): `*.css` associado a `tailwindcss` (evita falsos avisos de `@theme`/`@apply`), autocomplete de classes em `cn()`/`cva()`, `.next` fora da busca/watcher. Extensões recomendadas: Tailwind CSS IntelliSense, ESLint, Prettier (o usuário já tem as três).
- `package.json` declara `engines.node >= 22.12.0` (supabase-js 2.117 exige Node 22; Vitest 5/Vite 8 exigem 22.12; a máquina do usuário tem 22.14).
- **Dinheiro = centavos inteiros em todo o app** (banco `bigint`, cálculos, props). Toda conversão texto ↔ centavos passa por `src/lib/money.js`; nunca dividir por 100 para exibir (o `formatCurrency` monta o decimal como texto e o Intl formata exato).
- **Testes:** Vitest 5 (`npm test` = `vitest run`, `npm run test:watch`), `vitest.config.mjs` com alias `@`, ambiente `node`, arquivos `src/**/*.test.js` ao lado do código. Sem jsdom/Testing Library por enquanto (instalar quando houver teste de componente).
- Os documentos originais do usuário foram movidos para `docs/`.

## Problemas conhecidos / avisos

- `npm audit` acusa 9 vulnerabilidades "high" (eram 5 até 2026-10-06; o audit passou a contar também os pacotes intermediários da mesma cadeia, e nenhuma vem do Vitest/Vite), todas por causa do pacote `braces` (via `fast-glob`/`micromatch`), usado apenas por ferramentas de dev (eslint-plugin-next e CLI do shadcn). Não vai para o bundle do navegador. Não rodar `npm audit fix --force` (quebraria versões).
- Testes no Chrome com aba oculta: páginas com `loading.js` (streaming) não revelam nem hidratam o conteúdo (ele fica em `div[hidden]` esperando `requestAnimationFrame`), e capturas de tela expiram. Testar interações em páginas sem streaming; disparar `focusout` (não `blur`) para validação no blur do RHF.
- Testes no Chrome: se `document.visibilityState === "hidden"` (janela em segundo plano), o clique não move o foco, o teclado não chega, os menus Radix não abrem e as animações só avançam com screenshot. Saídas: setter nativo + evento `input` para preencher campos, `PointerEvent('pointerdown')` para abrir menus Radix e `element.click()` nos itens.
- Testes no Chrome (Claude in Chrome): o monitor do usuário é ultrawide (viewport ~3018 px CSS) e o screenshot vem reduzido, então **clicar por coordenada erra o alvo**. Usar refs do `find` ou `javascript_tool`. O `resize_window` não muda a viewport: para testar mobile, usar iframes de 390 px (e recarregar a aba depois, porque mexer no `<body>` quebra o React da página).
- **Testes no Chrome com a conta real do usuário logada (desde 2026-10-07):** testar em **`http://e2e.localhost:3000`** (o dev server aceita subdomínios de localhost sem configurar `allowedDevOrigins`, e os cookies ficam separados da sessão dele em `localhost`). Conta de teste `e2e-<aleatório>@example.com`; na limpeza, apagar **só ela, pelo e-mail** (`delete from auth.users where email = '...'`, com cascade).
- **Sessão de usuário apagado continua valendo até o token expirar (até ~1 h):** o `getClaims()` (proxy e `getCurrentUser`) valida o JWT localmente, sem consultar o Auth. Visto em 2026-10-07: a conta de teste apagada ainda aparecia logada em `e2e.localhost`. Sem risco aos dados (cascade apagou tudo, e inserções falham pela FK em `profiles`), mas **nos testes: sair da conta (menu → Sair) ANTES de apagá-la no banco**. Se um dia for preciso derrubar sessões na hora (usuário banido/excluído), usar `getUser()` nas rotas sensíveis.
- **Testes no Chrome com aba oculta + Radix:** as animações de saída não rodam, então Popover/Dialog fechados **continuam no DOM** (e o `FocusScope` do diálogo segue prendendo o foco, o que invalida testes de foco). Para testar foco: injetar `*{animation:none!important;transition:none!important}` (o Radix desmonta na hora). O conteúdo do Popover também tem `role="dialog"`: para achar o diálogo, usar `[data-slot=dialog-content]`. Páginas com `loading.js` só hidratam depois de um quadro: uma tentativa de captura de tela (mesmo que expire) costuma destravar. Na 1ª navegação logo após subir o servidor, o Chrome pode cair numa página interna: navegar de novo.
- Testes no Chrome com aba oculta: `setTimeout` é estrangulado (≥ 1 s por espera) e scripts longos estouram os 45 s da ferramenta. Esperar com `MessageChannel` e só digitar depois da hidratação (o input ter `__reactProps…`), senão o RHF regrava o valor padrão. Teclas simuladas: setter nativo + `InputEvent("input", { inputType, data })`; blur com `focusout`; menus Radix com `PointerEvent("pointerdown")` e, no item, `pointerup` + `click()`. Capturas de tela às vezes expiram, mas costumam funcionar logo depois de uma navegação.
- Ferramenta Bash: um `python - <<'EOF'` com texto longo (aspas triplas, crases) travou sem rodar o Python (2026-10-07). Para editar textos longos, usar as ferramentas Edit/Write. Se usar Python, gravar com `write_bytes` (o `write_text` no Windows grava CRLF).
- **Detectar CRLF:** `tr -cd '\r' < arquivo | wc -c`. No Git Bash, `grep $'\r'` casa todas as linhas (falso positivo).
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
| 8 | 2026-10-07 | Sprint 5 — Serviços: CRUD, dinheiro em centavos, campo de preço testado, Vitest, peças de formulário compartilhadas | [etapa-08-servicos.md](etapas/etapa-08-servicos.md) |
| 9 | 2026-10-07 | Sprint 6 (partes 1 e 2) — estrutura do construtor de orçamentos, datas, seletor de cliente com busca e cadastro rápido | [etapa-09-construtor-estrutura-e-cliente.md](etapas/etapa-09-construtor-estrutura-e-cliente.md) |

## Roadmap (do plano de desenvolvimento)

**Fase 1 — Setup & Design System**
- [x] Sprint 1 — Inicialização
- [x] Sprint 2 — Design System + layout (sidebar/header/sheet mobile), StatusBadge, EmptyState, tipografia e motion

**Fase 2 — Autenticação & Clientes/Serviços**
- [x] Sprint 3 — Autenticação (signup, login, logout, recuperação, proxy, profiles)
- [x] Sprint 4 — Clientes (CRUD, RHF + Zod)
- [x] Sprint 5 — Serviços (CRUD, preço em centavos)

**Fase 3 — Quote Builder**
- [ ] Sprint 6 — Estrutura do construtor (em andamento: estrutura e seletor de cliente prontos; faltam itens e desconto/impostos)
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
