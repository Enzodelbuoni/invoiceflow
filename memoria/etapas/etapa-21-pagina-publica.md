# Etapa 21 — Sprint 14: página pública da proposta

**Data:** 2026-10-13
**Status:** ✅ Concluída (commitada). Sprint 14 completo.

## Decisões
- Migração `20261013183049_public_quote_access.sql` (aplicada): `get_public_quote(public_id)` e `register_quote_view(public_id)`, SECURITY DEFINER, executáveis por `anon`/`authenticated`. Devolvem só o necessário (sem ids internos); rascunho/inexistente → NULL; cancelado → só número, status e título. Advisor "Public Can Execute SECURITY DEFINER Function" (0028/0029) **aceito de propósito**: são a porta da página do cliente e só agem sobre o `public_id` aleatório.
- Visualização (`sent → viewed`, evento `viewed`) registrada **pelo navegador depois de carregar** (`RegisterQuoteView` → `registerQuoteViewAction`): robôs de prévia de link (WhatsApp/Slack) não executam JS. Não conta o próprio dono logado nem proposta vencida.
- Página `/quote/[publicId]` (grupo `(public)`, sem login; `/quote` não casa com `/quotes` no proxy — teste em `src/lib/auth/redirect.test.js`): cabeçalho com o emitente, `PublicQuoteStatus` (aberta / aprovada / recusada / expirada / cancelada, total, contato por e-mail e WhatsApp), `QuotePreview` (sem documento se cancelada; selo "Expirada"), `noindex`. `publicQuoteState` trata validade vencida como expirada antes da rotina diária.
- Dono: "Copiar link" real (`/quote/<public_id>`, aviso com o link se a cópia falhar), toast pós-envio com ação "Copiar link", "Abrir página do cliente" no menu (fora do rascunho). `src/lib/initials.js` compartilhado.

## Verificação
- lint ✅ · testes ✅ (543+) · build ✅ · teste do banco `etapa-21-teste-publico.sql` 10/10 (e o da etapa 19 24/24).
- Chrome/curl: link copiado certo; robô (curl, UA WhatsApp) → HTTP 200, `noindex`, status continua `sent`; dono abrindo → continua `sent`; visitante sem login (`e2e.localhost`) → `viewed` + evento; cancelado → só o aviso; inexistente/id inválido → 404; vencida → aviso "expirou" + selo. Dados de teste apagados.

## Problemas
- `navigator.clipboard.readText()` no script de teste abriu pedido de permissão e travou a aba: interceptar `writeText` em vez de ler.
- A ferramenta `find` da automação bateu limite de uso; cliques pelo DOM (`element.click()`) funcionaram.
- Não testado no navegador: celular da página pública.
