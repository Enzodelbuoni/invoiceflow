# Etapa 10 — Sprint 6 (parte 3): itens do orçamento

**Data:** 2026-10-12
**Status:** ✅ Concluída e commitada. Testada no modo demonstração e, depois que o usuário reativou o Supabase, **com o banco real** (catálogo e cadastro rápido de serviço).

## Decisões

- **Quantidade com até 2 casas decimais** ("1,5 hora", "0,25 dia"), guardada como **centésimos inteiros** (150 = 1,5), como o dinheiro em centavos. Teto 999.999,99 (6 dígitos antes da vírgula). O campo segue as regras do campo de valor (vírgula decimal, ponto de milhar, "." vira ","), mas sem "R$" e sem completar ",00": ao sair, "1,50" → "1,5" e "1," → "1".
- **Valores do item no formulário (todos texto):** `{ service_id, name, description, quantity, unit, unit_price }`. O schema do Sprint 7 converte `quantity` → centésimos e `unit_price` → centavos.
- **Snapshot:** `createQuoteItem(service)` copia nome, descrição, unidade e preço do serviço; `service_id` fica só como referência. O preço pode ser ajustado; quando difere do catálogo, a dica embaixo do campo mostra "No catálogo: R$ X".
- **Item avulso:** campos vazios, quantidade 1, unidade "Unidade" (`DEFAULT_ITEM_UNIT`).
- **Limites** (`QUOTE_LIMITS`): até **100 itens**; nome do item 2–120 e descrição ≤ 1000 (os mesmos de `services`, porque o item copia o serviço; um teste garante que nenhum serviço válido passa dos limites do item).
- **Remover sem confirmação, com "Desfazer"** no aviso (8 s). O aviso fecha se a pessoa sair da página.
- **Mover com botões ↑/↓** (acessíveis por teclado), não arrastar. Arrastar fica como possível polimento futuro.
- **Sem animação de saída nas linhas** (ver Problemas, item 3). Entrada (fade + 8 px) e deslocamento (`layout="position"`) continuam animados.
- **Subtotal da linha e resumo** continuam para o Sprint 8 (motor de cálculos), para não espalhar conta de dinheiro pela interface.

## O que foi feito

- `src/lib/quantity.js` (+ testes): `parseQuantityInput`, `formatQuantity`, `quantityToNumber`, `editQuantityInput`, `pasteIntoQuantityInput`, `normalizeQuantityInput`, `MAX_QUANTITY_INTEGER_DIGITS`, `MAX_QUANTITY_HUNDREDTHS`, `DEFAULT_QUANTITY_INPUT`. Reaproveita `parseCurrencyInput`/`editCurrencyInput`.
- `src/lib/currency-input.js`: `pasteIntoCurrencyInput` ganhou a opção `format` (a quantidade cola sem ",00").
- `src/components/shared/currency-input.jsx` → **`decimal-input.jsx`**: `DecimalInput` genérico (regras `edit`/`paste`/`normalize` + prefixo opcional), `CurrencyInput` e `QuantityInput`.
- `src/components/shared/form-fields.jsx`:
  - erros de caminhos aninhados (`get(errors, "items.0.name")`);
  - **prop `id`** em todos os campos (padrão = `name`), para dois formulários na mesma página não repetirem ids;
  - novo `QuantityField`.
- `src/lib/validations/quote.js`: `items: []` no formulário vazio, `createQuoteItem`, `DEFAULT_ITEM_UNIT`, limites dos itens (+ `quote.test.js`).
- `src/lib/data/services.js`: `listServiceOptions()` (id, nome, descrição, unidade, preço). A página `/quotes/new` carrega clientes e serviços em paralelo.
- `src/components/services/service-dialog.jsx` (`ServiceDialog`): nome, preço, unidade e descrição, mesmo schema e mesma action da página de serviços, ids com prefixo `service-dialog-`, "Cadastrar e adicionar".
- `src/components/quotes/service-picker.jsx` (`ServicePicker`): Popover + Command com busca (sem acentos) por nome/descrição, preço "por unidade", check nos serviços que já estão no orçamento, "Cadastrar “texto”" no fim. Sem serviços no catálogo, o botão vira "Cadastrar serviço" e abre o diálogo direto. O botão é desenhado por quem usa (render prop), porque muda de lugar (estado vazio → barra embaixo da lista) e o Popover/diálogo precisam continuar montados.
- `src/components/quotes/quote-item-row.jsx` (`QuoteItemRow`): `fieldset` com título "Item N", selo "Do catálogo"/"Avulso", ações ↑ ↓ e lixeira (tooltip + nome acessível com o nome do item), campos nome, descrição (contador), quantidade, unidade e preço. **Container query** (`@container` + `@md:`), porque a largura da coluna muda com a sidebar e o resumo: 2 colunas no estreito, 3 (quantidade · unidade · preço) no largo.
- `src/components/quotes/quote-items.jsx` (`QuoteItems`): `useFieldArray`, estado vazio, lista, barra com "Adicionar do catálogo", "Item avulso" e contador ("3 itens" / "Limite de 100 itens"), região `aria-live` anunciando adicionar/mover/remover/desfazer.
- **Foco:** item avulso → Nome; do catálogo → Quantidade (quando a lista/diálogo terminam de fechar); mover → o mesmo botão (ou o oposto, se ficou desativado); remover → botão de remover do vizinho (ou o botão do catálogo, sem itens); desfazer → Nome do item restaurado.
- `quote-form.jsx`: hook `useOptionsWithCreated` (lista do servidor + criados nos diálogos) para clientes e serviços.
- **Correção no `client-selector.jsx`** (vinha da etapa 9): ao fechar a lista clicando fora (ex.: no campo Título), o foco era puxado de volta para o botão. Agora, como o Radix faz por padrão, o foco fica onde a pessoa clicou (`onInteractOutside`). O `ServicePicker` segue a mesma regra.

## Verificação

- `npm run lint` ✅ · `npm test` ✅ **315 testes** (eram 270) · `npm run build` ✅.
- Chrome, **modo demonstração** (`localhost:3100` com as variáveis do Supabase vazias), aba visível:
  - estado vazio com catálogo vazio ("Cadastrar serviço" + "Item avulso");
  - item avulso → foco no Nome; **3 itens criados com Enter + digitação imediata**, cada nome no item certo;
  - quantidade "1500.25" → "1.500,25", 3ª casa recusada, "2,50" → "2,5" ao sair; preço "359,9" → "359,90";
  - mover ↓ ↓ ↑ pelo teclado: ordem, foco (troca para ↑ no fim da lista) e anúncio corretos; nome, quantidade, unidade e preço acompanham o item;
  - unidade pelo teclado (letra e setas) e pelo clique;
  - remover → foco no vizinho, aviso com "Desfazer" → item volta na posição, com os valores; remover o último → foco no botão do catálogo; sair da página fecha o aviso;
  - diálogo "Novo serviço": foco no Nome, sem ids repetidos na página, erros em pt-BR, o envio não dispara o formulário do orçamento, falha do servidor mostrada no alerta ("Conecte o Supabase…"), Cancelar devolve o foco ao botão;
  - celular (iframe de 390 px) sem rolagem horizontal; temas escuro e claro; console sem erros do app.
- **Com o banco real** (`localhost:3000`, na sessão da conta de teste do usuário, depois que ele reativou o projeto):
  - catálogo vazio → "Cadastrar serviço" → diálogo (foco no Nome, unidade "Projeto" pelo teclado) → serviço gravado (`price_cents = 480000`, `unit = project`) e já no orçamento como item "Do catálogo" com nome, descrição, unidade e preço copiados; foco na quantidade; toast e anúncio;
  - lista do catálogo: "Catálogo (1)", preço "por projeto", check e texto "(já está no orçamento)";
  - texto sem resultado → "Nenhum serviço encontrado." + "Cadastrar “Hora técnica de suporte”" selecionado → Enter abre o diálogo com o nome preenchido → serviço salvo e adicionado (foco na quantidade do 2º item);
  - depois da revalidação, a lista do servidor trouxe os 2 serviços ("Catálogo (2)", sem duplicar o criado no diálogo);
  - busca sem acento ("tecnica suporte") e por palavra da descrição ("ajustes"); o mesmo serviço adicionado de novo vira um 3º item;
  - preço ajustado para 4.500,00 → dica "No catálogo: R$ 4.800,00", ligada ao campo por `aria-describedby` (os itens com o preço original não mostram a dica);
  - correção do foco: com a lista de clientes aberta, clicar no Título deixa o foco no Título; Esc continua devolvendo o foco ao botão (clientes e catálogo);
  - `/services` lista os 2 serviços; console sem erros do app.
  - **Limpeza:** os 2 serviços do teste foram apagados pelos ids; o banco voltou a 1 usuário, 1 cliente e 0 serviços.
- Não testado no navegador: o limite de 100 itens (só a lógica).

## Problemas encontrados

1. **Projeto Supabase pausado** (status `INACTIVE` em `projects list`, 2026-10-12). Sintoma no CLI: `db query` falha com "Failed to create login role: Connection terminated due to connection timeout". O usuário reativou em **Resume project** e o status voltou a `ACTIVE_HEALTHY`, com os dados intactos.
2. **Foco atrasado ao adicionar item:** com `useEffect`, e também com `form.setFocus` do RHF (que **adia o foco com `setTimeout`**), a digitação logo depois do Enter caía no item anterior ou se perdia. Solução: `useLayoutEffect` + `document.getElementById(name).focus()` (o id dos campos é o `name`).
3. **`AnimatePresence` (saída) + `useFieldArray` não combinam:** o item removido ficava ~150 ms na tela com os campos registrados pelo índice antigo, que já é de outro item. Ele mostrava o texto do vizinho e, ao desmontar, marcaria o campo do vizinho como desmontado no RHF (`_f.mount = false`). A animação de saída foi removida.
4. **Aviso de desfazer com 4 s** (padrão do sonner) sumia rápido demais: passou para 8 s.
5. **Testes de teclado em Select do Radix com automação:** teclas enviadas enquanto a lista ainda abre/fecha se perdem (as setas vão para o botão; o Tab no meio do fechamento cai no `body`). Esperar ~300 ms entre abrir e navegar. Uma vez as setas não andaram mesmo com a lista aberta e focada; não se repetiu em 4 tentativas.
6. O "1 issue" do indicador do Next era erro de um ouvinte do **meu script de teste**, não do app.
7. **Regra de segurança dos testes no navegador:** não crio contas de teste pelo navegador, porque o cadastro vai para o Supabase Auth (serviço externo). Testes com login: usar a sessão já aberta do usuário em `localhost:3000` (conta de teste dele, que ele liberou) ou o modo demonstração.
8. Não há Python na máquina (`python3` abre a Microsoft Store). Para edições por script, usar `node -e`.
