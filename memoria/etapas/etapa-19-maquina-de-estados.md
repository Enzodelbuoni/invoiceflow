# Etapa 19 — Sprint 12: máquina de estados (enviar, cancelar, expirar) + histórico

**Data:** 2026-10-13
**Status:** ✅ Concluída. Sprint 12 completo.

## Decisões

- **Migração `20261013174559_quote_status_machine.sql`** (aplicada; o usuário deu autorização permanente para ações no Supabase nesta data):
  - **o status só muda pelas funções do app**: a guarda `private.guard_quote_update` recusa mudança de `status`/`sent_at`/`approved_at`/`declined_at` sem a variável de transação `invoiceflow.status_transition = 'on'`, que só as funções ligam (o PostgREST não expõe `set_config`, então um UPDATE direto pela API não consegue). A guarda também confere a transição: `draft → sent | cancelled`, `sent → viewed`, `sent/viewed → approved | declined | expired | cancelled`;
  - `public.send_quote(id)` (só `draft`, validade em dia → `sent` + `sent_at`) e `public.cancel_quote(id)` (`draft`/`sent`/`viewed` → `cancelled`), SECURITY INVOKER, `returns void`; erros 28000, P0002, 55000 e 22023 (validade vencida);
  - **cancelar também depois do envio** (o plano só tinha `DRAFT → CANCELLED`): é o jeito de tirar do ar uma proposta enviada com erro, já que ela não pode ser editada nem excluída;
  - **expiração automática:** `private.expire_quotes()` (SECURITY DEFINER) marca `sent/viewed` com `valid_until` < hoje (SP) como `expired`; **pg_cron** ligado (`create extension pg_cron with schema pg_catalog`) e job **`invoiceflow-expire-quotes`** às `1 3 * * *` (UTC = 00h01 em SP). Índice parcial `quotes_open_valid_until_idx`. A aprovação (Sprint 15) deve conferir a validade por conta própria;
  - **histórico `public.quote_events`** (plano 2.6; tipos `created, updated, sent, viewed, approved, declined, expired, cancelled, downloaded`), FK composta com `user_id`, RLS só de leitura para o dono; **quem grava é o gatilho** `quotes_log_event` (SECURITY DEFINER): criação → `created`, mudança de status → o novo status com `metadata.from`, edição → `updated`. Ninguém forja eventos (sem INSERT para `authenticated`);
  - **exclusão só de rascunhos** (regra 11): política de DELETE com `status = 'draft'`; o que foi enviado é histórico e sai do ar pelo cancelamento. Excluir a conta continua apagando tudo.
- **Teste antes do push** (transação desfeita): `etapa-19-teste-status.sql` **24/24**; os das etapas 15 (24/24) e 17 (23/23, atualizado: "enviar" agora usa `send_quote` e a mudança direta de status tem que ser recusada) rodaram junto com a migração antes e no remoto depois. Advisors: nada novo.
- **Interface (`/quotes/[id]`):** `QuoteActions` (cliente) por status — rascunho: Editar, **Enviar ao cliente** (confirmação com cliente, total e validade; aviso + link para editar se a validade passou) e "⋯ → Excluir rascunho"; enviado/visualizado: "Copiar link" (em breve, Sprint 14) e "⋯ → Cancelar proposta" (botão de voltar se chama "Voltar", para não confundir com "Cancelar proposta"). Selo no documento: Rascunho / Cancelada / Expirada. **Histórico** ao lado do documento (`QuoteTimeline`, do mais novo ao mais antigo, salvamentos seguidos juntos "· 3 vezes"). A página se atualiza sozinha depois da ação (a action faz `revalidatePath` da rota atual).
- **`ConfirmActionDialog`** (`components/shared/confirm-action-dialog.jsx`): confirmação genérica (ícone, variante, rótulos, conteúdo extra, erro no próprio diálogo, falha de rede tratada). O `ConfirmDeleteDialog` virou um invólucro dele (mesma API).
- Descrição do status `cancelled` mudou para "Cancelado. O cliente não pode mais aprovar." (antes dizia "antes do envio").

## O que foi feito

- Migração acima; `memoria/etapas/etapa-19-teste-status.sql`; `etapa-17-teste-update-quote.sql` atualizado.
- `src/lib/data/quotes.js`: `sendQuote`, `cancelQuote`, `deleteQuote`, `listQuoteEvents`, `transitionError` (+ testes).
- `src/actions/quotes.js`: `sendQuoteAction`, `cancelQuoteAction`, `deleteQuoteAction`.
- `src/lib/quote-events.js` (`QUOTE_EVENT_LABELS`, `summarizeQuoteEvents`; teste confere os rótulos com o CHECK da migração).
- `quote-actions.jsx`, `quote-timeline.jsx`, `confirm-action-dialog.jsx`, `confirm-delete-dialog.jsx`, `quotes/[id]/page.js`.

## Verificação

- `npm run lint` ✅ · `npm test` ✅ **518 testes** (eram 503) · `npm run build` ✅.
- Chrome (`localhost:3000`, sessão de teste do usuário): criar → histórico "Orçamento criado" → Enviar (confirmação com resumo) → "Enviado", ações trocadas, selo "Rascunho" sumiu, histórico "Enviado ao cliente" → Cancelar pelo menu → "Cancelado", selo "Cancelada", sem ações; edição do cancelado bloqueada; outro rascunho → Excluir → toast e volta à lista; rascunho com validade vencida (data mudada no banco) → aviso no diálogo e, ao confirmar, a recusa do servidor aparece no diálogo; celular sem rolagem lateral; console sem erros. Banco: `created → sent(draft) → cancelled(sent)`, sem eventos órfãos. Limpeza: 2 orçamentos e o contador apagados (banco: 1 usuário, 1 cliente, 0 orçamentos/itens/eventos/contadores).
- Não testado no navegador: excluir cliente/serviço depois da troca do `ConfirmDeleteDialog` (mesma API; lint/build ok) e a rotina diária rodando de fato (testada chamando a função no teste do banco).

## Problemas encontrados

1. O teste da etapa 17 marcava "enviado" com UPDATE direto, que agora é recusado de propósito: atualizado.
2. Uma captura de tela expirou ("renderer frozen") com o diálogo aberto; seguir pelo DOM resolveu.
3. O primeiro regex do teste dos rótulos estava sem escapes e passava por coincidência: corrigido.
