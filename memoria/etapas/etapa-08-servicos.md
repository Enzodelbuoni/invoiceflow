# Etapa 08 — Sprint 5: Serviços (CRUD completo) + base de dinheiro e testes

**Data:** 2026-10-07
**Status:** ✅ Concluída (Sprint 5 encerrado; Fase 2 completa)

O sprint foi feito em 4 partes. No meio da parte 4 o PC do usuário desligou; a sessão foi retomada pela memória e as partes 1–3 estavam íntegras (166 testes ok).

## Decisões

- **Dinheiro = centavos inteiros em todo o app.** Banco `bigint` (`price_cents`), cálculos e props em centavos; texto só na borda (exibição e campos). Motivo: o JS não tem decimal exato (0,1 + 0,2 ≠ 0,3) e o plano pedia "estratégia consistente de precisão". O NUMERIC do plano foi trocado por centavos `bigint`.
- **Unidade de cobrança:** lista fechada em inglês no banco (`hour, day, week, month, project, unit, page, word`), rótulos pt-BR na interface.
- **Sem página de detalhes de serviço:** tudo cabe na lista e na edição. `/services/[id]` redireciona para `/services/[id]/edit`.
- **Exclusão sempre permitida:** os itens de orçamento vão guardar snapshot (nome, descrição, preço) e `quote_items.service_id` será `ON DELETE SET NULL` (Sprint 10).
- **`ServiceDialog`** (cadastro rápido em diálogo) ficou para o Sprint 6, junto com o `ClientDialog`, no seletor do construtor de orçamentos.
- **Testes com Vitest 5** (ambiente `node`, arquivos `*.test.js` ao lado do código). Lógica de interface que dá para isolar (máscara, cursor, colagem) vira função pura testada.

## O que foi feito

### Parte 1 — banco
- Migração `20261007163349_create_services.sql` (aplicada no remoto): `user_id` default `auth.uid()` → `profiles` (cascade), `name` 2–120 (após btrim), `description` ≤ 1000, `unit` com CHECK da lista, `price_cents bigint` entre 0 e 9.999.999.999 (R$ 99.999.999,99), índice `(user_id, name)`, `set_updated_at`, RLS das 4 operações, `revoke all` + grants mínimos.
- Advisors sem problemas; teste de RLS/CHECKs 22/22 num bloco `DO` que termina em `raise exception` (rollback garantido).

### Parte 2 — dinheiro + Vitest
- `src/lib/money.js`: `formatCurrency(cents)` (saiu do `format.js`; dashboard e painel do auth atualizados), `formatCurrencyInput`, `parseCurrencyInput` (aceita "R$", formatos BR e US; ambíguo → `null`), `maskCurrencyInput` (`null` = recusar a tecla), `caretAfterMask`, `MAX_PRICE_CENTS`, `MAX_PRICE_INTEGER_DIGITS`, `isCents`.
- Vitest configurado (`vitest.config.mjs`, `npm test`, `npm run test:watch`); `engines.node >= 22.12.0`.

### Parte 3 — validação, dados e actions
- `src/lib/constants/service-units.js`, `src/lib/validations/service.js` (`serviceSchema`: `price` texto → `price_cents`; o teste confere unidades e teto **lendo a migração**), `src/lib/validations/text.js` (`charLength` conta como o Postgres).
- `src/lib/data/shared.js` + `src/lib/data/services.js`; `src/lib/action-result.js` + `src/actions/services.js`. Clientes refatorados para os módulos compartilhados.
- Bugs corrigidos em clientes: nome "😀" e e-mail > 254 caracteres passavam no Zod e o banco recusava.

### Parte 4 — telas
- **Campo de preço** em `src/lib/currency-input.js` (55 testes):
  - `editCurrencyInput`: máscara; "." digitado vira ","; recusa 3ª casa e reais acima do teto mantendo valor e cursor; **Backspace logo depois de um ponto de milhar apaga o dígito anterior** (e Delete antes do ponto apaga o seguinte), senão a máscara recolocava o ponto e a tecla ficava "presa";
  - `pasteIntoCurrencyInput`: colar substituindo o valor inteiro interpreta "R$ 1.500,00", "1,500.00", "12.50"; texto inválido ou acima do teto é recusado; colagem parcial fica com a máscara;
  - `normalizeCurrencyInput`: no blur, "1500" → "1.500,00", "12,5" → "12,50", "0," → "0,00".
- **Peças compartilhadas** em `src/components/shared/`:
  - `currency-input.jsx` (`CurrencyInput`: recebe o `registration` do RHF, prefixo "R$", `inputMode="decimal"`);
  - `form-fields.jsx` (`FormSection`, `TextField` com máscara, `TextareaField` com contador "x / máx", `SelectField` via `Controller`, `CurrencyField`); o `aria-describedby` não aponta mais para a dica quando ela está oculta pelo erro;
  - `search-input.jsx` (`SearchInput`, antes `ClientSearch`), `confirm-delete-dialog.jsx` (`ConfirmDeleteDialog`).
- **Clientes refatorados** para essas peças: `DeleteClientDialog` virou invólucro; `toFormValues` → `toClientFormValues` (em `validations/client.js`); observações ganharam contador.
- **Serviços** (`src/components/services/`): `service-form.jsx` (seções Serviço/Preço + **prévia ao vivo do item no orçamento**), `service-row-actions.jsx` (Editar/Excluir), `delete-service-dialog.jsx`, `service-edit-actions.jsx`.
- **Rotas:** `services/(list)/page.js` + `loading.js` (tabela no desktop, cartões no mobile, busca, contador, estados vazio e "nenhum resultado"), `services/new`, `services/[id]/edit` (título da aba "Editar <nome>", botão Excluir), `services/[id]/page.js` (redireciona), `services/[id]/not-found.js`.

## Verificação

- `npm run lint` ✅ · `npm test` ✅ **221 testes** · `npm run build` ✅.
- **Ponta a ponta no Chrome com o Supabase real** (conta de teste `e2e-…@example.com` em `http://e2e.localhost:3000`, apagada no fim):
  - envio vazio → erros pt-BR, foco no nome, `aria-invalid`/`aria-describedby`;
  - preço: 1500 → "1.500" → blur "1.500,00"; ".5" → ",5"; 3ª casa e 9º dígito recusados; Backspace/Delete no ponto; colar "R$ 2.750,90", "1,234.5" → "1.234,50"; "abc" e "100.000.000,00" recusados; "," → "0," → blur "0,00"; vazio → "Informe o preço.";
  - nome "😀" barrado no formulário; seletor de unidade (8 opções); contador; prévia ao vivo;
  - criar 3 serviços → toast → lista em ordem alfabética; banco com `price_cents = 480000` e `unit = project`;
  - busca por nome e por descrição, "nenhum resultado" e limpar;
  - edição com valores pré-preenchidos → lista atualizada; `/services/[id]` redireciona; id inválido e UUID inexistente → "Serviço não encontrado";
  - excluir pela lista (menu ⋯ → "Excluindo…" → toast) e pela edição;
  - **regressão de clientes**: validações, máscaras, contador, busca, edição pré-formatada, exclusão pela página de detalhes;
  - mobile (iframes de 390 px) sem rolagem horizontal; temas escuro e claro; console sem erros.

## Problemas encontrados

1. **Suspeita descartada — "não encontrado" piscando ao excluir pela página de detalhes/edição.** Pelo código do Next (`server/app-render/action-handler.js`), uma action com `revalidatePath` re-renderiza a rota atual, que daria `notFound()`. Medido com MutationObserver em clientes e serviços: o texto **nunca chegou ao DOM** (toast → lista). A navegação do `router.push` substitui o re-render antes de ele ser aplicado. Ressalva: medido com a aba oculta.
2. **Já havia uma conta real no banco** (criada pelo usuário no app: 1 usuário, 1 perfil, 1 cliente) e o Chrome estava logado nela em `localhost:3000`. O teste foi feito em **`e2e.localhost:3000`** (o dev server do Next 16 já aceita subdomínios de localhost, e os cookies ficam separados), sem tocar na sessão nem nos dados do usuário. A limpeza apagou **só a conta de teste, pelo e-mail**.
3. **Aba oculta estrangula `setTimeout`** (1 s ou mais por espera): um script de teste com muitas esperas estourou o tempo da ferramenta (45 s). Solução: esperar com `MessageChannel` (não é estrangulado) e só digitar depois da hidratação (o input ter `__reactProps…`). Antes disso, o RHF regrava o valor padrão ao registrar o campo e "come" o que foi digitado (não é bug do app).
4. **Arquivos gravados com CRLF:** editar com `Path.write_text` do Python no Windows converte `\n` em `\r\n`. 4 arquivos ficaram com CRLF e foram convertidos para LF. **Para detectar CR, usar `tr -cd '\r' < arquivo | wc -c`**: no Git Bash, `grep $'\r'` casa todas as linhas e dá falso positivo.
5. Um `python - <<'EOF'` longo (com aspas triplas) travou o Bash sem rodar o Python; processo encerrado. Para textos longos, usar Edit/Write.
