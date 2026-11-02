# Etapa 41 — Sprint 22 (parte 6): editor de modelos (criar do zero e editar)

**Data:** 2026-11-02
**Status:** ✅ Concluída (sem migração: `create_quote_template`/`update_quote_template` já existiam desde a etapa 40; testada de ponta a ponta na conta de teste; commitada). O usuário disse "pode dar commit e continuar" depois da etapa 40.

## O que mudou para o usuário

- **Modelos → "Novo modelo"** (cabeçalho) e **"Criar modelo"** (estado vazio, ao lado de "Ver meus orçamentos"; os dois caminhos explicados embaixo). Rota `/templates/new`.
- **Editar:** o **nome do modelo no cartão é um link** para `/templates/[id]/edit`, e o menu ⋯ ganhou **"Editar modelo"**. A edição tem "Excluir" no cabeçalho (volta à lista). Renomear = editar o nome.
- **O editor** tem as mesmas seções e peças do construtor de orçamentos, sem cliente:
  1. **Modelo** — nome (obrigatório; só a pessoa vê).
  2. **Proposta** — título sugerido (opcional, ≥ 2 caracteres se preenchido), descrição e **validade em dias** (campo só de números + atalhos 7/15/30; a dica mostra "Usado hoje, valeria até 2 de dez. de 2026").
  3. **Itens** — opcionais (um modelo pode ter só condições e textos); catálogo, item avulso, mover, remover com desfazer.
  4. **Desconto e impostos**. 5. **Observações e termos**.
  - **Resumo do modelo** ao lado (nome, título sugerido, subtotal/desconto/impostos, **total estimado**, validade em dias), "Salvar modelo"/"Salvar alterações" e **"Pré-visualizar"** (o documento como ficaria um orçamento criado hoje com o modelo; "Cliente ainda não escolhido"). Numa coluna, a mesma barra fixa de total + Salvar do construtor.
  - Fechar ou recarregar a aba com alterações não salvas → o navegador pede confirmação (`beforeunload`). Não há cópia local como no construtor.
  - Nome repetido → erro no campo; modelo alterado em outra aba → aviso de conflito (o formulário continua preenchido).

## Código

- **`lib/validations/quote.js`**: as regras de desconto, imposto e totais saíram do `createQuoteSchema` para **`withAdjustmentsAndTotals(objectSchema)`** + **`ADJUSTMENT_FIELDS`** (mesma lógica; o orçamento usa igual). `quoteItemSchema` exportado.
- **`lib/validations/quote-template.js`**: **`quoteTemplateSchema`** (nome, título sugerido opcional, descrição, `validity_days` texto → 1–365, itens 0–100, ajustes e tetos do orçamento; saída no formato de `create/update_quote_template`), `createEmptyTemplateForm()`, `toTemplateFormValues(template)` (inverso; teste de ida e volta), `validityDaysFromInput(text)` (resumo/prévia ao vivo).
- **`actions/quote-templates.js`**: `createQuoteTemplateAction(values)` e `updateQuoteTemplateAction(id, expectedUpdatedAt, values)` (→ `{ ok, id, name }`; revalidam `/templates` e `/quotes/new`). `isTimestamp` foi para `lib/action-result.js` (usado também pela edição de orçamento).
- **Peças compartilhadas com o construtor:**
  - `QuoteItems`, `ServicePicker` e `ServiceDialog` com prop **`noun`** ("orçamento" padrão | "modelo") nos textos e anúncios para leitores de tela.
  - `quote-summary.jsx`: **`SummaryFigures`** (números + total, `totalLabel`, `children` embaixo do total) e **`SummaryActions`** (Salvar + Pré-visualizar, `#quote-summary-actions` observado pela `QuoteTotalBar`); `QuoteSummary` agora as compõe.
  - `QuotePreviewDialog` com prop `description`.
  - `hooks/use-options-with-created.js` e `lib/form-events.js` (`preventImplicitSubmit`), saídos do `quote-form.jsx`.
  - `page-skeletons.jsx`: **`BuilderSkeleton({ sections })`** (seções numeradas + resumo), usado pelo "Novo orçamento" e pelo editor.
- **Componentes:** `templates/template-form.jsx` (`TemplateForm` + `ValidityDaysField`), `template-summary.jsx`, `delete-template-dialog.jsx` (lista e edição), `template-edit-actions.jsx`; `template-actions.jsx` com "Editar modelo"; `template-card.jsx` com o nome em link.
- **Rotas:** lista movida para `templates/(list)/` (o esqueleto dela não aparece ao abrir o editor); `templates/new/` e `templates/[id]/edit/` (página + `loading.js`), `templates/[id]/not-found.js`. A edição usa `key={template.updated_at}`.

## Verificação

- `npm run lint` ✅ · `npm test` ✅ (**994**; novo `validations/quote-template.test.js` com 25: vazio válido só com o nome, ida e volta, título opcional, validade, itens como no orçamento, limite de 100, ajustes, desconto > subtotal, `validityDaysFromInput`) · build ✅. Os 139 testes de validação do orçamento passaram iguais depois da extração das regras.
- **Chrome (sessão de teste do usuário):** estado vazio com os dois botões → editor → enviar vazio (só "Dê um nome ao modelo.", foco no nome) → título "A" recusado no blur → validade com letras vira só dígitos ("4x5" → 45) → atalho 30 dias → item avulso ("1 item no modelo" anunciado) → desconto 10% → observações → pré-visualizar (validade hoje + 30, "Cliente ainda não escolhido", totais iguais ao resumo; Esc devolve o foco) → salvar → lista com o cartão; a proteção de saída liga com alterações e desliga depois de salvar → editar pelo nome (tudo preenchido) → **conflito** (modelo alterado no banco depois de aberto) → aviso e formulário mantido → recarregar, renomear e corrigir o preço → total R$ 1.944,00 na lista → nome repetido em outra caixa/espaços recusado no campo → "Usar modelo" com os valores editados → excluir pela edição (toast, volta à lista) → endereço do modelo excluído mostra "Modelo não encontrado". 360/390/1024 px sem rolagem lateral. Console: só a Grammarly.
- **Limpeza:** o modelo de teste foi excluído pela própria interface; banco com 1 usuário, 1 cliente e 0 serviços/orçamentos/modelos; nenhuma cópia local.

## Observações

- Na automação, o aviso de "sair da página" travaria o navegador: no teste, `window.addEventListener("beforeunload")` foi interceptado (registrando "add"/"remove") antes de mexer no formulário.
- Depois de editar arquivos com a página aberta, o Fast Refresh às vezes não aplica a mudança (visto de novo aqui): recarregar a página antes de conferir.
- Ideias para depois (não feitas): "Duplicar modelo"; cópia local do editor como no construtor.
