# Etapa 35 — Sprint 21 (parte 4): esqueletos de carregamento que faltavam

**Data:** 2026-10-20
**Status:** ✅ Concluída. Com ela o **Sprint 21 (estados de UX) está completo**. Sem migração. Dados de teste apagados.

## Decisões

- **Novos `loading.js`** (cada um imita o desenho da página, para o conteúdo entrar no lugar sem "pulo"):
  - **`/dashboard`** — cabeçalho, seletor de período, conversão + 4 indicadores, gráfico (colunas com alturas fixas), "situação" e "atividade";
  - **`/quotes/[id]`** — cabeçalho com status e ações, o documento na "mesa" com **papel claro** (`theme-paper`, faixa da marca, cabeçalho, título, cartões, itens, totais) e o histórico;
  - **`/clients/[id]`** — voltar, avatar + nome + botões, contato (2 colunas), observações, orçamentos;
  - **`/clients/[id]/edit`** e **`/services/[id]/edit`** — cabeçalho + o formulário em seções (`FormSkeleton`).
- **Grupos de rotas para isolar o esqueleto:** um `loading.js` em `clients/[id]/` ou `quotes/[id]/` envolveria também a **edição** (o Next pré-carrega até o primeiro `loading.js` do caminho: indo da lista direto para "Editar", apareceria o esqueleto do detalhe/documento e depois o formulário). As páginas foram movidas para **`clients/[id]/(detail)/`** e **`quotes/[id]/(document)/`** (mesmo padrão do `(list)/` das listas; a URL não muda; os `not-found.js` continuam em `[id]/`). Medido: lista → edição mostra só o esqueleto do construtor/formulário.
- **Sem esqueleto de propósito:**
  - **página pública `/quote/[publicId]`**: com `loading.js`, o `notFound()` passa a responder **HTTP 200** (+ `noindex`), porque o cabeçalho já saiu quando o esqueleto começa a ser transmitido (doc do Next, "Status Codes"). Na página que o cliente abre por link (carregamento completo, com o indicador do próprio navegador), o 404 de verdade vale mais. Nas páginas privadas isso não importa (atrás do login, sem indexação);
  - **`/settings`**, **`/clients/new`**, **`/services/new`**: não buscam nada no banco.
- **Peças comuns** em `components/shared/page-skeletons.jsx`: `LoadingRegion` (`aria-busy` + **"Carregando…" num `role="status"`** para leitores de tela — antes os esqueletos tinham só `aria-label` num `div` sem papel, que não é anunciado), `PageHeaderSkeleton` (sobrelinha, título, descrição, botões) e `FormSkeleton` (seções do `FormSection`: "half", "full", "area", "box"; rodapé empilhado no celular). **Os 5 esqueletos antigos** (listas e construtor) passaram a usar a `LoadingRegion`.
- Trocar filtros na mesma página (período do painel, abas da lista) **não** mostra o esqueleto: a navegação é uma transição e o conteúdo antigo fica até o novo chegar (medido no painel).

## O que foi feito

- Novos: `components/shared/page-skeletons.jsx`; `loading.js` em `dashboard/`, `quotes/[id]/(document)/`, `clients/[id]/(detail)/`, `clients/[id]/edit/`, `services/[id]/edit/`.
- Movidos (`git mv`, conteúdo igual): `clients/[id]/page.js` → `(detail)/page.js`; `quotes/[id]/page.js` → `(document)/page.js`.
- `LoadingRegion` nos esqueletos de `clients/(list)`, `services/(list)`, `quotes/(list)` e `quotes/new` (a edição do orçamento reexporta o de `new`).

## Verificação

- `npm run lint` ✅ · `npm test` ✅ 814 · `npm run build` ✅ (rotas iguais).
- Chrome (`localhost:3000`, sessão de teste do usuário, dados do script da etapa 32 criados por SQL e apagados no fim pelos ids), com um **atraso temporário de 8 s ligado por cookie** (`atraso_teste`) nas 6 páginas — **removido depois** (as páginas só mudaram de pasta, 0 linhas alteradas):
  - menu → Dashboard: esqueleto do painel, fiel ao desenho real;
  - lista → orçamento: esqueleto com o papel claro (conferido assentado; a 1ª foto pegou a animação de entrada);
  - **lista → edição do orçamento** (`window.next.router.push`, observando o `role=status`): só "Carregando o construtor de orçamentos…";
  - lista de clientes → cliente: esqueleto do detalhe; **lista → edição do cliente**: esqueleto do formulário (nunca o do detalhe);
  - lista de serviços → edição: formulário com o botão "Excluir" e a prévia do item;
  - período do painel (90 dias): sem esqueleto, números antigos até os novos;
  - celular (360 px, páginas carregando em iframes): nada passa da borda nos 4 esqueletos;
  - depois de tirar o atraso: cliente, orçamento e os dois "não encontrado" continuam funcionando; console sem erros.
- **Não conferido visualmente:** tema claro (o next-themes recoloca o escuro ao recarregar o iframe); os esqueletos usam os mesmos tokens (`bg-muted`, `bg-card`, `border`) dos que já existiam.

## Problemas encontrados

1. A extensão do Chrome desconectou uma vez no meio dos testes; reconectou sozinha na chamada seguinte.
2. Capturas de tela demoram alguns segundos: com um atraso curto (4 s), a foto pegava o conteúdo real entrando. Atraso de 8 s + espera de ~2 s antes da foto resolveu.
3. O de sempre: `start-server.js` na porta 3000 depois de parar o `npm run dev` (encerrado pelo PID depois de conferir a linha de comando).
