# Etapa 40 — Sprint 22 (parte 5): modelos de orçamento (salvar, listar, usar)

**Data:** 2026-11-02
**Status:** ✅ Concluída (migração aplicada pela autorização permanente do Supabase; testada de ponta a ponta na conta de teste; commitada). O editor de modelos do zero fica para a etapa 41.

## Decisões (delegadas, avisadas ao usuário)

- **"Templates" do `info.txt` = "Modelos"** de proposta: guardam **itens, desconto, impostos, observações, termos, título sugerido e validade em dias**. **Sem cliente** (escolhido ao usar). Preços são uma cópia (snapshot), como nos itens do orçamento: o construtor já avisa "No catálogo: R$ X" quando o serviço mudou de preço.
- Etapa dividida em duas: **40** = banco + lista + "Salvar como modelo" + usar no construtor; **41** = editor (criar do zero e editar, `/templates/new` e `/templates/[id]/edit`; a função `update_quote_template` já existe). As etapas seguintes do plano andaram uma casa (landing 42, a11y 43, componentes 44, E2E 45, Lighthouse/OG 46, deploy 47, README 48).
- Validade guardada em **dias** (1–365), não em data: ao usar, `valid_until = hoje + dias` (o mesmo prazo do orçamento de origem, por `copyValidityDays`).
- Aplicar um modelo **navega** para `/quotes/new?modelo=<id>&cliente=<id>`: os valores de partida são montados no servidor e o `QuoteForm` remonta (`key`). O rascunho local compara com essa versão de partida.

## O que mudou para o usuário

- **Menu lateral → "Modelos"** (`/templates`, rota protegida). Cartões com nome, título sugerido, 3 primeiros itens (+ N), o que o modelo traz (desconto, impostos, validade, termos, observações), total estimado, "Atualizado em" e **"Usar modelo"**; menu ⋯ com "Novo orçamento com ele" e "Excluir modelo" (confirmação; foco no resumo depois). Estado vazio com os 3 passos para criar o primeiro.
- **"Salvar como modelo"** no menu ⋯ do orçamento (página e lista, qualquer status): diálogo com o nome (sugestão = título, selecionado), a lista do que vai para o modelo e "O cliente fica de fora". Nome repetido (sem diferenciar maiúsculas/espaços) → erro no campo. Toast "Modelo salvo" com "Ver modelos".
- **Novo orçamento:** barra "Comece a partir de um modelo" → "Escolher modelo" (lista com busca sem acentos, itens e total). Com modelo: "Modelo: X", **"Trocar modelo"** e **"Começar em branco"**. Se o formulário mudou (fora o cliente), pede confirmação ("Continuar editando" com o foco). **O cliente escolhido continua** ao trocar.

## Banco — migração `20261102165540_quote_templates.sql`

- **Correção encontrada no teste — `quotes_discount_check`:** aceitava `discount_type` sem `discount_value` (`null between …` dá NULL e o CHECK passa). Recriado com `discount_value is not null`. O app nunca gravou isso (o schema exige o valor), mas o banco agora também recusa.
- **`public.quote_templates`**: `name` (2–80 após `btrim`), `title` (2–120, opcional), `description` ≤ 2000, `validity_days smallint` 1–365 (padrão 15), `discount_type`/`discount_value` (mesmo CHECK corrigido), `tax_rate_bps` 1–10000, `notes` ≤ 2000, `terms` ≤ 4000, `created_at`/`updated_at` (gatilho `set_updated_at`); `unique (id, user_id)`; **índice único `(user_id, lower(btrim(name)))`** (nome repetido → 23505).
- **`public.quote_template_items`**: `position` 0–99 (`unique (template_id, position)`), FK composta `(template_id, user_id)` → modelo em cascata; **`(service_id, user_id)` → services `on delete set null (service_id)`** (excluir o serviço deixa o item avulso, com o snapshot); índice parcial em `service_id`. Mesmos limites dos itens do orçamento.
- **`create_quote_template(p_template, p_items)`** → id e **`update_quote_template(p_template_id, p_expected_updated_at, p_template, p_items)`** (lock, P0002, conflito `PT409`, substitui os itens): INVOKER, `search_path=''`, até 100 itens (`22023`), `28000` sem sessão; execute só para `authenticated`.
- RLS com 4 políticas por tabela (`to authenticated`, `(select auth.uid())`), `revoke all` + grants mínimos.
- Teste: **28/28** ([etapa-40-teste-modelos.sql](etapa-40-teste-modelos.sql): antes do push com `begin;` + a migração na frente; depois do push, sozinho). Cobre RLS entre usuários, nome repetido, limites, desconto incompleto (também em `quotes`), serviço excluído → item avulso, conflito PT409, exclusão em cascata e exclusão da conta. Advisors: só os avisos já conhecidos.

## Código

- **`lib/validations/quote-template.js`**: `QUOTE_TEMPLATE_LIMITS`, `templateNameSchema`.
- **`lib/quote-template.js`** (puro): `toTemplateFromQuote(quote, { name })`, `templateToQuoteFormValues(template, { today, clientId })` (via `toQuoteFormValues`, validade = hoje + dias), `templateTotals` (mesmo motor de cálculos), `templateItemsLabel`, `templateHighlights`. Testes conferem os limites lendo a migração.
- **`lib/data/quote-templates.js`** (`server-only`): `listQuoteTemplates`, `listQuoteTemplateOptions` (`{ id, name, title, itemCount, totalCents }` para a barra), `getQuoteTemplate` (`cache`; id inválido/de outra conta → `null`), `insertQuoteTemplate`, `updateQuoteTemplate`, `deleteQuoteTemplate`, `createTemplateFromQuote(quoteId, name)`; `templateWriteError` (23505 → campo `name`, 23503, 28000, P0002, PT409).
- **`actions/quote-templates.js`**: `saveQuoteAsTemplateAction(quoteId, values)` → `{ ok, id, name }`, `deleteQuoteTemplateAction(id)`; revalidam `/templates` e `/quotes/new`.
- **UI:** `components/templates/save-template-dialog.jsx`, `template-card.jsx` (Server Component), `template-actions.jsx`; `app/(dashboard)/templates/page.js` + `loading.js`; `components/quotes/quote-template-bar.jsx`. Item "Salvar como modelo" em `quote-actions.jsx` e `quote-row-actions.jsx` (diálogo em `quote-action-dialogs.jsx`, `dialog === "template"`). `nav-items.js` (+ Modelos) e `auth/redirect.js` (+ `/templates`).
- **`QuoteForm`**: props `templates` e `template` (`{ id, name, values }`); versão de partida = orçamento salvo → modelo → em branco. A barra só aparece em orçamento novo com modelos. `hasChanges` ignora o cliente (ele vai junto). **Ao trocar com o aviso "Recuperar / Descartar" ainda aberto, a cópia local antiga NÃO é apagada** (aparece de novo na página do modelo); decidido o aviso, trocar apaga a cópia do formulário que foi substituído.
- **`/quotes/new`**: lê `?modelo=` (só da própria conta) junto com o resto (`Promise.all`), descrição do cabeçalho muda com modelo, `key={modelo ou "blank"}`.
- **Foco (correção que valia antes também):** na página do orçamento, os diálogos abertos pelo menu ⋯ (salvar como modelo, cancelar, excluir) devolviam o foco ao `<body>` (o item do menu some). Agora voltam ao ⋯ (`id="quote-more-actions"` + `returnFocus`). Na lista já voltavam.

## Verificação

- `npm run lint` ✅ · `npm test` ✅ (**969**; novos: `quote-template.test.js` 13, `data/quote-templates.test.js` 17, +1 em `redirect.test.js`) · build ✅.
- **Chrome (sessão de teste do usuário):** orçamento de teste criado pela `create_quote` (4 itens, 10%, 5% → R$ 7.191,45) → "Salvar como modelo" (nome sugerido, foco no campo) → nome repetido em minúsculas recusado no campo → outro nome salvo, foco de volta ao ⋯ → `/templates` com 2 cartões (ordem por nome, total R$ 7.191,45, "10,5 horas", destaques) → "Usar modelo" → construtor com itens, desconto, impostos, título, observações, termos e validade hoje + 15 → título alterado + "Trocar modelo" → confirmação → modelo trocado, cliente mantido, cópia local apagada → "Começar em branco" sem alteração → sem confirmação → cópia local pendente + escolher modelo → cópia preservada e aviso de novo → excluir modelo pela página (toast, foco no resumo). 360/390/1024 px sem rolagem lateral. Console: só a Grammarly e os erros do próprio teste de iframes.
- **Limpeza:** modelo restante, orçamento (eventos em cascata) e contador apagados pelos ids; cópia local descartada. Banco: 1 usuário, 1 cliente; 0 orçamentos/itens/eventos/modelos/contadores.

## Pendente (etapa 41)

- Editor de modelos: criar do zero e editar (reaproveitar `QuoteItems`, `QuoteAdjustments`, `QuoteNotes`; `update_quote_template` com conflito PT409 já pronta), renomear, "Duplicar modelo" se fizer sentido.
