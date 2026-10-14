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
- **Supabase: autorização permanente (2026-10-13).** O usuário disse: "não precisa me pedir autorização com algo relacionado ao supabase, pode fazer o que for preciso". Migrações (`db push`), consultas, testes no banco e configurações do projeto Supabase podem ser feitos sem perguntar — continuar testando antes (transação desfeita), conferindo o `--dry-run` e relatando o que foi feito. Se o verificador de permissões barrar, citar essa autorização.
- **Commits:** ao fim de cada etapa o usuário tem autorizado o commit; em 2026-10-13 ele pediu para commitar e seguir direto para a próxima etapa.
- Ao fim de cada etapa, registrar tudo nesta pasta `memoria/`.

## Estado atual

- **Data da última atualização:** 2026-10-14
- **Local do projeto:** `C:\dev\invoiceflow` (movido para fora do OneDrive na etapa 2 — o caminho antigo em `OneDrive\Área de Trabalho\meus-projetos\invoiceflow` não deve mais ser usado)
- **Fase:** 4 — Visualização, Exportação & Assinatura (faltam os Sprints 16 e 17). **Sprint 6 ✅** (etapas [09](etapas/etapa-09-construtor-estrutura-e-cliente.md), [10](etapas/etapa-10-construtor-itens.md), [11](etapas/etapa-11-desconto-e-impostos.md), commitadas), **Sprint 7 ✅** — schema Zod ([etapa-12](etapas/etapa-12-schema-do-orcamento.md), commitada), **Sprint 8 ✅** — motor de cálculos ([etapa-13](etapas/etapa-13-motor-de-calculos.md), commitada), **Sprint 9 ✅** — rascunho local com Zustand ([etapa-14](etapas/etapa-14-rascunho-local-zustand.md), commitada). **Sprint 10 ✅** — persistência: tabelas no banco ([etapa-15](etapas/etapa-15-orcamentos-no-banco.md)), salvar rascunho + lista mínima ([etapa-16](etapas/etapa-16-salvar-rascunho.md)) e **editar enquanto rascunho** ([etapa-17](etapas/etapa-17-editar-rascunho.md)). **Fase 3 completa.** Etapas 15, 16 e 17 commitadas. **Fase 4:** **Sprint 11 ✅** — QuotePreview, página `/quotes/[id]` e pré-visualização no construtor ([etapa-18](etapas/etapa-18-quote-preview.md)); **Sprint 12 ✅** — máquina de estados: enviar, cancelar, expirar (pg_cron), histórico `quote_events`, exclusão só de rascunhos ([etapa-19](etapas/etapa-19-maquina-de-estados.md)); **Sprint 13 ✅** — "Duplicar como novo rascunho" ([etapa-20](etapas/etapa-20-duplicar-orcamento.md)). **Sprint 14 ✅** — página pública `/quote/[publicId]` ([etapa-21](etapas/etapa-21-pagina-publica.md)). **Sprint 15 ✅** — aprovar (aceite eletrônico) / recusar pela página pública, confirmações, aceite no documento e para o dono ([etapa-22](etapas/etapa-22-aprovacao-e-aceite.md)); página pública conferida no celular. **Sprint 16 (em andamento):** parte 1 — versão para impressão / "Salvar como PDF" ([etapa-23](etapas/etapa-23-impressao.md)). Etapas commitadas até a 22. Próxima: **etapa 24 — PDF gerado no servidor**. Fase 2 ✅ completa (Sprints 3, 4 e 5).
- **Supabase:** o projeto foi pausado por inatividade em 2026-10-12 e o usuário o reativou no mesmo dia (dados intactos). Pode acontecer de novo após ~7 dias sem uso: se o CLI der "Failed to create login role … timeout", conferir `projects list` e pedir ao usuário para reativar (não reativar por conta própria).
- **Concluído:** Sprint 1 (inicialização). Sprint 2 completo: identidade visual, componentes shadcn, layout da área privada (sidebar inset + header + Sheet no mobile), `StatusBadge`, `EmptyState`, `PageHeader`, tipografia e motion. Sprint 3 completo: telas de auth (RHF + Zod) + **Supabase Auth real** (proxy protegendo rotas, `/auth/confirm`, tabela `profiles` com RLS, testado de ponta a ponta). Sprint 4 completo: **CRUD de clientes** (tabela `clients` + RLS, camada de dados server-only, Server Actions, busca, máscaras e validação de CPF/CNPJ, tabela/cartões, detalhes, edição e exclusão). Sprint 5 completo: **CRUD de serviços** (tabela `services` com `price_cents`, dinheiro em centavos em `money.js`, campo de preço com máscara testada, prévia do item, peças de formulário compartilhadas) — ver [etapa-08](etapas/etapa-08-servicos.md).
- **Build:** `npm run lint` ✅ · `npm run build` ✅ · `npm test` ✅ (Vitest, 611 testes) · `npm run dev` ✅. Rotas: `/login`, `/signup`, `/forgot-password`, `/reset-password`, área privada (`/dashboard`, `/clients/**`, `/services/**`, `/quotes/new` salvando rascunhos, `/quotes/[id]` com o documento e a resposta do cliente, `/quotes/[id]/edit` editando rascunhos, `/quotes` com lista mínima; `/settings` ainda vazia), `/quote/[publicId]` (+ `/approved` e `/declined`, públicas) e `/design-system` (vitrine, só em dev).
- **Conta do usuário no banco:** existe uma conta criada por ele no app (1 usuário, 1 perfil, 1 cliente), e o Chrome dele fica logado nela em `localhost:3000`. Em 2026-10-07 ele disse que é **conta de teste dele e pode ser usada ou apagada**. **Desde 2026-10-12 não crio contas de teste pelo navegador** (o cadastro vai para o Supabase Auth, serviço externo): testes com login usam essa sessão já aberta (e o que eu criar nela, eu apago depois, só pelos ids que criei) ou o modo demonstração (ver Problemas conhecidos).
- **Backend:** **Supabase** (Auth + PostgreSQL + RLS). Projeto `invoiceflow`, ref **`btglemtjexvwperrbfud`**, região `sa-east-1`, Postgres 17, plano Free. Pasta ligada (`supabase link`) e `.env.local` preenchido. O usuário **nunca tinha usado Supabase**: explicar com calma. CLI autenticado na máquina dele (`npx supabase login`).
- **CLI do Supabase:** usar **`node node_modules/supabase/dist/supabase.js <cmd>`** (o `npx supabase` trava de forma intermitente). Comandos úteis em `memoria/etapas/etapa-06-supabase-auth.md`.

## Próximo passo

**Fase 4 — Sprint 16, parte 2 (etapa 24): PDF gerado no servidor.** A parte 1 (impressão) terminou na etapa [23](etapas/etapa-23-impressao.md). O usuário escolheu "os dois, em etapas" em 2026-10-14.

Como retomar (ler as etapas 18, 22 e 23 e `src/components/quotes/quote-preview.jsx`):
1. **Etapa 24 — "Baixar PDF" de verdade:**
   - rota (route handler) que abre a página da proposta num Chrome headless e devolve `application/pdf` com `Content-Disposition: attachment` ("Proposta-2026-001.pdf");
   - **JavaScript desligado** no headless: o documento é Server Component, e com JS ligado o `RegisterQuoteView` marcaria "visualizado";
   - mídia de impressão, `printBackground`, `preferCSSPageSize`, rodapé com número da proposta e "Página X de Y" por `displayHeaderFooter`/`footerTemplate`.
   - Lado público: `/quote/<public_id>/pdf`. Lado do dono: conferir se o orçamento é dele; rascunho não tem página pública (decidir: só pela impressão, ou passar a sessão para o headless).
   - Registrar o evento `downloaded` (já existe no CHECK de `quote_events`; criar uma função própria, porque hoje só o gatilho grava). Distinguir cliente e dono no `metadata`.
   - Dependências: `puppeteer-core` + um Chrome. Em dev, o Chrome instalado (`C:Program Files (x86)GoogleChromeApplicationchrome.exe`, por variável de ambiente); no deploy (Vercel), `@sparticuz/chromium`. **Conferir versões e o guia oficial antes de instalar** e avisar o usuário do peso/limites.
2. Depois: Sprint 17 (WhatsApp; "Copiar link" já existe), Fase 5.
3. Pendências: `/settings/business` (emitente hoje = perfil); landing `/` provisória; polimento do Sprint 13 (origem da cópia).

Decisões já tomadas para essas partes:
- **Dinheiro em centavos** em tudo (`money.js`); **quantidade em centésimos** (`quantity.js`, até 2 casas); unidade com plural: `formatServiceUnit(unit, quantityToNumber(qtd))` ("1,5 hora").
- **Rascunho local (etapa 14):** `useQuoteDraftStore` (Zustand + persist, por usuário, skipHydration) + `useQuoteDraft`. Ao salvar no servidor: `draft.forget()` antes de navegar (etapa 16; apaga e impede a gravação ao desmontar). "Sair" já limpa tudo (`clearQuoteDrafts`).
- **Impressão / PDF (etapa 23):** o mesmo `QuotePreview` vai para o papel; `@page` A4 e regras de `@media print` no `globals.css`; páginas escondem o resto com `print:hidden`; `print:` que disputa com `@xl:`/`sm:`/`dark:` leva `!`. Sem número de página por CSS (o Chrome sobrepõe o próprio rodapé). Testar com `chrome --headless=new --print-to-pdf` (perfil temporário novo a cada vez) e ler o PDF.
- **Resposta do cliente (etapa 22):** `quote_responses` (uma por proposta) gravada só por `approve_quote`/`decline_quote` (SECURITY DEFINER, para anon; conferência em `private.lock_quote_for_response`: P0002/55000/22023/**PT403 = dono**/23514). `get_public_quote` devolve `response` (sem e-mail/IP/motivo) e `viewer_is_owner`. Actions marcam `stale` (já respondida/vencida/sumiu) → toast + `router.refresh()`. Aceite = nome digitado (serif itálica) + e-mail + caixa; IP/navegador são evidência auxiliar (`lib/request-meta.js`). `QuotePreview` recebe `acceptance`. Páginas `/quote/<id>/approved|declined` (volta para a proposta se o estado não bate).
- **Status (etapa 19):** só pelas funções (`send_quote`, `cancel_quote`, `private.expire_quotes` via pg_cron) que ligam `set_config('invoiceflow.status_transition', 'on', true)`; a guarda recusa o resto e confere as transições. Funções novas que mudam status (página pública, aprovação) devem fazer o mesmo e desligar a variável depois. Histórico em `quote_events` gravado por gatilho. Exclusão só de rascunhos. Confirmações com `ConfirmActionDialog`.
- **Documento (etapa 18):** `QuotePreview` (um componente para página interna, pública e PDF; sem "use client"; container queries; papel sempre claro com `.theme-paper`); `getQuoteDocument` → `{ quote, client, issuer }`; `getIssuer()` (perfil); pré-visualização no construtor com `previewQuoteFromForm`. Novos documentos/telas que mostram o orçamento devem reaproveitar o `QuotePreview`.
- **Editar (etapa 17):** `update_quote(p_quote_id, p_expected_updated_at, p_quote, p_items)` (só `draft`, substitui os itens, confere `updated_at` → conflito `PT409`); guardas de imutabilidade no banco (`private.guard_quote_update`, `private.guard_quote_item_change`); `getQuote` + `toQuoteFormValues`; `QuoteForm` com `quote`; cópia local por orçamento (`quoteDraftKey`, `baseVersion`, aviso "foi salvo de novo depois disso").
- **Salvar (etapa 16):** `createQuoteAction` → `parseInput(createQuoteSchema({ today: todayIso() }))` → `insertQuote` → `toCreateQuoteParams` (totais calculados no servidor) → `rpc("create_quote").single()`. Erros: `quoteWriteError` (23503 por constraint, 28000). `DataError(code, message, { field })` vira `fieldErrors` no `toFailure`; `parseInput` devolve caminhos completos ("items.0.name"). No formulário: `setError` + foco pela `FIELD_ORDER`; exceção na chamada = sem conexão (toast, nada se perde).
- **Motor de cálculos (etapa 13):** `src/lib/calculations/quote.js` — inteiros, BigInt nas multiplicações, arredondamento meio para cima por linha e por percentual, teto `MAX_TOTAL_CENTS` (R$ 999.999.999,99; acima → `null`), desconto fixo limitado ao subtotal com aviso. O schema confere os totais num `superRefine` depois do `transform`. O resumo usa `totalsInputFromForm` (tolerante a textos inválidos). **No Sprint 10, gravar também os totais calculados no servidor** (subtotal, discount_total, tax_total, total) com a MESMA função, nunca valores vindos do navegador.
- **Schema do orçamento (etapa 12):** `createQuoteSchema({ today })` devolve o formato do banco (`quantity_hundredths`, `unit_price_cents`, `discount_type`/`discount_value`, `tax_rate_bps`). Validade obrigatória, de hoje até 1 ano. Desconto/imposto ligados exigem valor > 0. Foco no primeiro erro pela ordem da tela (`FIELD_ORDER` + `lib/form-errors.js`); Enter em campo de texto não envia o construtor.
- **Snapshot:** o item copia nome, descrição, unidade e preço do serviço (`createQuoteItem`); o preço pode ser ajustado no orçamento.
- **Banco dos orçamentos (etapa 15):** FKs compostas com `user_id`; `quotes.client_id` com **NO ACTION** (bloqueia excluir cliente com orçamentos, mas deixa excluir a conta); `quote_items.service_id` → `SET NULL (service_id)`; CHECKs conferem os totais com as regras do motor; `create_quote` (RPC, invoker) cria tudo numa transação; contador de números em `private`. **Pendente no Sprint 12:** impedir mudança de status por UPDATE direto (hoje o RLS só obriga `draft` na inserção). Teste de RLS reaproveitável: `memoria/etapas/etapa-15-teste-rls.sql`.
- **Desconto/imposto (etapa 11):** `discount_type` (`DISCOUNT_TYPE`: none/percent/amount) + `discount_value`; `tax_enabled` + `tax_rate` (desde a etapa 12; ligado, a alíquota é obrigatória). Percentuais em **pontos-base** (`lib/percent.js`, 12,5% = 1250, 0–100%). **O imposto incide sobre o subtotal COM desconto.** `total = subtotal − desconto + imposto`.
- Ideia para o Sprint 20: no celular, barra fixa no rodapé com o total e "Salvar".

Pendente também: a **landing page `/`** continua provisória. Refazer antes do deploy.

## Pendências com o usuário

- [x] ~~Criar o projeto Supabase~~ → feito (projeto criado pelo usuário, configurado por mim via CLI na etapa 6). Guia de referência: `docs/guia-supabase.md` (passos 1–6: conta, organização, projeto em São Paulo, URL + publishable key, configuração de Auth e templates de e-mail em pt-BR) e preencher o `.env.local`. Necessário para a etapa 6. **Nunca pedir nem exibir os valores; a secret key não deve ser usada.**
- [x] ~~Reativar o projeto Supabase~~ → pausado por inatividade e reativado pelo usuário em 2026-10-12.
- [ ] **Testar a recuperação de senha com e-mail real** (só o usuário pode): cadastrar no app com o e-mail da conta Supabase, pedir o link e abri-lo **no mesmo navegador**. Passo a passo no fim de `docs/guia-supabase.md`.
- [ ] **Antes do deploy:** configurar SMTP próprio (ex.: Resend), religar "Confirm email" e reativar os templates pt-BR (`[auth.email.template.*]` no `config.toml`, arquivos em `supabase/templates/`). No Free sem SMTP: só entrega para a equipe, máximo 2 por hora, e **templates personalizados são bloqueados**.
- [ ] **Antes do deploy:** avaliar ligar a **proteção contra senhas vazadas** do Auth (advisor "Leaked Password Protection Disabled"; segundo a documentação do Supabase, é recurso de plano pago — conferir).
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
- **SQLSTATE nas funções do banco:** **nunca usar a classe 40** (40001, 40P01…) para erro de negócio: o PostgREST repete a transação e a requisição fica presa (etapa 17). Conflito/negócio: `PTxyz` (vira HTTP xyz, ex.: `PT409`), `55000`, `P0002`, `22023`, `23514`, `28000`.
- **Testar migração antes do push:** `begin;` + migração + bloco `DO` de teste terminando em `RAISE EXCEPTION`, num arquivo só, com `db query --linked -f`: tudo é desfeito (conferir depois que nada ficou). **`db push` remoto precisa do "sim" explícito do usuário** (o verificador de permissões barra): rodar o `--dry-run` separado, mostrar e pedir.
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
  - **Painel que rola + cabeçalho fixo:** `scroll-padding-top` (painel: `md:scroll-pt-16`; celular: `html`), senão o Next/ o foco deixam o topo do conteúdo sob o cabeçalho (etapa 18).
  - Páginas privadas: usar `PageHeader` + seções como filhos diretos (o `template.js` faz o stagger de entrada). Listas vazias usam `EmptyState`. Status sempre via `StatusBadge` + `src/lib/constants/quote-status.js`.
  - Ação ainda não implementada → `ComingSoonButton` (toast), nunca um link para 404.
  - **CRUD padrão (etapa 7):** migração com RLS + grants → `src/lib/br.js`/utilitários → schema Zod que normaliza para o banco (textos via `src/lib/validations/text.js`, **limites contados como o Postgres**; teste que confere os limites lendo a migração) → camada de dados `src/lib/data/<recurso>.js` (`server-only`, peças de `data/shared.js`: `DataError`, `databaseError`, `getDataContext`, `isUuid`, `sanitizeSearch`; filtro por `user_id`, `cache` no get) → actions `src/actions/<recurso>.js` ("use server", `parseInput(schema, values)` + `toFailure(scope, error)` de `src/lib/action-result.js`, devolve `{ ok, id }` ou `{ ok:false, message, fieldErrors }`). Testes de módulos `server-only` usam `vi.mock("server-only", () => ({}))` → páginas (lista em `(list)/` com `loading.js`, new, [id], [id]/edit, not-found) → componentes em `src/components/<recurso>/`.
  - **Máscara em input com RHF:** `event.target.value = mask(...)` antes de `registration.onChange(event)`. **Nunca** `setValue` dentro do onChange, porque o RHF pula a revalidação.
  - **Formulários (etapa 8):** usar as peças de `src/components/shared/form-fields.jsx` (`FormSection`, `TextField`, `TextareaField` com `maxLength` → contador, `SelectField`, `CurrencyField`), `SearchInput` nas listas e `ConfirmDeleteDialog` (invólucros `Delete<Recurso>Dialog` com textos, action e toast). Valores do banco → formulário com `to<Recurso>FormValues` no arquivo de validação.
  - **Campo de valor em reais:** `CurrencyField`/`CurrencyInput`. Regras em `src/lib/currency-input.js` (funções puras testadas); o componente só aplica o resultado no `<input>`.
  - **Campos numéricos (etapas 10 e 11):** `src/components/shared/decimal-input.jsx` tem o `DecimalInput` genérico (regras `edit`/`paste`/`normalize` vindas de `lib/`, `prefix`/`suffix`) e os invólucros `CurrencyInput` (R$), `QuantityInput` e `PercentInput` (%), com os `*Field` correspondentes em `form-fields.jsx`. Um campo novo = funções puras testadas + invólucro.
  - **Erro de um campo que depende de outros** (ex.: desconto ≤ subtotal): depois do envio o RHF só revalida o campo alterado; revalidar os dependentes com `form.trigger([...])` dentro de `form.subscribe` (não `form.watch(callback)`, que o lint do React 19 recusa).
  - **`setValue` em campo validado:** passar `shouldValidate: true` (senão um erro antigo fica na tela, mesmo depois do envio) ou chamar `clearErrors` quando o valor novo deve esperar o blur (ex.: trocar o tipo de desconto).
  - **Hook que expõe um ref para o componente alterar:** o lint do React 19 (`react-hooks/immutability`) recusa `valorDoHook.current = …` se o nome não terminar em `Ref`; devolver uma função que altera o ref por dentro (ex.: `focusNext` em `quote-adjustments.jsx`).
  - **Peças de formulário com nomes aninhados e `id` (etapa 10):** os campos de `form-fields.jsx` aceitam `name="items.0.name"` (erro via `get`) e uma prop **`id`** (padrão = `name`). Diálogo de cadastro rápido aberto sobre outro formulário usa ids com prefixo (`service-dialog-description`), senão repete o id `description` do orçamento.
  - **Listas com `useFieldArray` (etapa 10):** `key={field.id}`; ids dos botões da linha a partir do `field.id` (estável ao mover); **foco síncrono** com `useLayoutEffect` + `document.getElementById(...).focus()`, porque o `form.setFocus` do RHF adia com `setTimeout` e a digitação rápida cai no lugar errado; **sem animação de saída (`AnimatePresence`) nas linhas**, porque o item que sai continua registrado no RHF pelo índice antigo. Remover = sem confirmação + "Desfazer" no toast (8 s, fechado ao desmontar).
  - **Popover com lista:** ao fechar por clique fora (`onInteractOutside`), não devolver o foco ao botão (o foco fica onde a pessoa clicou). Vale para `client-selector.jsx` e `service-picker.jsx`.
  - **Botão que muda de lugar abrindo o mesmo Popover/diálogo** (estado vazio → barra da lista): o componente com Popover + diálogo recebe `children` como função que monta o botão (`ServicePicker`), para o Popover e o diálogo não desmontarem quando o botão troca de lugar.
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
- **Quantidade = centésimos inteiros** (150 = 1,5; até 999.999,99), em `src/lib/quantity.js` (`parseQuantityInput`, `formatQuantity`…).
- **Testes:** Vitest 5 (`npm test` = `vitest run`, `npm run test:watch`), `vitest.config.mjs` com alias `@`, ambiente `node`, arquivos `src/**/*.test.js` ao lado do código. Sem jsdom/Testing Library por enquanto (instalar quando houver teste de componente).
- Os documentos originais do usuário foram movidos para `docs/`.

## Problemas conhecidos / avisos

- `npm audit` acusa 9 vulnerabilidades "high" (eram 5 até 2026-10-06; o audit passou a contar também os pacotes intermediários da mesma cadeia, e nenhuma vem do Vitest/Vite), todas por causa do pacote `braces` (via `fast-glob`/`micromatch`), usado apenas por ferramentas de dev (eslint-plugin-next e CLI do shadcn). Não vai para o bundle do navegador. Não rodar `npm audit fix --force` (quebraria versões).
- Testes no Chrome com aba oculta: páginas com `loading.js` (streaming) não revelam nem hidratam o conteúdo (ele fica em `div[hidden]` esperando `requestAnimationFrame`), e capturas de tela expiram. Testar interações em páginas sem streaming; disparar `focusout` (não `blur`) para validação no blur do RHF.
- Testes no Chrome: se `document.visibilityState === "hidden"` (janela em segundo plano), o clique não move o foco, o teclado não chega, os menus Radix não abrem e as animações só avançam com screenshot. Saídas: setter nativo + evento `input` para preencher campos, `PointerEvent('pointerdown')` para abrir menus Radix e `element.click()` nos itens.
- **Testes de impressão:** `window.print()` abre uma janela do navegador que trava a automação: interceptar `window.print` no teste e gerar o PDF real com o Chrome headless pela linha de comando (ver etapa 23). Para simular a impressão de página com login: iframe de 703 px + regras de `@media print` copiadas como regras de tela (Tailwind v4 aninha o `@media` dentro do seletor; no iframe, reconhecer a regra pela propriedade `media`, porque `instanceof` falha entre janelas).
- **Extensão Grammarly no Chrome do usuário:** gera aviso de hidratação no log do dev (`data-gr-*` no `<body>`) e erros próprios no console. Não é do app. O log do `next dev` também mostra os argumentos das Server Actions (só em dev).
- Testes no Chrome (Claude in Chrome): o monitor do usuário é ultrawide (viewport ~3018 px CSS) e o screenshot vem reduzido, então **clicar por coordenada erra o alvo**. Usar refs do `find` ou `javascript_tool`. O `resize_window` não muda a viewport: para testar mobile, usar iframes de 390 px (e recarregar a aba depois, porque mexer no `<body>` quebra o React da página).
- **Testes no Chrome com login (atualizado em 2026-10-12):** não criar contas de teste pelo navegador (o cadastro vai para o Supabase Auth, externo). Usar a sessão de teste do usuário já aberta em `localhost:3000` (e apagar depois, pelos ids, só o que eu criar) ou o **modo demonstração**. (Até a etapa 9 os testes usavam contas `e2e-…@example.com` em `e2e.localhost:3000`; o dev server aceita subdomínios de localhost e os cookies ficam separados.)
- **Modo demonstração para testar a interface sem Supabase:** `NEXT_PUBLIC_SUPABASE_URL= NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY= npx next dev -p 3100` (variável vazia no processo vence o `.env.local`). Proxy libera tudo, usuário fictício, listas vazias, e as actions respondem "Conecte o Supabase…". Só um `next dev` por vez na pasta: parar o da porta 3000 antes.
- **Projeto Supabase pausado:** `projects list` mostra `INACTIVE` e o `db query` falha com "Failed to create login role: Connection terminated due to connection timeout". Aconteceu em 2026-10-12, 5 dias depois da última atividade; o usuário reativou em **Resume project** e os dados estavam intactos.
- **Testes de teclado com automação em Select do Radix:** esperar ~300 ms entre abrir a lista e navegar/fechar; teclas enviadas durante a animação se perdem. Na aba visível (2026-10-12), cliques por `ref` e teclado reais funcionaram.
- **Sessão de usuário apagado continua valendo até o token expirar (até ~1 h):** o `getClaims()` (proxy e `getCurrentUser`) valida o JWT localmente, sem consultar o Auth. Visto em 2026-10-07: a conta de teste apagada ainda aparecia logada em `e2e.localhost`. Sem risco aos dados (cascade apagou tudo, e inserções falham pela FK em `profiles`), mas **nos testes: sair da conta (menu → Sair) ANTES de apagá-la no banco**. Se um dia for preciso derrubar sessões na hora (usuário banido/excluído), usar `getUser()` nas rotas sensíveis.
- **Testes no Chrome com aba oculta + Radix:** as animações de saída não rodam, então Popover/Dialog fechados **continuam no DOM** (e o `FocusScope` do diálogo segue prendendo o foco, o que invalida testes de foco). Para testar foco: injetar `*{animation:none!important;transition:none!important}` (o Radix desmonta na hora). O conteúdo do Popover também tem `role="dialog"`: para achar o diálogo, usar `[data-slot=dialog-content]`. Páginas com `loading.js` só hidratam depois de um quadro: uma tentativa de captura de tela (mesmo que expire) costuma destravar. Na 1ª navegação logo após subir o servidor, o Chrome pode cair numa página interna: navegar de novo.
- Testes no Chrome com aba oculta: `setTimeout` é estrangulado (≥ 1 s por espera) e scripts longos estouram os 45 s da ferramenta. Esperar com `MessageChannel` e só digitar depois da hidratação (o input ter `__reactProps…`), senão o RHF regrava o valor padrão. Teclas simuladas: setter nativo + `InputEvent("input", { inputType, data })`; blur com `focusout`; menus Radix com `PointerEvent("pointerdown")` e, no item, `pointerup` + `click()`. Capturas de tela às vezes expiram, mas costumam funcionar logo depois de uma navegação.
- Ferramenta Bash: um `python - <<'EOF'` com texto longo (aspas triplas, crases) travou sem rodar o Python (2026-10-07). Para editar textos longos, usar as ferramentas Edit/Write. **Em 2026-10-12 não havia Python na máquina** (`python3` abre a Microsoft Store): para edições por script, usar `node -e` (o `fs.writeFileSync` mantém LF).
- **Testes no Chrome (2026-10-13):** o `javascript_tool` troca a saída por "[BLOCKED: JWT token]" quando ela tem ids como `items.0.quantity` (parece um JWT); a ação roda, só a saída some. Devolver `id.replaceAll(".", "_")` ou só os valores. E depois de escolher num Popover (cliente/catálogo), esperar ~0,5 s antes de clicar em outro campo: o foco volta ao botão no fim da animação. Para simular falhas da action no navegador: substituir `window.fetch` e filtrar o cabeçalho `Next-Action` (rejeitar = sem rede; alterar o corpo = dado forjado).
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
| 10 | 2026-10-12 | Sprint 6 (parte 3) — itens do orçamento: catálogo, item avulso, quantidade decimal, mover/remover com desfazer, ServiceDialog | [etapa-10-construtor-itens.md](etapas/etapa-10-construtor-itens.md) |
| 11 | 2026-10-12 | Sprint 6 (parte 4) — desconto (percentual ou valor fixo) e imposto, campo de percentual testado | [etapa-11-desconto-e-impostos.md](etapas/etapa-11-desconto-e-impostos.md) |
| 12 | 2026-10-12 | Sprint 7 — schema Zod do orçamento, erros no formulário e foco no primeiro erro | [etapa-12-schema-do-orcamento.md](etapas/etapa-12-schema-do-orcamento.md) |
| 13 | 2026-10-12 | Sprint 8 — motor de cálculos (BigInt, arredondamento, tetos), resumo e subtotais ao vivo | [etapa-13-motor-de-calculos.md](etapas/etapa-13-motor-de-calculos.md) |
| 14 | 2026-10-12 | Sprint 9 — rascunho local do construtor com Zustand (recuperar/descartar, cópia automática) | [etapa-14-rascunho-local-zustand.md](etapas/etapa-14-rascunho-local-zustand.md) |
| 15 | 2026-10-12 | Sprint 10 (parte 1) — tabelas quotes/quote_items, numeração, create_quote (RPC), RLS testado 24/24 | [etapa-15-orcamentos-no-banco.md](etapas/etapa-15-orcamentos-no-banco.md) |
| 16 | 2026-10-13 | Sprint 10 (partes 2 e 3) — salvar rascunho no Supabase (action, totais no servidor, erros traduzidos) + lista mínima em /quotes | [etapa-16-salvar-rascunho.md](etapas/etapa-16-salvar-rascunho.md) |
| 17 | 2026-10-13 | Sprint 10 (parte 4) — editar rascunho (update_quote, guardas de imutabilidade, conflito PT409, cópia local por orçamento) | [etapa-17-editar-rascunho.md](etapas/etapa-17-editar-rascunho.md) |
| 18 | 2026-10-13 | Sprint 11 — QuotePreview (documento sempre claro), página /quotes/[id], pré-visualização no construtor, rolagem abaixo do cabeçalho | [etapa-18-quote-preview.md](etapas/etapa-18-quote-preview.md) |
| 19 | 2026-10-13 | Sprint 12 — máquina de estados (send/cancel, guarda de transições, expiração com pg_cron), quote_events por gatilho, exclusão só de rascunhos, ações e histórico na página | [etapa-19-maquina-de-estados.md](etapas/etapa-19-maquina-de-estados.md) |
| 21 | 2026-10-13 | Sprint 14 — página pública (get_public_quote/register_quote_view, visualização pelo navegador, copiar link) | [etapa-21-pagina-publica.md](etapas/etapa-21-pagina-publica.md) |
| 20 | 2026-10-13 | Sprint 13 — "Duplicar como novo rascunho" (validade renovada pelo mesmo prazo, sem migração) | [etapa-20-duplicar-orcamento.md](etapas/etapa-20-duplicar-orcamento.md) |
| 22 | 2026-10-14 | Sprint 15 — aprovar (aceite eletrônico) / recusar pela página pública, confirmações, aceite no documento e para o dono, celular conferido | [etapa-22-aprovacao-e-aceite.md](etapas/etapa-22-aprovacao-e-aceite.md) |
| 23 | 2026-10-14 | Sprint 16 (parte 1) — versão para impressão / "Salvar como PDF" (A4, quebras de página, só o documento no papel) | [etapa-23-impressao.md](etapas/etapa-23-impressao.md) |

## Roadmap (do plano de desenvolvimento)

**Fase 1 — Setup & Design System**
- [x] Sprint 1 — Inicialização
- [x] Sprint 2 — Design System + layout (sidebar/header/sheet mobile), StatusBadge, EmptyState, tipografia e motion

**Fase 2 — Autenticação & Clientes/Serviços**
- [x] Sprint 3 — Autenticação (signup, login, logout, recuperação, proxy, profiles)
- [x] Sprint 4 — Clientes (CRUD, RHF + Zod)
- [x] Sprint 5 — Serviços (CRUD, preço em centavos)

**Fase 3 — Quote Builder**
- [x] Sprint 6 — Estrutura do construtor (cliente, informações, itens, desconto, impostos, observações/termos, resumo)
- [x] Sprint 7 — React Hook Form + Zod (useFieldArray)
- [x] Sprint 8 — Motor de cálculos (função pura + testes)
- [x] Sprint 9 — Zustand (rascunho local do construtor)
- [x] Sprint 10 — Persistência (draft, quote_number, public_id, snapshot, edição enquanto draft)

**Fase 4 — Visualização, Exportação & Assinatura**
- [x] Sprint 11 — QuotePreview (documento, página interna, pré-visualização no construtor)
- [x] Sprint 12 — Máquina de estados (enviar, cancelar, expirar, histórico de eventos)
- [x] Sprint 13 — Imutabilidade (edição bloqueada após o envio + duplicar como novo rascunho)
- [x] Sprint 14 — Página pública
- [x] Sprint 15 — Aprovação/aceite
- [ ] Sprint 16 — PDF
- [ ] Sprint 17 — Compartilhamento (link + WhatsApp)

**Fase 5 — Dashboard, Métricas & Polimento**
- [ ] Sprint 18 — Dashboard
- [ ] Sprint 19 — Lista de orçamentos (busca, filtros)
- [ ] Sprint 20 — Responsividade
- [ ] Sprint 21 — Estados de UX
- [ ] Sprint 22 — Qualidade (a11y, testes, CI/CD, deploy, README final)
