# Etapa 22 — Sprint 15: aprovação/recusa pelo cliente (aceite eletrônico)

**Data:** 2026-10-14
**Status:** ✅ Concluída. Sprint 15 completo. A página pública também foi conferida no celular (pendente desde o Sprint 14).

## Decisões

- **Migração `20261014160332_quote_responses.sql`** (aplicada; autorização permanente do usuário para o Supabase):
  - **`public.quote_responses`**: a `quote_signatures` do plano 2.7, generalizada para guardar também a recusa. Uma linha por proposta (`unique (quote_id)`): não dá para aprovar e recusar a mesma proposta, nem aprovar duas vezes. Colunas: `decision` (`approved`/`declined`), `signer_name` (2–120), `signer_email` (≤ 254, mesmo regex de `clients`), `reason` (≤ 1000, só na recusa), `ip_address inet`, `user_agent` (≤ 500), `created_at`. CHECK `quote_responses_decision_fields`: aprovar exige nome e e-mail; motivo só na recusa. FK composta `(quote_id, user_id)` → `quotes` com cascade. RLS: o dono só **lê**; ninguém grava pela API (só as funções).
  - **`public.approve_quote(public_id, nome, e-mail, aceite, ip, navegador)`** e **`public.decline_quote(public_id, motivo, ip, navegador)`**: SECURITY DEFINER, executáveis por `anon`/`authenticated` (a porta do cliente, como `get_public_quote`). Devolvem a data/hora do banco. A conferência comum fica em **`private.lock_quote_for_response`** (trava com `for update` e confere de novo no servidor, regras 5 e 10 do plano):
    - rascunho/inexistente → `P0002`;
    - aprovada/recusada/cancelada → `55000`;
    - expirada ou validade vencida (antes da rotina diária) → `22023`;
    - **o dono logado não responde à própria proposta → `PT403`** (HTTP 403).
    Aceite não marcado ou dados inválidos → `23514`. A mudança de status liga/desliga `invoiceflow.status_transition`, como as outras funções; o gatilho grava o evento `approved`/`declined` com `metadata.from`.
  - **`get_public_quote` substituída** (mesma assinatura): ganhou `response` (`{ decision, signer_name, responded_at }`; **sem** e-mail, IP, navegador ou motivo) e `viewer_is_owner`.
  - Advisors: só os avisos 0028/0029 de SECURITY DEFINER executável sem login, agora também nas duas funções novas, **aceitos de propósito** (como no Sprint 14), e o já conhecido "Leaked Password Protection".
- **Aceite eletrônico simples, não assinatura certificada** (plano 2.7). A "assinatura" é o nome digitado, mostrado em Instrument Serif itálica. **IP e navegador são evidência auxiliar:** vêm do servidor do app (`x-forwarded-for`/`x-real-ip` e `user-agent`, em `src/lib/request-meta.js`), mas quem chama a RPC direto pela API poderia informá-los. O que vale é o registro do banco (data do banco, status travado, documento imutável depois do envio). Em dev, o IP é `::1`.
- **Fluxo do cliente:** botões "Aprovar proposta" e "Recusar" no aviso do topo e num fechamento depois do documento ("Tudo certo com a proposta?").
  - **Aprovar:** diálogo com resumo, nome completo (com a prévia da assinatura), e-mail (vem preenchido com o e-mail do cadastro do cliente) e a caixa "Li a proposta e aceito…". O texto muda se a proposta tem termos. Nota sobre o que é registrado.
  - **Recusar:** diálogo com o motivo opcional (contador até 1000).
  - **Depois:** sucesso → `/quote/<id>/approved` ou `/declined`.
  - **Página desatualizada** (já respondida, vencida ou cancelada enquanto estava aberta): a action devolve `stale: true`, o diálogo fecha, aparece um toast e a página se atualiza (`router.refresh()`).
  - **Sem conexão:** aviso dentro do diálogo, nada se perde.
- **Dono abrindo o próprio link:** faixa "Esta é a página que o seu cliente vê…" + "Voltar ao painel" e botões desativados (o banco recusa de qualquer jeito com PT403).
- **Páginas de confirmação** (`/quote/<id>/approved` e `/declined`): selo animado (aparece, uma onda se espalha uma vez e o traço ✓/✕ é desenhado), título serif, comprovante (proposta, quem enviou, valor, quem aprovou, data e hora em horário de Brasília), contato de quem enviou e "Ver a proposta". Abrir uma delas sem a proposta estar nesse estado → volta para a proposta. Id inexistente → 404.
- **Documento (`QuotePreview`) ganhou `acceptance`**: bloco "Aceite eletrônico" no fim (nome como assinatura + "Aceito eletronicamente em … (horário de Brasília)"). Aparece na página pública, na interna e vai para o PDF (Sprint 16). Selo "Recusada" no documento recusado.
- **Página interna `/quotes/[id]`:** cartão `QuoteResponseCard` acima do histórico. Na aprovação: nome, e-mail, data e hora, IP e navegador resumido ("Chrome · Windows", texto completo no `title`). Na recusa: data, motivo ou "Nenhum motivo informado.".

## O que foi feito

- Migração acima + teste `memoria/etapas/etapa-22-teste-respostas.sql` (**33/33**), rodado antes do push (transação desfeita, junto com os testes 21 → 10/10 e 19 → 24/24) e depois no remoto.
- `src/lib/validations/quote-response.js` (`approveQuoteSchema`, `declineQuoteSchema`, `emptyApproveForm`, `QUOTE_RESPONSE_LIMITS`), com teste que confere os limites lendo a migração.
- `src/lib/request-meta.js` (`clientIp`, `clientUserAgent`), `src/lib/user-agent.js` (`describeUserAgent`), `formatMoment` em `src/lib/dates.js` ("14 de out. de 2026 às 15:32"). Tudo com testes.
- `src/lib/data/public-quotes.js` (`approveQuote`, `declineQuote`, `responseError`) + `public-quotes.test.js`; `getQuoteResponse` em `data/quotes.js`.
- `src/actions/public-quotes.js`: `approveQuoteAction`, `declineQuoteAction` (com `stale`).
- `src/components/public-quote/`:
  - `public-quote-shell.jsx`: cabeçalho, rodapé e faixa do dono;
  - `quote-response-actions.jsx`, `approve-quote-dialog.jsx`, `decline-quote-dialog.jsx`, `response-summary.jsx`;
  - `public-quote-confirmation.jsx`, `confirmation-page.jsx`: corpo e metadata das 2 páginas;
  - `public-quote-status.jsx`: "Aprovada por X em …"; `IssuerContact` exportado.
- `src/components/quotes/quote-response-card.jsx`; `quote-preview.jsx` (`acceptance`); `quotes/[id]/page.js`.
- Rotas `quote/[publicId]/approved` e `/declined`. Página pública refeita com a moldura e o fechamento.
- `globals.css`: animações `animate-pop`, `animate-halo`, `animate-draw` (path com `pathLength="1"` + `strokeDasharray="1"`).
- Primeiro uso do `checkbox` do shadcn (instalado na etapa 5), ligado ao RHF por `Controller`.

## Verificação

- `npm run lint` ✅ · `npm test` ✅ **611 testes** · `npm run build` ✅ (rotas `/quote/[publicId]/approved` e `/declined`).
- Chrome, dados criados por SQL na conta de teste do usuário (4 propostas enviadas) e apagados no fim:
  - **dono** (`localhost:3000`) no link: faixa do dono, botões desativados, status continua `sent`;
  - **cliente** (`e2e.localhost:3000`, sem login):
    - envio vazio → erros em pt-BR no nome e no aceite, foco no nome;
    - prévia da assinatura acompanha a digitação;
    - e-mail "bruno" → erro ao sair do campo;
    - aprovar → "Aprovando…" com os botões travados → confirmação com o comprovante;
    - banco: `approved` + resposta com e-mail em minúsculas, IP `::1` e navegador; eventos `created → sent → viewed → approved`;
  - página pública aprovada: "Aprovada por … em …", bloco de aceite no documento, sem botões;
  - recusar com motivo (pelo fechamento) → confirmação; dono vê o motivo;
  - **proposta cancelada por trás com a página aberta** → toast + página atualizada para "cancelada", nada gravado;
  - **sem rede** → aviso no diálogo, dados mantidos, nada gravado;
  - `/approved` de proposta recusada → volta para a proposta; id inexistente → 404;
  - Esc fecha o diálogo e o foco volta ao botão;
  - lista do dono com os 4 status.
  - **Celular (iframes de 390 px):** proposta em aberto, diálogo de aprovação (cabe na tela, rola por dentro se faltar espaço) e as 2 confirmações, sem rolagem horizontal, nos temas escuro e claro (tema do navegador devolvido a "dark").
  - Console: só erros da extensão Grammarly.
  - Banco no fim: 1 usuário, 1 cliente, 0 orçamentos/itens/eventos/respostas/contadores.

## Problemas encontrados

1. **Botões quebrando linha no fechamento** (o texto ao lado comprimia a área dos botões): corrigido com `shrink-0` no invólucro.
2. **"Nº 2026-" / "002" quebrando no hífen** na confirmação da recusa (celular): o número fica num `whitespace-nowrap`.
3. **Aviso de hidratação no log do dev** citando `data-new-gr-c-s-check-loaded`/`data-gr-ext-installed` no `<body>`: é a extensão **Grammarly** do navegador do usuário, não o app. Os `removeChild` são o artefato conhecido de trocar o `<body>` por iframes.
4. Capturas de tela com zoom expiraram 2 vezes ("renderer frozen"); repetir resolveu.
5. O log do `next dev` mostra os argumentos das Server Actions (inclusive nome e e-mail do aceite). É recurso só de desenvolvimento do Next 16 e não aparece em produção.
6. Ao parar o `npm run dev`, o `start-server.js` continuou na porta 3000 (já registrado); encerrado pelo PID depois de conferir a linha de comando.
