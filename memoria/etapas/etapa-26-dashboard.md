# Etapa 26 — Sprint 18 (parte 1): dashboard com números reais

**Data:** 2026-10-14 (interrompida pelo usuário) e 2026-10-15 (concluída)
**Status:** ✅ Concluída. A migração foi aplicada no Supabase remoto em 2026-10-14. O Sprint 18 continua na etapa 27 (gráfico mensal + atividade recente).

## Decisões

- **Definição de "enviadas" (combinada com o usuário em 2026-10-14):** propostas que chegaram ao cliente: `sent`, `viewed`, `approved`, `declined`, `expired`. **As canceladas ficam de fora**, para uma proposta tirada do ar por engano não derrubar a taxa. **Conversão = aprovadas ÷ enviadas**; sem enviadas → "—" (não 0%).
- **Período** (`?periodo=30d|90d|12m|tudo`, padrão **12m**): conta pela **data de envio** e, para o que nunca foi enviado (rascunho, cancelado antes de enviar), pela de criação. Fica na URL (dá para recarregar e compartilhar) e a página é renderizada no servidor.
- **Conta no banco:** migração `20261014174550_quote_dashboard.sql` (**aplicada**). `public.quote_dashboard(p_since timestamptz default null)` → jsonb `{ total, by_status{7 status}, reached, reached_value_cents, approved_value_cents, open_value_cents }`.
  - SECURITY INVOKER (o RLS vale), `stable`, filtro explícito por `user_id`.
  - Executável só por `authenticated`; advisors sem nada novo.
  - Teste `memoria/etapas/etapa-26-teste-dashboard.sql`: **6/6** antes do push (transação desfeita) e no remoto.
- **Métricas derivadas no app** (`src/lib/dashboard.js`, testadas): `dashboardMetrics` (conversão, em aberto = enviadas + visualizadas, ticket médio = valor aprovado ÷ aprovadas em centavos inteiros), `DASHBOARD_PERIODS`, `parsePeriod`, `periodSince`, `describePeriod` ("nos últimos 90 dias" / "desde o início"), `countLabel` ("1 proposta" / "3 propostas").
- **Valores grandes:** `formatCurrencyCompact` em `money.js`: exato até R$ 999.999,99 e compacto a partir de R$ 1 milhão ("R$ 1,2 mi"). O `KpiTile` põe o valor exato no `title` e no texto para leitor de tela. O Intl usa espaço não separável (U+00A0) entre "R$", o número e "mi".
- **Skill `dataviz` carregada** antes dos KPIs. A skill recomenda números de destaque em fonte sem serifa; **mantive o padrão do projeto (Instrument Serif)**, aprovado pelo usuário na etapa 4.
- **Tela** (`src/app/(dashboard)/dashboard/page.js`, refeita):
  - cabeçalho e "Novo orçamento";
  - **seletor de período** (`components/dashboard/period-filter.jsx`: links com `aria-current`, `replace`, `scroll={false}`, spinner na opção clicada via `useLinkStatus`) + nota "Pela data de envio (rascunhos, pela de criação)";
  - **destaque da conversão** (`conversion-card.jsx`): número grande, **medidor** (trilho da mesma cor, mais claro; com 0% fica um traço no início) e a frase "3 propostas aprovadas de 8 enviadas nos últimos 12 meses";
  - **4 indicadores** (`kpi-tile.jsx`): valor aprovado, valor enviado, aguardando resposta (quantidade + valor em aberto) e ticket médio;
  - **propostas por situação** (`status-breakdown.jsx`): selo do status + barra proporcional + "2 · 18,2%". A identidade vem do selo com ícone e nome; a cor só reforça.
  - **Sem nenhuma proposta** (mesmo em "Tudo") → o `EmptyState` "Sua primeira proposta começa aqui" (sem o seletor de período). Com o período vazio mas outras propostas → os números zerados/"—" com a frase explicando.
  - Camada de dados: `src/lib/data/dashboard.js` (`getDashboard(since)`; modo demonstração → null → estado vazio).

## Verificação

- `npm run lint` ✅ · `npm test` ✅ **680 testes** (eram 656) · `npm run build` ✅.
- **Chrome** (`localhost:3000`, sessão de teste do usuário, com 11 orçamentos criados por SQL):
  - **12 meses:** 37,5%, R$ 26.761,00 aprovado, R$ 48.761,00 enviado, 3 aguardando (R$ 12.000,00), ticket R$ 8.920,33, 11 propostas por situação. Tudo bate com a conta à mão;
  - **90 dias** e **30 dias:** 42,9%, 7 enviadas, R$ 45.761,00, expirada (enviada há 120 dias) fora, 10 propostas;
  - **Tudo** (pelo seletor, navegação no cliente, `aria-current` na opção): igual a 12 meses (8 enviadas, 11 propostas);
  - **período vazio com outras propostas** (só a expirada antiga, em "30 dias"): "—" na conversão e no ticket, R$ 0,00, frase "Nenhuma proposta enviada nos últimos 30 dias…", selos com 0 · 0%;
  - **0%** ("Tudo", 1 enviada e 0 aprovadas): "0%" e o traço no início do medidor;
  - **estado vazio** (sem nenhuma proposta, em `/dashboard` e `?periodo=90d`): o convite "Sua primeira proposta começa aqui", sem o seletor;
  - temas **claro e escuro** (tema do navegador devolvido a "sistema", sem chave `theme` no localStorage);
  - **celular** (iframes de 390 px, "Tudo" e "30 dias"): sem rolagem horizontal, indicadores em 2 colunas com os valores cabendo;
  - console sem erros; log do `next dev` sem erros.
- **Limpeza (2026-10-15):** os 11 orçamentos de teste e o contador foram apagados; banco com 1 usuário, 1 perfil, 1 cliente e 0 serviços/orçamentos/itens/eventos/respostas/contadores. A pasta `.tmp/` foi apagada.

## Problemas encontrados

- Nenhum bug. O de sempre: a 1ª navegação depois de subir o servidor caiu numa página interna do Chrome (navegar de novo resolveu) e, ao parar o `npm run dev`, o `start-server.js` ficou na porta 3000 (encerrado pelo PID depois de conferir a linha de comando).
- Para a etapa 27: o seed usado aqui criava tudo "hoje" (menos a expirada). O gráfico mensal vai precisar de dados espalhados pelos meses. Como `sent_at`/`created_at` não mudam por UPDATE (guardas), o seed terá que inserir direto, como dono do banco, numa transação, e apagar no fim pelos ids.

## Arquivos

```
supabase/migrations/20261014174550_quote_dashboard.sql   (aplicada no remoto)
memoria/etapas/etapa-26-teste-dashboard.sql
src/lib/dashboard.js + dashboard.test.js
src/lib/money.js + money.test.js                          (formatCurrencyCompact)
src/lib/data/dashboard.js
src/components/dashboard/{period-filter,conversion-card,kpi-tile,status-breakdown}.jsx
src/app/(dashboard)/dashboard/page.js                     (refeita)
```
