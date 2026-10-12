# Etapa 11 — Sprint 6 (parte 4): desconto e impostos

**Data:** 2026-10-12
**Status:** ✅ Concluída. Com ela, o **Sprint 6 (estrutura do construtor) está completo**. O resumo continua zerado até o motor de cálculos (Sprint 8).

## Decisões

- **Desconto = percentual OU valor fixo** (regra 3 do plano), nunca os dois. No formulário: `discount_type` (`"none"`, `"percent"`, `"amount"`, em `DISCOUNT_TYPE`) + `discount_value` (texto: "12,5" se percentual, "350,00" se valor fixo). No banco (Sprint 10), `"none"` vira `null`.
- **Trocar o tipo limpa o valor:** "10" pode ser 10% ou R$ 10, então não há conversão automática.
- **Imposto = um percentual simples** (regra 4: nada de regras fiscais complexas), em `tax_rate` (texto; vazio = sem imposto). Abrir a linha e não digitar nada continua valendo como "sem imposto".
- **Base de cálculo do imposto: subtotal COM desconto** (decidido aqui; a etapa 9 tinha deixado para o Sprint 8). É o usual para ISS: o imposto incide sobre o valor efetivamente cobrado. O Sprint 8 implementa.
- **Percentuais em pontos-base** (centésimos de ponto percentual; 12,5% = 1250), inteiros como dinheiro e quantidade. De 0 a 100%, até 2 casas. **O campo recusa o que passaria de 100%** (mesmo comportamento da recusa da 3ª casa: valor e cursor voltam ao anterior).
- **Desconto em valor fixo** usa o `CurrencyField` com o teto de preço (R$ 99.999.999,99). A regra "desconto ≤ subtotal" fica para o schema/cálculo (Sprint 7/8), porque depende dos itens.
- O "Tipo" é um **grupo de rádios nativos** (setas trocam a opção, Tab entra na opção marcada) com visual de controle segmentado e uma pílula animada (`motion` `layoutId`).

## O que foi feito

- `src/lib/percent.js` (+ 38 testes): `parsePercentInput` (aceita "10%", "12,5", "2.75"), `formatPercentInput` ("12,5"), `formatPercentValue` ("12,5%"), `editPercentInput` (teto de 100%), `pasteIntoPercentInput`, `normalizePercentInput`, `MAX_PERCENT_BASIS_POINTS`, `MAX_PERCENT_INTEGER_DIGITS`.
- `decimal-input.jsx`: `DecimalInput` ganhou `suffix` (addon à direita) e nasceu o `PercentInput` ("%" no fim).
- `form-fields.jsx`: `PercentField`.
- `validations/quote.js`: `DISCOUNT_TYPE` e os campos `discount_type`, `discount_value`, `tax_rate` no formulário vazio (+ teste).
- `src/components/quotes/quote-adjustments.jsx` (DiscountField e TaxField do plano):
  - `AdjustmentRow`: fechada mostra "Sem desconto/impostos" + "Adicionar"; aberta, o ícone fica na cor da marca, aparece "Remover" e os campos entram embaixo (`animate-enter`), alinhados ao título;
  - desconto: "Tipo" (Percentual | Valor fixo) + "Percentual de desconto" (%) ou "Valor do desconto" (R$);
  - impostos: "Alíquota" (%), dica "Sobre o subtotal com desconto.";
  - foco síncrono (hook `useFocusAfterToggle`, que devolve `focusNext`): abrir → campo de valor; remover → botão "Adicionar".

## Verificação

- `npm run lint` ✅ · `npm test` ✅ **353 testes** (eram 315) · `npm run build` ✅.
- Chrome (`localhost:3000`, sessão de teste do usuário; nada foi gravado no banco):
  - "Adicionar desconto" → Percentual marcado e foco no campo; "12.5" → "12,5"; 3ª casa recusada; "150" para em "15" (o 0 que passaria de 100% é recusado);
  - Shift+Tab até o rádio, seta → "Valor fixo": valor limpo, campo vira R$, "350" → "350,00" ao sair;
  - "Adicionar impostos" → foco na alíquota; "2,50" → "2,5";
  - "Remover" (desconto e impostos) → foco volta a "Adicionar"; reabrir começa vazio, com foco no campo;
  - celular (iframe de 390 px) sem rolagem horizontal; temas escuro e claro; console sem erros.

## Problemas encontrados

1. **Lint do React 19 (`react-hooks/immutability`):** não se pode alterar um ref devolvido por um hook customizado (`pending.current = …`) se o nome não terminar em `Ref`. Solução: o hook devolve uma função (`focusNext(alvo)`) que altera o ref por dentro.
2. As dicas dos campos quebravam em duas linhas na largura `sm:w-56`: textos encurtados ("Sobre o subtotal dos itens.", "Abatido do subtotal.", "Sobre o subtotal com desconto.").
3. O registro do console do Claude in Chrome só começa na primeira leitura: para conferir erros, ler uma vez, recarregar a página e repetir as ações.
