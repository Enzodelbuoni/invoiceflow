# Etapa 20 — Sprint 13: imutabilidade + "Duplicar como novo rascunho"

**Data:** 2026-10-13
**Status:** ✅ Concluída. Sprint 13 completo.

## Decisões

- **O MVP do Sprint 13 ("bloquear edição após SENT") já estava pronto** nas etapas 17 (guardas de conteúdo) e 19 (status só pelas funções). Faltava o jeito de corrigir uma proposta enviada.
- **"Duplicar como novo rascunho"** no lugar das "versões" do plano (versão simples): cria um orçamento NOVO (número novo, rascunho) com o mesmo cliente, itens (snapshot), desconto, impostos, observações e termos; **validade renovada pelo mesmo prazo do original** (da data de criação, em SP, até a validade; sem prazo aproveitável → 15 dias; no máximo 365). O título é mantido (o número diferencia).
- **Sem migração:** `duplicateQuote(id)` lê o original (`getQuote`) e grava pelo mesmo caminho do "salvar" (`insertQuote` → `create_quote`), com os totais recalculados pelo motor. Vale para qualquer status (inclusive rascunho, para reaproveitar).
- **Sem confirmação** (nada muda no original): aviso "Duplicando orçamento…" → "Rascunho 2026-00X criado · Cópia do orçamento 2026-00Y" e a edição do rascunho novo abre.
- **Onde fica:** menu "⋯" da página do orçamento (agora presente em todos os status) e o painel "não pode mais ser editado" da edição. A confirmação de envio passou a dizer "Para corrigir algo depois, cancele e duplique como novo rascunho."
- **Não feito (possível polimento):** guardar a origem da cópia (ex.: coluna `source_quote_id`) para mostrar "versão corrigida de 2026-001" no documento e no histórico.

## O que foi feito

- `src/lib/quote-copy.js` (`copyValidityDays`, `toQuoteCopy`) + testes (prazo em SP, limites, campos que não são copiados).
- `duplicateQuote` em `data/quotes.js` (+ teste: grava pelo `create_quote` com os totais recalculados; original inexistente não grava), `duplicateQuoteAction`.
- `src/hooks/use-duplicate-quote.js`, `src/components/quotes/duplicate-quote-button.jsx`; `quote-actions.jsx` (menu sempre presente, "Duplicar como novo rascunho"), `quotes/[id]/edit/page.js` (botão no painel).

## Verificação

- `npm run lint` ✅ · `npm test` ✅ **527 testes** · `npm run build` ✅.
- Chrome (`localhost:3000`, sessão de teste do usuário): criar (3 × R$ 800, 5%) → enviar → "⋯ → Duplicar como novo rascunho" → edição do **2026-002** com cliente, item, desconto, total R$ 2.280,00 e validade de 15 dias; pela edição bloqueada do enviado → "Duplicar" → **2026-003**; console sem erros. Limpeza: 3 orçamentos e o contador apagados (banco: 1 usuário, 1 cliente, 0 orçamentos/eventos/contadores).

## Problemas encontrados

- Nenhum.
