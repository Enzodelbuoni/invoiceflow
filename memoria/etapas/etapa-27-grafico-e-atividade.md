# Etapa 27 — Sprint 18 (parte 2): gráfico "enviadas e aprovadas" + atividade recente

**Data:** 2026-10-15
**Status:** ✅ Concluída. Com ela o **Sprint 18 (Dashboard) está completo**. A migração `quote_sends_by_day` foi aplicada no remoto. Dados de teste apagados.

## Parte A — gráfico

### Decisões

- **Skill `dataviz` seguida passo a passo** (forma → cor → validação → marcas → interação → acessibilidade → olhar o resultado).
- **Forma:** colunas empilhadas por intervalo. Altura = propostas **enviadas**; a parte de baixo = as **aprovadas** delas; em cima, as "demais enviadas" (aguardando, recusadas, expiradas). É o medidor da conversão repetido no tempo.
- **O seletor de período vale para o gráfico** (regra da skill: o filtro escopa tudo abaixo dele). Unidade: **30 e 90 dias → por semana** (segunda a domingo); **12 meses → por mês**; **"Tudo" → por mês**, ou **por ano** se passar de 24 meses (`MAX_MONTH_BUCKETS`). O 1º e o último intervalo podem ser parciais (o período é móvel): o tooltip e a tabela dizem "Parcial: 15 a 31 de out.".
- **Cada proposta conta no intervalo do ENVIO** (no fuso de SP), mesmo aprovada depois: das enviadas em cada mês, quantas foram aprovadas (a mesma conta da taxa de conversão). Canceladas fora. Assim **a soma das colunas = os indicadores** (conferido: 35 enviadas, 16 aprovadas, R$ 66.250,00 em 12 meses).
- **Banco:** migração `20261015173400_quote_sends_by_day.sql` (**aplicada**): `public.quote_sends_by_day(p_since)` → uma linha por dia com envio (`day, reached, approved, reached_value_cents, approved_value_cents`). SECURITY INVOKER, `stable`, filtro por `user_id`, só `authenticated`. O agrupamento em semanas/meses/anos e o preenchimento dos intervalos vazios ficam no app (puro e testado). Teste `memoria/etapas/etapa-27-teste-serie.sql`: **7/7** antes do push (transação desfeita) e no remoto; o da etapa 26 continua 6/6; advisors sem nada novo.
- **Cores (validadas com `validate_palette.js` da skill, nos dois temas, contra o cartão real):** um matiz só (índigo 268). Tokens `--viz-approved` / `--viz-reached` (classes `bg-viz-approved` / `bg-viz-reached`):
  - claro: `oklch(0.511 0.23 268)` (= `--primary`, #324fe7) / `oklch(0.75 0.115 268)` (#8fabf7) contra #ffffff;
  - escuro (passos próprios): `oklch(0.66 0.16 268)` (#688bf3) / `oklch(0.5 0.14 268)` (#415cb2) contra #16181d.
  - Passam como rampa ordinal e como par categórico (ΔE normal 26,6/16,1; daltonismo 23,5/16,0). A cor clara fica abaixo de 3:1 (2,25 / 2,87) → **obrigatório** ter alternativa: legenda + tooltip + **visão em tabela**.
  - Primeira tentativa reprovada: croma 0,10 "lê como cinza" e, no escuro, L 0,42 fora da faixa.
- **Marcas:** coluna até 24 px (`w-3/5 max-w-6`), ponta de cima arredondada 4 px e base reta, **2 px de superfície entre as partes** (fundo `bg-card` opaco na coluna, para a grade não atravessar, nem nas colunas esmaecidas), grade em linhas finas sólidas, eixo com números redondos (`niceTicks`), entrada animada de baixo para cima (motion, com atraso escalonado; respeita "movimento reduzido").
- **Interação:** o alvo é a faixa inteira do intervalo (lavagem de fundo + as outras colunas esmaecidas). Tooltip com o valor na frente do nome (chave em traço), aprovadas/demais com valores, "N enviadas · X% de conversão". **Posição medida antes de pintar** (`placeTooltip`, `useLayoutEffect`): ao lado da coluna, do lado com mais espaço; se não couber (celular), acima do gráfico, dentro das bordas. **Teclado:** só uma coluna entra no Tab (a mais recente), setas/Home/End andam, o foco mostra o mesmo tooltip; cada coluna tem `aria-label` com tudo ("Março de 2026: 5 enviadas, 2 aprovadas, 40% de conversão."). **Toque:** o tooltip fica até tocar fora (foco); o `pointerleave` do toque é ignorado.
- **Rótulos do eixo no celular:** acima de 8 intervalos, um sim, um não (`narrowLabelMask`, por container query `@max-xl:invisible`); os que trazem o ano ("out. 2025", "jan. 2026") nunca somem.
- **Visão em tabela** (botões "Gráfico"/"Tabela" com `aria-pressed`): intervalo (com "Parcial"), enviadas, aprovadas, conversão, valor aprovado e linha de total.
- **Sem envio no período:** o quadro continua (grade + eixo + meses) com "Nenhuma proposta enviada nos últimos 12 meses." e sem o botão de tabela; em "Tudo" sem nenhum envio, só a frase.
- Mantida a Instrument Serif nos números de destaque (padrão do projeto; a skill recomenda sem serifa — já registrado na etapa 26).

## Parte B — atividade recente

### Decisões

- **Não segue o seletor de período (combinado com o usuário em 2026-10-15):** mostra sempre os **6 últimos acontecimentos** (`RECENT_ACTIVITY_LIMIT`), e o subtítulo diz "Os últimos acontecimentos, de qualquer período".
- **O que entra** (`ACTIVITY_EVENT_TYPES` + `isActivityEvent` em `lib/quote-events.js`): enviada, visualizada, aprovada, recusada, expirada, cancelada e **PDF baixado pelo cliente**. Ficam de fora criar, salvar e o download do próprio dono (é o que a pessoa acabou de fazer, e encheria a lista).
- **Sem migração:** consulta em `quote_events` com o RLS valendo e o índice `(user_id, created_at desc)` que já existia; embed `quote:quotes(id, quote_number, title, client:clients(name))`; filtro do download do cliente no PostgREST (`.or("type.neq.downloaded,metadata->>by.eq.client")`) e de novo no app (`toActivityItems`).
- **Item:** selo do evento (cor do status, o mesmo do histórico) + rótulo + quando ("ontem às 19:43", `formatMomentRelative`) + "2026-003 · título · cliente". O item inteiro é um link para a proposta (link "esticado"; anel de foco no item todo via `has-[a:focus-visible]`); o nome acessível do link inclui número, título e cliente. Rodapé "Ver todas as propostas →".
- **Selo do evento extraído para `components/quotes/quote-event-icon.jsx` (`QuoteEventIcon`)**, usado pelo histórico do orçamento (`QuoteTimeline`) e pela atividade recente.
- **Layout:** "Propostas por situação" e "Atividade recente" lado a lado no `lg` (mesma altura), empilhados no celular.
- **Vazio:** "Nada por aqui ainda. Quando você enviar uma proposta, o que acontecer com ela aparece aqui."

## O que foi feito

- Migração + teste do banco (parte A).
- `src/lib/dashboard-series.js` (+ `dashboard-series.test.js`, 37 testes): `bucketStart`, `nextBucketStart`, `seriesUnit`, `formatDayRange`, `buildSendSeries` (intervalos, zeros, parciais, rótulos, totais), `narrowLabelMask`, `niceTicks`, `SERIES_UNIT_LABELS`, `MAX_MONTH_BUCKETS`.
- `src/lib/quote-events.js`: `ACTIVITY_EVENT_TYPES`, `RECENT_ACTIVITY_LIMIT`, `isActivityEvent`, `toActivityItems` (+ 4 testes).
- `src/lib/data/dashboard.js`: `getSendSeries(since)` e `listRecentActivity()`.
- `src/components/dashboard/sends-chart.jsx` (`SendsChart`, cliente), `src/components/dashboard/recent-activity.jsx` (`RecentActivity`, servidor), `src/components/quotes/quote-event-icon.jsx` (`QuoteEventIcon`); `quote-timeline.jsx` passou a usá-lo.
- `globals.css`: tokens `--viz-approved`/`--viz-reached` (claro e escuro) + `--color-viz-*` no `@theme inline`.
- `dashboard/page.js`: números, série e atividade em paralelo (mesmo `now` para período e série); gráfico entre os indicadores e a linha "situação | atividade".

## Verificação

- `npm run lint` ✅ · `npm test` ✅ **721 testes** (eram 680) · `npm run build` ✅.
- Chrome (`localhost:3000`, sessão de teste do usuário, dados de teste por SQL):
  - **gráfico, 12 meses:** 13 meses (out./2025 parcial "15 a 31 de out." … out./2026 parcial), números de cada mês iguais à consulta no banco; totais = indicadores;
  - **90 dias:** 14 semanas ("13/7" … "12/10"), 9 enviadas e 4 aprovadas = 44,4% (igual à conversão); **30 dias:** 5 semanas, a 1ª e a última parciais; **Tudo:** 14 meses, a partir do 1º envio (set./2025, parcial), 41 enviadas;
  - hover (lavagem, esmaecimento, tooltip ao lado), teclado (Tab, setas, Home, anel de foco), tabela (13 linhas + total), temas escuro e claro;
  - celular (iframe 390 px): sem rolagem lateral, rótulos alternados com os anos mantidos; tooltip dentro das bordas nas 13 colunas (medido); desktop: tooltip ao lado, sem cobrir a coluna, nas 13 (medido);
  - **atividade:** os 6 itens iguais à consulta no banco e na mesma ordem; o "PDF baixado por você" e a "Alterações salvas" (mais recentes que todos, de propósito) **não** apareceram; links para a proposta; foco por teclado com anel no item; tema claro; celular empilhado e sem rolagem lateral;
  - **estados vazios** (só 2 rascunhos na conta): gráfico com o quadro e "Nenhuma proposta enviada nos últimos 12 meses.", sem o botão de tabela; atividade com "Nada por aqui ainda…"; sem nenhuma proposta: só o convite "Sua primeira proposta começa aqui";
  - console sem erros. Tema do navegador devolvido a "sem tema salvo" (sistema).
- **Limpeza:** os 44 orçamentos de teste (com os eventos) e o contador foram apagados; banco com 1 usuário, 1 perfil, 1 cliente e 0 serviços/orçamentos/itens/eventos/respostas/contadores.
- **Não testado no navegador:** o histórico da página do orçamento depois da troca para `QuoteEventIcon` (troca mecânica; lint e build ok).

## Problemas encontrados

1. **Folga entre as partes transparente:** a linha de grade aparecia atravessando as colunas quando coincidia com a divisão. Corrigido com o fundo `bg-card` na coluna e a opacidade do esmaecimento só nas partes coloridas.
2. **Tooltip cortado no celular** nas colunas do meio (ia até 448 px numa tela de 390): passou a ser posicionado por medição (ver Decisões).
3. Na verificação automática, `[role=group]` pegou primeiro o grupo "Gráfico/Tabela" (alarme falso); e o tooltip "colado" 2 px no gráfico era a animação de entrada parada no 1º quadro (a automação só desenha quadros com captura de tela). Não eram bugs.
4. Capturas de tela expiraram várias vezes ("renderer frozen"); repetir ou capturar sem zoom resolveu.
5. Numa consulta de limpeza com `delete` dentro de CTE, o `select` da mesma instrução ainda via as linhas apagadas (regra do Postgres: a consulta principal enxerga o estado de antes). Conferir sempre numa consulta separada.
6. O `localStorage.theme` voltou como `"system"` depois dos testes com iframes; foi removido de novo (o padrão do app já é "sistema").
7. Ao parar o `npm run dev`, o `start-server.js` ficou na porta 3000 (já conhecido; encerrado pelo PID depois de conferir a linha de comando).

## Como foram feitos os dados de teste (para repetir)

Inseridos direto como dono do banco (as guardas não deixam mudar `sent_at`/`created_at` por UPDATE), na conta de teste do usuário, só depois de conferir que ela não tinha orçamentos: 41 enviados de set./2025 a out./2026 (status pela idade), 2 rascunhos e 1 cancelada; e eventos coerentes (`sent` no envio, `viewed` 6 h depois, `approved`/`declined` nas datas, `downloaded` do cliente 1 h depois da aprovação, `expired` no dia seguinte à validade), mais um download do dono e uma edição recentes para provar que ficam de fora. Limpeza: `delete from public.quotes where user_id = …` (eventos vão em cascata) + o contador.
