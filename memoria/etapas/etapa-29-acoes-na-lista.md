# Etapa 29 — Sprint 19 (parte 2): ações contextuais na lista de orçamentos

**Data:** 2026-10-19
**Status:** ✅ Concluída. Com ela o **Sprint 19 (lista de orçamentos) está completo**. A migração foi aplicada no remoto. Dados de teste apagados.

## Decisões

- **"Compartilhar" também na lista (o usuário deixou a escolha comigo, 2026-10-19):** a lista passa a trazer o **e-mail e o telefone do cliente**, para o WhatsApp/e-mail irem direto para ele, como na página do orçamento. Migração `20261019163426_list_quotes_client_contacts.sql` (**aplicada**): `create or replace` da `list_quotes` com a mesma assinatura; só o objeto `client` de cada item ganhou `email` e `phone`. Os contatos **não entram na busca** (só número, título, nome e empresa). São dados do próprio usuário, lidos com o RLS valendo.
- **Menu "⋯" em cada linha/cartão (`QuoteRowActions`)**, com as ações que o status permite — as mesmas da página do orçamento:
  - todos: **Ver orçamento** e **Duplicar como novo rascunho**;
  - rascunho: **Editar**, **Enviar ao cliente** (confirmação com o resumo; aviso se a validade passou; depois do envio o "Compartilhar" abre sozinho) e **Excluir rascunho**;
  - enviado/visualizado: **Compartilhar**, **Copiar link** e **Cancelar proposta**;
  - fora do rascunho: **Abrir página do cliente** (nova aba); com documento público (nem rascunho nem cancelada) e PDF disponível: **Baixar PDF**.
  - Sem "Imprimir" na lista (imprimiria a própria lista).
- **Peças comuns extraídas** para `src/components/quotes/quote-action-dialogs.jsx`: `copyQuoteLink`, `downloadQuotePdf` e `QuoteActionDialogs` (enviar → compartilhar, cancelar, excluir). A `QuoteActions` da página do orçamento e a `QuoteRowActions` da lista usam o mesmo módulo; o comportamento da página não mudou.
- **Foco ao fechar um diálogo** (`returnFocus` do `QuoteActionDialogs`): na lista, volta ao "⋯" da linha; se a linha sumiu (orçamento excluído), vai para o resumo da lista (`#quotes-summary`, `tabIndex=-1`, que também é `aria-live`). Na página, o "Compartilhar" devolve o foco ao botão dele (como antes). `ConfirmActionDialog`/`ConfirmDeleteDialog` passaram a aceitar `onCloseAutoFocus`.
- **Ids únicos do "⋯":** a tabela e os cartões existem ao mesmo tempo (um escondido por CSS), então o botão tem id `quote-row-actions-<id>` na tabela e `quote-card-actions-<id>` no cartão.
- **Depois de enviar/cancelar/excluir, a lista se atualiza sozinha** (as Server Actions já revalidam `/quotes`): status, contagens das abas, avisos de validade e total.
- **Painel → lista:** o cartão "Propostas por situação" ganhou **"Ver na lista de orçamentos →"**, que abre a lista no mesmo período do painel (`quoteListHref`, ex.: `/quotes?periodo=90d`), com as mesmas contagens. Não liguei cada linha de status a uma aba, porque "Enviado" e "Visualizado" caem juntos na aba "Em aberto" e o número não bateria.

## O que foi feito

- Migração + teste `memoria/etapas/etapa-29-teste-contatos.sql` (**5/5**: contatos presentes, null quando não há, fora da busca, outro usuário não vê, anon sem acesso), rodado antes do push (transação desfeita) junto com o da etapa 28 (**14/14**) e de novo no remoto. Advisors sem nada novo.
- `src/components/quotes/quote-action-dialogs.jsx` (novo), `quote-row-actions.jsx` (novo), `quote-actions.jsx` (usa o módulo comum), `quote-list-results.jsx` (coluna de ações na tabela, "⋯" ao lado do selo no cartão, `pdfAvailable`).
- `src/components/shared/confirm-action-dialog.jsx` e `confirm-delete-dialog.jsx` (`onCloseAutoFocus`).
- `src/app/(dashboard)/quotes/(list)/page.js` (`isPdfAvailable()`, resumo focável).
- `src/components/dashboard/status-breakdown.jsx` (`listHref`) e `dashboard/page.js`.
- `src/lib/data/quotes.js` (tipo do item com `email`/`phone`), `quote-list.test.js` (link do painel).

## Verificação

- `npm run lint` ✅ · `npm test` ✅ **790 testes** · `npm run build` ✅.
- Chrome (`localhost:3000`, sessão de teste do usuário, 46 orçamentos de teste + 2 rascunhos extras, criados por SQL e apagados no fim):
  - menus por status: rascunho, enviado, visualizado, aprovado, recusado e cancelado com as ações esperadas; menu com 240 px (o "Duplicar como novo rascunho" quebrava em 2 linhas com 208 px);
  - **Compartilhar** (2026-905): link da proposta, mensagem para "João Ávila", WhatsApp `wa.me/5511987654321` e `mailto:joao@example.com` (conferidos sem clicar); Esc → foco no "⋯" da linha;
  - **Enviar** rascunho pela lista: confirmação com o resumo → aviso "Orçamento enviado" → "Proposta enviada! Agora é só mandar o link." abre sozinho → linha "Enviado", abas Rascunhos 3→2 e Em aberto 5→6; Esc → foco no "⋯" da linha (que mudou de posição);
  - rascunho com validade vencida: a confirmação avisa "A validade já passou. Edite a data antes de enviar.";
  - **Cancelar** (2026-907): "Voltar"/"Cancelar proposta", aviso, linha "Cancelado", dica de validade some, abas atualizadas, foco no "⋯";
  - **Excluir**: Cancelar → foco no "⋯"; confirmar → linha some, aviso "Rascunho excluído", total e aba atualizados, **foco no resumo da lista**;
  - **Copiar link** (área de transferência interceptada) → `/quote/<public_id>` + aviso;
  - **Baixar PDF** (aprovado, download interceptado): "Gerando PDF…" → "PDF da proposta 2026-911 pronto", `Proposta-2026-911.pdf`; rota do PDF respondeu 200;
  - **regressão da página do orçamento**: Compartilhar (foco volta ao botão), menu com as mesmas ações de antes, cancelar → "Voltar" devolve o foco ao "⋯";
  - painel: link "Ver na lista de orçamentos" com o período (`?periodo=90d`; 12 meses → `?periodo=12m`);
  - celular (iframe 390 px): "⋯" ao lado do selo, menu inteiro na tela, sem rolagem lateral;
  - console e log do servidor sem erros.
- **Não testado no navegador:** "Duplicar" pela lista (os orçamentos de teste não têm itens, e o `create_quote` exige ao menos 1; o hook é o mesmo da página, testado na etapa 20).
- **Limpeza:** orçamentos (eventos em cascata), os 3 clientes de teste e o contador; banco com 1 usuário, 1 perfil, 1 cliente e o resto zerado.

## Problemas encontrados

1. **Clique que caiu no menu anterior:** na automação, sem capturas de tela, o menu fechado continua alguns décimos de segundo na tela (animação de saída). Um clique no "⋯" de outra linha acertou o item "Editar" do menu que ainda estava saindo e abriu a edição do 2026-901 (nada foi salvo). Não é bug do app: nos testes, esperar o `[role=menu]` sair do DOM antes do próximo clique.
2. O aviso "Orçamento enviado" não apareceu na 1ª leitura: ele já tinha expirado (a captura de tela demorou). Lido logo depois de confirmar, em outro envio, ele aparece.
3. Foco no `<body>` depois de excluir pela lista (o "⋯" some com a linha): corrigido com o `fallback` para o resumo da lista.
4. A ferramenta `javascript_tool` trocou uma saída por "[BLOCKED: Cookie/query string data]" (texto do botão focado); devolver só o prefixo do id resolveu.
5. O `start-server.js` ficou na porta 3000 ao parar o `npm run dev` (já conhecido; encerrado pelo PID depois de conferir a linha de comando).
