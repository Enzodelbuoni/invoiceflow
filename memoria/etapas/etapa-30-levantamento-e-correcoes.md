# Etapa 30 — Sprint 20 (parte 1): levantamento de responsividade + correções de layout e toque

**Data:** 2026-10-19
**Status:** ✅ Concluída. O construtor (barra fixa com total e "Salvar", grade por container query, alvos de toque) fica para a etapa 31.

## Levantamento

- **Dados com textos longos de propósito** (nome, empresa, e-mail, título e itens longos; 12 orçamentos em vários status, 1 aprovado e 1 recusado), criados pelas funções do app na conta de teste: `memoria/etapas/etapa-30-dados-de-teste.sql` (com a receita de limpeza). Apagados no fim.
- **Medição automática** no Chrome: cada página carregada em iframes de **360, 390, 768, 1024, 1280 e 1440 px**, com um script que mede:
  - rolagem horizontal da página e do painel;
  - elementos que passam da borda da tela (inclusive os **escondidos pelo painel**, que corta o que transborda: assim o corte não aparece como rolagem, o conteúdo some);
  - áreas que rolam de lado por dentro (tabelas);
  - no celular: alvos de toque com menos de 32 px e campos com fonte abaixo de 16 px (o iPhone dá zoom ao focar).
- **Páginas:** painel, orçamentos (lista, novo, edição, página interna em 3 status), clientes (lista, novo, detalhe, edição), serviços (lista, novo, edição), configurações, landing, login, cadastro, recuperação/redefinição de senha e a página pública (aberta, aprovada, confirmações de aprovação e recusa, como visitante em `e2e.localhost`).
- **Conferência visual** por capturas em várias larguras (página pública, construtor, página do orçamento, painel, tabelas, menu lateral do celular).

### O que estava quebrado

1. **Painel no celular:** "Propostas por situação" e "Atividade recente" com 885 px numa tela de 375 → **cortados**. Em 768–1024 px (sidebar aberta), rolagem lateral do painel. Causa: grade sem colunas definidas (`grid lg:grid-cols-2`): a coluna única implícita é `auto` e cresce até o texto mais longo (os itens da atividade não quebram linha).
2. **Detalhe do cliente no celular:** cartões 96 px além da tela, pelo e-mail longo (`break-words` quebra a linha, mas não deixa a coluna da grade encolher).
3. **Tabela de orçamentos:** rolava de lado em 1024 e até em 1280 px (precisava de ~1.085 px). Numa tabela automática, `truncate`/`max-w` na célula não limitam a coluna.
4. **Tabela de clientes:** rolava de lado até 1280 px (1.019 px). Mesma causa.
5. **Cabeçalho das páginas** em ~768 px com a sidebar: título espremido ao lado dos botões ("Orçamento / 2026- / 002").
6. **Toque no celular:** botões do cabeçalho (menu e tema) e "⋯" dos cartões com 28 px, itens do menu lateral com 32, "Gráfico/Tabela" com 24, links de rodapé do painel e "← Clientes"/"WhatsApp" com 16–20 px.

### Sem problemas

Página pública (aberta, aprovada) e confirmações, login/cadastro/recuperação, formulários de cliente e serviço, lista de serviços (já tinha layout fixo), configurações, lista de orçamentos no celular e a página interna do orçamento (fora o cabeçalho). **Nenhum campo com fonte abaixo de 16 px no celular.**

## Correções

- **Grades:** `grid-cols-1` (= `minmax(0, 1fr)`) nas grades do painel e do detalhe do cliente. **Regra:** grade que vira colunas só num breakpoint precisa de `grid-cols-1` no celular quando tem texto que não quebra.
- **Detalhe do cliente:** `wrap-anywhere` (Tailwind 4.3) nos valores (e-mail, endereço); cabeçalho do cliente com o mesmo princípio do `PageHeader`.
- **`PageHeader`** (todas as páginas): `flex-wrap` + título com base de 22rem (`flex-[1_1_22rem]`): os botões ficam ao lado quando cabem e descem quando não, conforme a largura real (não a da tela).
- **Tabelas com layout fixo (`table-fixed`)** e larguras nas colunas estreitas; a principal fica com o resto e os textos longos ganham reticências:
  - orçamentos: Cliente 24%, Status 8rem, Data 9rem, Validade 9rem, Total 8rem, ações 3rem; **tabela a partir de `@3xl`** (768 px da própria lista; antes `@2xl`) e coluna **Data a partir de `@5xl`** (antes `@4xl`); abaixo disso a data vai sob o número, **sem o ano quando é o ano corrente** (`formatShortDateCompact` em `lib/format.js`, testado: "criado em 19 de out.");
  - clientes: **troca tabela ↔ cartões por container query** (`@3xl`, antes `md` da tela), Contato 32%, CPF/CNPJ 11rem, "Cadastrado em" a partir de `@4xl`, nome com `truncate`;
  - serviços: troca por container query (`@2xl`, antes `md`), para a coluna do nome não ficar com ~100 px em 768 px com a sidebar.
- **Toque (só abaixo de 768 px, `max-md:`):** botões do cabeçalho e do tema com 40 px (o tema também nas telas de entrada); itens do menu lateral com 40 px (variante `default` do `SidebarMenuButton`, em `ui/sidebar.jsx`); "⋯" dos cartões de orçamentos, clientes e serviços com 40 px (margens ajustadas); "Gráfico/Tabela" e seletor de período com 36 px. Links de texto ("Ver na lista…", "Ver todas…", "← Clientes", "WhatsApp") com área de toque maior por padding + margem negativa (o texto não muda de lugar).

## Verificação

- `npm run lint` ✅ · `npm test` ✅ **794 testes** (eram 790; novos: `lib/format.test.js`) · `npm run build` ✅.
- Medição refeita depois das correções: painel, orçamentos, clientes, detalhe do cliente, serviços e página do orçamento **sem cortes nem rolagem lateral** em 360–1440 px. Tabelas: orçamentos 935/935 px em 1280 e 1086/1086 em 1440 (com a coluna Data); clientes 950/950 em 1280.
- Visual: cabeçalho do orçamento em 768 px com o título numa linha e os botões embaixo; painel no celular com os cartões inteiros (16→359 px numa tela de 375); tabela de orçamentos e de clientes com reticências.
- Dados de teste apagados (banco com 1 usuário, 1 perfil, 1 cliente e o resto zerado).

## Para a etapa 31 (construtor)

- Total e "Salvar" só no fim de ~5.500 px no celular e com a sidebar aberta em telas médias → **barra fixa no rodapé** com o total e "Salvar" (some quando o resumo completo aparece).
- Grade do construtor por **container query** (2 colunas só com ~896 px úteis): num notebook de 1024 px com a sidebar, as 2 colunas deixam o formulário com ~375 px.
- Alvos de toque do construtor no celular: mover/remover item (28 px), "Trocar"/remover cliente (28), atalhos de validade (32), "Remover desconto/impostos" (28).

## Achado fora do escopo (avisar o usuário)

- **Detalhe do cliente diz "Nenhum orçamento ainda" mesmo quando o cliente tem orçamentos** (o espaço foi deixado no Sprint 4 e nunca ligado). Corrigir no Sprint 21 (estados de UX) ou antes: listar os orçamentos do cliente (ou um link para a lista filtrada).

## Problemas encontrados

1. A ferramenta `javascript_tool` esconde resultados cujo nome contém "password" ("[BLOCKED: Sensitive key]"): usar outros nomes nas chaves.
2. Toda edição de arquivo faz o Fast Refresh recarregar a página que hospeda os iframes e o laboratório some: medir depois de terminar as edições, ou remontar.
3. O iframe de 1024 px ficou com uma fração de pixel a menos (zoom do navegador), então o `lg` (≥ 1024) não ativou nele; num notebook de 1024 px real ele ativa.
4. Aviso de hidratação no log do dev: extensão Grammarly (atributos `data-gr-*`), já conhecido.
5. O `start-server.js` ficou na porta 3000 ao parar o `npm run dev` (encerrado pelo PID depois de conferir a linha de comando).
