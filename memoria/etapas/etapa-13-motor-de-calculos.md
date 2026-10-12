# Etapa 13 — Sprint 8: motor de cálculos

**Data:** 2026-10-12
**Status:** ✅ Concluída. O resumo e cada item mostram os valores calculados ao vivo.

## Decisões

- **`src/lib/calculations/quote.js`**, funções puras e só com inteiros:
  - subtotal do item = quantidade (centésimos) × preço (centavos) ÷ 100;
  - subtotal = soma dos itens;
  - desconto = subtotal × pontos-base ÷ 10.000 (percentual) ou o valor fixo;
  - **imposto = (subtotal − desconto) × pontos-base ÷ 10.000**;
  - total = subtotal − desconto + imposto.
- **Arredondamento meio para cima** (comercial) em cada divisão: 1,5 × R$ 150,33 = R$ 225,495 → **R$ 225,50**. Cada linha é arredondada antes de somar (o subtotal é a soma do que aparece nas linhas).
- **BigInt nas multiplicações:** o maior item possível (999.999,99 × R$ 99.999.999,99 ≈ 10¹⁶ centavos) passa de `Number.MAX_SAFE_INTEGER` (≈ 9 × 10¹⁵). O resultado volta a `Number` só abaixo do teto.
- **Teto `MAX_TOTAL_CENTS` = R$ 999.999.999,99** para cada item, para o subtotal e para o total. Acima dele o cálculo devolve `null` ("Acima do limite" na tela) e o schema dá erro: no preço do item, na lista (soma) ou na alíquota (quando é o imposto que estoura).
- **O desconto fixo nunca passa do subtotal no cálculo** (o total nunca fica negativo); quando o valor digitado passa, `discountExceedsSubtotal` liga um aviso no resumo e o schema dá o erro "O desconto não pode ser maior que o subtotal (R$ X)".
- **Resumo ao vivo e tolerante:** `totalsInputFromForm` converte os textos do formulário; quantidade/preço ainda inválidos contam como zero, desconto/imposto inválidos ou acima de 100% são ignorados (o erro aparece no campo).
- **`DISCOUNT_TYPE` foi para `src/lib/constants/discount-types.js`** (o schema importa o motor de cálculos; manter a constante no schema criaria um ciclo de imports). `validations/quote.js` reexporta.
- **Erros que dependem dos totais são revalidados juntos:** depois do 1º envio, o RHF revalida só o campo alterado; mudar itens, desconto ou imposto agora dispara `trigger(["items", "discount_value", "tax_rate"])` (via `form.subscribe`), para um erro corrigido por outro campo não ficar na tela.

## O que foi feito

- `src/lib/calculations/quote.js` (+ testes): `calculateItemSubtotal`, `calculateQuoteTotals`, `emptyQuoteTotals`, `totalsInputFromForm`, `MAX_TOTAL_CENTS`. Testes: casos de arredondamento, exatos, cortesia, 100% de desconto, desconto acima do subtotal, tetos (item, soma, imposto), invariantes com 300 orçamentos pseudoaleatórios (total = subtotal − desconto + imposto; nada negativo; inteiros seguros).
- `validations/quote.js`: segundo `superRefine` **depois** do `transform` (só roda com todos os campos válidos), com os caminhos dos campos do formulário (`items.N.unit_price`, `items`, `discount_value`, `tax_rate`) (+ testes).
- `quote-summary.jsx`: subtotal com a contagem de itens, "Desconto (10%)"/"Impostos (5%)", linhas esmaecidas quando o ajuste está desligado, aviso de desconto acima do subtotal, **total animado** (`AnimatePresence mode="popLayout"`: o valor antigo sobe e some, o novo entra por baixo), tamanho do total conforme o comprimento (R$ 999.999.999,99 cabe na coluna), "Acima do limite" com aviso.
- `quote-item-row.jsx`: rodapé com "1,5 hora × R$ 150,33 → R$ 225,50" (com "Subtotal do item:" para leitor de tela); "—" enquanto faltam dados; à direita mesmo quando quebra no celular.
- `quote-form.jsx`: revalidação dos campos dos totais (`form.subscribe`).

## Verificação

- `npm run lint` ✅ · `npm test` ✅ **440 testes** (eram 407) · `npm run build` ✅.
- Chrome (`localhost:3000`, sessão de teste do usuário; nada gravado):
  - 2 × R$ 500,00 = R$ 1.000,00; 1,5 hora × R$ 150,33 = **R$ 225,50**; subtotal R$ 1.225,50; desconto 10% R$ 122,55; imposto 5% de R$ 1.102,95 = **R$ 55,15**; total **R$ 1.158,10** (conferido à mão);
  - desconto fixo R$ 2.000 → limitado ao subtotal + aviso; salvar → "O desconto não pode ser maior que o subtotal (R$ 1.225,50)", foco no campo; R$ 200 → total R$ 1.076,78 (imposto R$ 51,275 → R$ 51,28);
  - item gigante → "Acima do limite" na linha, no total e erro no preço; imposto estourando o total → "Acima do limite"; total de R$ 987.654.346,50 cabe na coluna;
  - erro do desconto some ao aumentar o preço do item (sem mexer no desconto);
  - celular: 12,5 × R$ 1.234.567,89 = R$ 15.432.098,63, sem rolagem horizontal; console sem erros.

## Problemas encontrados

1. **Erro "preso" em campo que depende de outro:** depois do envio, o RHF só revalida o campo alterado; o erro do desconto continuava ao corrigir o preço do item. Corrigido com o `trigger` dos campos dos totais.
2. **Lint do React 19 (`react-hooks/incompatible-library`) com `form.watch(callback)`:** o compilador do React não consegue memoizar o `watch`. Usar **`form.subscribe({ formState: { values: true }, callback })`** (RHF 7.55+), que não re-renderiza.
3. Leituras do total logo depois de digitar mostram vários valores: são as saídas da animação ainda em andamento (cada tecla troca o valor); em ~1 s sobra um só.
4. "− —" e "+ —" no resumo quando os valores passam do teto: o sinal agora some sem valor.
