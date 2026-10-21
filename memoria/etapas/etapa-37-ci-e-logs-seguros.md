# Etapa 37 — Sprint 22 (parte 2): CI no GitHub Actions + logs seguros

**Data:** 2026-10-21
**Status:** ✅ Concluída (o CI só roda no GitHub depois do `git push`, que é feito quando o usuário pedir).

## Antes de começar

- `git status` limpo; Supabase `ACTIVE_HEALTHY`; `npm test` 814 ✅.
- O usuário avisou que **já tem conta na Vercel** (pendência da etapa 46 resolvida em parte: falta ligar ao GitHub, o que acontece ao importar o repositório no deploy).

## Logs seguros

Problema: `toFailure` fazia `console.error(..., error)` com o **objeto inteiro** nos erros inesperados. Um erro do Postgres que chegasse cru traria `details` ("Failing row contains (…e-mail, CPF…)", "Key (email)=(…)"); um erro de rede poderia trazer cabeçalhos/corpo do pedido.

- **`src/lib/safe-log.js`** (puro, testável sem mock):
  - `describeError(error, { stack })` → `{ name, code, message, digest?, stack?, cause? }`. Lista branca de campos (nada de `details`, `hint`, `headers`, corpo…). Mensagem limpa por `redact` e cortada em 300 caracteres. Pilha só com as linhas `at …` (a primeira linha repete a mensagem sem limpeza), no máximo 6. `cause` até 2 níveis, sem pilha. Valor que não é objeto vira `{ message: String(valor) }`; objeto sem `message` → `message: ""`.
  - `redact(text)`: JWT → `[token]`, `sb_secret_…`/`sb_publishable_…` → `[chave]`, `Bearer …` → `Bearer [token]`, e-mails → `[e-mail]`.
  - `logError(scope, label, error, options)` → `console.error("[scope] label:", describeError(...))`.
- Usado em: `toFailure` (`lib/action-result.js`), `databaseError` (`lib/data/shared.js`, com `stack: false` — a pilha dos erros do Supabase nasce dentro da biblioteca) e a rota do PDF (`/quote/[publicId]/pdf`).
- Fica como está: `useReportError` (`error-fallback.jsx`) registra no **console do navegador** da própria pessoa; erros de render do servidor são registrados pelo Next (só `digest` vai ao navegador em produção) e o nosso código lança `DataError` com mensagens amigáveis, sem dados pessoais.
- Testes: `safe-log.test.js` (redação, Postgres sem `details`, pilha, causa, corte, valores que não são Error, `logError`) + 2 casos novos em `action-result.test.js` (log do `toFailure` e do `databaseError` sem os dados da linha). **831 testes.**

## CI — `.github/workflows/ci.yml`

- Dispara em `push` no `master`, em `pull_request` e manualmente (`workflow_dispatch`). `concurrency` cancela a rodada velha do mesmo ramo; `permissions: contents: read`.
- Ubuntu, Node 22 (`actions/setup-node@v5` com `cache: npm`), `npm ci` → `npm run lint` → `npm test` → cache do `.next/cache` (`actions/cache@v4`, chave pelo lockfile + `src/**` + `*.mjs`; o exemplo da doc do Next usa `**/*.js`, que varreria o `node_modules`) → `npm run build`.
- **Sem segredos:** o build roda sem as variáveis do Supabase (modo demonstração). Conferido aqui: `NEXT_PUBLIC_SUPABASE_URL= NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY= NEXT_PUBLIC_SITE_URL= PDF_CHROME_PATH= npm run build` ✅.
- O `package-lock.json` (gerado no Windows) já tem os binários de Linux (`@next/swc-linux-x64-gnu`, `lightningcss-linux-x64-gnu`, `@tailwindcss/oxide-linux-x64-gnu`, `@rolldown/binding-linux-x64-gnu`, `@unrs/resolver-binding-linux-x64-gnu`): o `npm ci` do Ubuntu não deve faltar nada. O `npm ls` mostra pacotes wasm32 como "extraneous" (opcionais de outra plataforma; inofensivo).
- O `npm ci` baixa o binário do CLI do Supabase (postinstall do pacote `supabase`); vai ser útil no E2E (etapa 44).
- YAML validado com `js-yaml` (presente no `node_modules`).
- **Deploy automático** fica com a integração da Vercel com o GitHub (etapa 46): cada push no `master` publica, cada PR ganha uma prévia.

## Verificação

`npm run lint` ✅ · `npm test` ✅ (831) · `npm run build` sem variáveis ✅. A primeira rodada real do CI depende do `git push`.
