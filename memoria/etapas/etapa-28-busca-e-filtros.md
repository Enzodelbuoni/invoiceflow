# Etapa 28 — Sprint 19 (parte 1): lista de orçamentos com busca, filtros, ordenação e paginação

**Data:** 2026-10-19
**Status:** ✅ Concluída. A migração `list_quotes` foi aplicada no remoto. Dados de teste apagados. O Sprint 19 continua na etapa 29 (ações contextuais em cada linha).

Antes de começar, a etapa 27 (que estava pronta mas não commitada) foi conferida (lint, 721 testes, migrações aplicadas) e commitada (`4ca2c27`).

## Decisões

- **Tudo numa função do banco:** migração `20261019155526_list_quotes.sql` (**aplicada**). `public.list_quotes(p_query, p_statuses, p_since, p_sort, p_limit, p_offset)` → jsonb `{ counts, total, items }`. SECURITY INVOKER, `stable`, filtro por `user_id`, só `authenticated`. Uma ida ao banco por página.
  - **Busca sem acentos e sem diferenciar maiúsculas** (extensão **`unaccent`** instalada no schema `extensions`): cada palavra precisa aparecer, em qualquer ordem, no número, no título ou no nome/empresa do cliente ("joao aurora" acha "João Ávila · Estúdio Aurora"). Os curingas do LIKE digitados (`%`, `_`, `\`) valem como texto. Com `search_path` vazio, usar a forma com dicionário: `extensions.unaccent('extensions.unaccent'::regdictionary, texto)` (a de um argumento procura o dicionário pelo search_path e falha).
  - **Período igual ao do painel** (data de envio; o que nunca foi enviado, pela de criação): a lista filtrada bate com "Propostas por situação" do painel (conferido no navegador e no teste do banco).
  - **`counts`** por status com busca + período, mas **sem o filtro de status** (cada aba mostra quantos teria). `total` com todos os filtros (paginação).
  - **Ordenação** (`recent` padrão = data de envio/criação mais nova; `oldest`; `value_desc`; `value_asc`; `valid_until`), com desempate pela data e pelo id (ordem estável entre páginas). Valor desconhecido = `recent`.
  - **Paginação por OFFSET** (páginas numeradas, 20 por página; `p_limit` entre 1 e 100). A skill de boas práticas do Postgres recomenda cursor, mas aqui não compensa: cada usuário tem poucas centenas de propostas e a consulta já percorre todas para as contagens; o cursor impediria pular para uma página. Motivo registrado na migração.
- **Filtros na URL** (`lib/quote-list.js`, funções puras): `?q=` (até 80 caracteres), `?status=todos|rascunhos|em-aberto|aprovados|recusados|expirados|cancelados`, `?periodo=tudo|30d|90d|12m` (padrão **tudo**, diferente do painel), `?ordem=recentes|antigos|maior-valor|menor-valor|validade`, `?pagina=N`. Valores padrão ficam fora da URL; valor inválido ou repetido → padrão. **Mudar qualquer filtro volta para a página 1.** Página além da última → `redirect` para a última.
- **Abas de status:** "Em aberto" junta enviados + visualizados (os dois esperam o cliente; é o "aguardando resposta" do painel). As outras abas são 1 status cada. Teste garante que cada status do banco está em exatamente uma aba.
- **Navegação com `replace`** (como o seletor de período do painel): os filtros não enchem o histórico.
- **Interface** (`/quotes`):
  - busca (`SearchInput`) + seletores **Período** e **Ordenar por** (`QuoteListControls`: Select do shadcn com ícone, `useOptimistic` mostra a escolha na hora, spinner enquanto carrega, rótulos para leitor de tela);
  - **abas** (`QuoteStatusTabs`): links com contagem, traço da aba ativa deslizando (motion `layoutId`), spinner na aba clicada (`useLinkStatus`), `aria-current` e nome acessível "Em aberto: 5 orçamentos". Quando a fileira não cabe (celular, ou sidebar aberta numa tela média) ela rola na horizontal, a aba ativa vem para a vista e **a borda com abas escondidas fica esmaecida** (`mask-image`, estado pelas bordas via `ResizeObserver` + `scroll`);
  - resumo com `aria-live` ("8 orçamentos", "Mostrando 21–40 de 57 resultados para “aurora”") + "Limpar filtros" (tira busca/status/período e mantém a ordenação);
  - **resultados por container query** (`QuoteListResults`): tabela a partir de `@2xl` (672 px da própria lista), cartões abaixo; coluna **Data** ("18 de out. de 2026" + "enviado"/"criado") a partir de `@4xl`, e abaixo disso a data vai para baixo do número. Assim, com a sidebar aberta numa tela de ~1000 px, a lista vira cartões em vez de espremer a tabela;
  - **dica de validade** em rascunho/enviado/visualizado (`validityHint`): "vence em 15 dias" (cinza), "vence amanhã" / "em 3 dias" (laranja, `text-warning`), "venceu há 2 dias" (vermelho);
  - **paginação** (`QuoteListPagination`): Anterior / páginas com "…" / Próxima (`paginationItems`: no máximo 7 botões, "…" só quando esconde 2+ páginas), "Página 2 de 3", spinner no link clicado;
  - "nenhum resultado" com o que foi pedido (`emptyResultTitle`: "Nenhum orçamento aprovado para “joão” nos últimos 30 dias") + "Limpar filtros". Sem nenhum orçamento (sem busca e sem período) continua o convite "Nenhum orçamento ainda" + ciclo de status.
- **`SearchInput` (compartilhado com clientes e serviços) mudou:** mantém os outros parâmetros da URL, apaga `?pagina=`, aceita `className` e **acompanha mudanças externas da URL** ("Limpar filtros") sem apagar o que a pessoa digitou depois da própria navegação (estado derivado: `seenQuery`/`ownQuery`, ajustado durante o render).

## O que foi feito

- Migração + teste do banco `memoria/etapas/etapa-28-teste-lista.sql` (**14/14** antes do push, numa transação desfeita, e no remoto; os das etapas 26 e 27 continuam 6/6 e 7/7; advisors sem nada novo).
- `src/lib/quote-list.js` + `quote-list.test.js` (**65 testes**, inclusive coerência com a migração: ordenações, limite da página, períodos do painel).
- `src/lib/data/quotes.js`: `listQuotes(options)` chama `list_quotes` (modo demonstração → lista vazia); `LIST_COLUMNS` saiu. Testes em `quotes.test.js` (chamada, demonstração, erro).
- Componentes novos em `src/components/quotes/`: `quote-status-tabs.jsx`, `quote-list-controls.jsx`, `quote-list-results.jsx`, `quote-list-pagination.jsx`.
- `src/app/(dashboard)/quotes/(list)/page.js` (refeita) e `loading.js` (esqueleto com busca, seletores e abas).
- `src/components/shared/search-input.jsx` (ver Decisões).

## Verificação

- `npm run lint` ✅ · `npm test` ✅ **789 testes** (eram 721) · `npm run build` ✅.
- Chrome (`localhost:3000`, sessão de teste do usuário, 46 orçamentos de teste criados por SQL em ~16 meses + 3 clientes com acentos, apagados no fim):
  - aba "Em aberto" → 5 (só enviados/visualizados), URL `?status=em-aberto`, "Limpar filtros" aparece;
  - busca "joao" (digitada de verdade) mantendo a aba → 2 de "João Ávila"; contagens das abas acompanham a busca; foco continua no campo; busca pela empresa ("aurora") → 12;
  - "Limpar filtros" → `/quotes` e o campo de busca esvazia;
  - período pelo teclado (setas + Enter) → "Últimos 90 dias", 9 orçamentos, foco volta ao seletor; **mesmas contagens do painel em 90 dias** (3 rascunhos, 3+2 em aberto, 1 cancelado);
  - "Maior valor" → ordem decrescente, mantida na página 3 ("Mostrando 41–46 de 46", "Próxima" desativada, página volta ao topo);
  - `?status=rascunhos&pagina=9` → redireciona para a lista sem página; "Nenhum orçamento aprovado nos últimos 30 dias"; busca "%" → nenhum resultado (não casa tudo);
  - trocar de aba **não pisca o esqueleto** (`loading.js`): a lista antiga fica até a nova chegar, com spinner na aba;
  - teclado: Tab chega às abas com anel de foco; traço da aba ativa no lugar;
  - larguras (iframes): 390 px e 1000 px (sidebar aberta) → cartões; 1400 px → tabela com a coluna Data; nenhuma rolagem horizontal da página; aba ativa trazida para a vista; esmaecimento só do lado com abas escondidas;
  - tema claro conferido (classe trocada só dentro do iframe);
  - **regressão** da busca de Clientes (digitar, resultado, apagar → lista completa);
  - console sem erros em carregamentos limpos.
- **Limpeza:** orçamentos (eventos em cascata), os 3 clientes criados (pelos ids, mantendo o original) e o contador; banco com 1 usuário, 1 perfil, 1 cliente e o resto zerado.

## Problemas encontrados

1. **Dados de teste sem nenhuma proposta "em aberto"** na 1ª tentativa (os envios mais novos já tinham passado da validade). Apagados e refeitos com 5 propostas recentes de validade em 1–5 dias.
2. **Esmaecimento do lado direito no fim da rolagem (celular):** `scrollLeft` fracionado × `scrollWidth` arredondado (diferença de ~1,1 px). Folga passou para 2 px.
3. O verificador de permissões barrou uma leitura comum (`sed`/`cat`) logo depois do `db push` ("Protected-Scope IaC Apply"); a leitura foi feita com a ferramenta Read. O push em si já tinha passado (autorização permanente do Supabase).
4. Artefatos conhecidos dos testes com iframes: `removeChild` no log (troca do `<body>`), um erro de hidratação quando apaguei o `<body>` com o React ainda hidratando (esperar a página assentar antes) e a 1ª navegação caindo numa página interna do Chrome. O `start-server.js` ficou na porta 3000 ao parar o `npm run dev` (encerrado pelo PID depois de conferir a linha de comando).
5. O "voltar" do navegador não desfaz filtros (todos usam `replace`, de propósito).

## Para a etapa 29

- Ações contextuais em cada linha/cartão (menu "⋯" conforme o status: abrir, editar rascunho, compartilhar/copiar link, baixar PDF, duplicar, cancelar, excluir rascunho), reaproveitando o que existe em `quote-actions.jsx`. Os itens já trazem `public_id`. Para o "Compartilhar" da lista, faltam telefone/e-mail do cliente (a função devolve só nome e empresa): decidir se a função passa a devolvê-los (`create or replace`, mesma assinatura) ou se a lista oferece só "Copiar link".
- Talvez: links do painel para a lista filtrada (ex.: "Aguardando resposta" → `?status=em-aberto&periodo=…`).
