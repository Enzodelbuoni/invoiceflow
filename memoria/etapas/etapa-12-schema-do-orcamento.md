# Etapa 12 — Sprint 7: schema Zod do orçamento (React Hook Form + Zod)

**Data:** 2026-10-12
**Status:** ✅ Concluída. O formulário valida tudo; o salvamento continua para o Sprint 10.

## Decisões

- **`createQuoteSchema({ today })`** em `src/lib/validations/quote.js`: função, porque a regra de validade depende de "hoje" (que vem do servidor). Mesmo estilo dos outros schemas: valida os textos do formulário e devolve o **formato do banco**, com valores em inteiros:
  `{ client_id, title, description|null, valid_until, items: [{ service_id|null, name, description|null, quantity_hundredths, unit, unit_price_cents }], discount_type: "percent"|"amount"|null, discount_value (pontos-base ou centavos)|null, tax_rate_bps|null, notes|null, terms|null }`. Campos extras (user_id, status, totais) são descartados.
- **Validade obrigatória**, de hoje até **1 ano** (`VALIDITY_MAX_DAYS = 365`, evita "2062" digitado no lugar de "2026"). O `<input type="date">` ganhou `max`. (A coluna do plano é `valid_until DATE NULL`; o app vai sempre gravar uma data.)
- **Desconto e imposto ligados exigem valor > 0** ("Para não aplicar, remova-o."): percentual até 100%, valor fixo até o teto de preço. Desligados, o texto que sobrou nos campos é ignorado.
- **Imposto ligado/desligado virou campo do formulário (`tax_enabled`)**, no lugar do estado local da etapa 11. Assim o schema sabe que, com o imposto ligado, a alíquota é obrigatória (o asterisco do campo passou a ser verdade).
- **Preço zero é permitido** (item de cortesia); quantidade precisa ser > 0.
- **"Desconto ≤ subtotal" fica para o Sprint 8**, porque depende do motor de cálculos.
- **Envio só pelo botão "Salvar rascunho":** Enter num campo de texto do construtor não envia (num formulário grande, um Enter sem querer acenderia erros em tudo). Os diálogos de cadastro rápido continuam enviando com Enter.
- **Foco no primeiro erro na ordem da tela**, feito por nós (`shouldFocusError: false` no RHF): o RHF seguiria a ordem de registro dos campos e não sabe focar a lista de itens. Os ids seguem os nomes (`client_id` é o botão do seletor; `items` é o botão do catálogo).
- **Envio válido, por enquanto:** toast "Tudo certo com o orçamento · Salvar como rascunho chega em breve." Envio inválido: toast "Confira os campos destacados · N campos precisam de atenção.".

## O que foi feito

- `src/lib/uuid.js`: `isUuid` sem `server-only` (o `data/shared.js` reexporta).
- `src/lib/validations/numbers.js`: `centsFromText`, `hundredthsFromText`, `basisPointsFromText` (texto → inteiro com mensagens para vazio, inválido, mínimo e máximo). O `serviceSchema` passou a usar o `centsFromText` (mesmas mensagens; testes de serviço passando).
- `src/lib/validations/quote.js`: `createQuoteSchema`, `VALIDITY_MAX_DAYS`, `tax_enabled` no formulário vazio; validação cruzada de desconto/imposto com `superRefine` (o erro vai para `discount_value`/`tax_rate`) e conversão no `transform`.
- `src/lib/form-errors.js` (+ testes): `firstErrorPath(errors, order)`, `countErrors(errors)`, `listErrorMessage(error)` (lê o erro da lista no objeto ou em `root`).
- `quote-form.jsx`: `zodResolver(createQuoteSchema({ today }))` (com `useMemo`), `handleSubmit(onValid, onInvalid)`, ordem dos campos (`FIELD_ORDER`), `preventImplicitSubmit`.
- `quote-summary.jsx`: "Salvar rascunho" virou `type="submit"`.
- `client-selector.jsx`: id `client_id` e `aria-invalid`/`aria-describedby` também no botão "Cadastrar cliente"; caixa vazia destacada com erro.
- `quote-section.jsx`: `QuoteSectionEmpty` com `invalid` (borda e fundo na cor de erro).
- `quote-items.jsx`: mensagem da lista (`items-error`) embaixo da caixa vazia ou da barra; botão do catálogo com id `items`, `aria-invalid` e `aria-describedby`.
- `quote-item-row.jsx`: borda vermelha na linha com algum erro.
- `quote-adjustments.jsx`: imposto lê/escreve `tax_enabled`.
- `quote-basic-info.jsx`: `max` no campo de data; atalhos 7/15/30 com `shouldValidate` (ver Problemas).

## Verificação

- `npm run lint` ✅ · `npm test` ✅ **407 testes** (eram 353) · `npm run build` ✅.
- Chrome (`localhost:3000`, sessão de teste do usuário; nada gravado):
  - envio vazio → "3 campos precisam de atenção", foco em "Selecionar cliente", erros em cliente, título e itens, caixas vazias destacadas, `aria-invalid` e `aria-describedby` nos botões;
  - escolher o cliente e digitar o título apagam os erros na hora; Enter no título não envia;
  - adicionar item apaga o erro da lista; item vazio + desconto e imposto sem valor → 4 erros, foco no nome do item, linha com borda vermelha;
  - quantidade "0" → erro na hora; "2" apaga; data 11/10 → "A validade não pode ser antes de hoje."; atalho "30 dias" apaga o erro;
  - envio válido → "Tudo certo com o orçamento";
  - erros acompanham o item ao mover e somem ao remover; remover o último item depois do envio traz de volta "Adicione pelo menos um item ao orçamento." (foco no botão do catálogo);
  - celular sem rolagem horizontal; console sem erros.

## Problemas encontrados

1. **Atalho de validade não limpava o erro:** `setValue` sem `shouldValidate` não revalida, mesmo depois do envio; a data mudava para 27/10 e o erro "antes de hoje" continuava. Corrigido com `shouldValidate: true`. **Regra:** `setValue` em campo validado precisa de `shouldValidate` (ou `clearErrors`, quando o valor novo deve esperar o blur).
2. **Zod 4:** o `superRefine` do objeto roda mesmo quando um campo falha, então os erros de desconto/imposto aparecem junto com os outros (bom); e o `transform` depois dele não roda quando há erro (o `.parse()` dentro do `transform` é seguro). `abort: true` no `refine` evita mensagens em cascata (data vazia não mostra também "data inválida").
3. Um `cat >> arquivo <<'EOF'` grande seguido de `node -e '...'` no mesmo comando falhou na interpretação do shell (nada rodou). Para arquivos longos, usar a ferramenta Write.
4. A borda vermelha da linha parecia não aplicada na primeira leitura do estilo: era a transição de cor (`transition-colors`) ainda em andamento.
