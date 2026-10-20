# Etapa 33 — Sprint 21 (parte 2): telas de erro e 404 geral

**Data:** 2026-10-20
**Status:** ✅ Concluída. Sem migração.

## Decisões

- **Quatro barreiras de erro** (convenções do Next 16.3; doc em `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md`):
  - **`app/(dashboard)/error.js`** — erro numa página do painel: o `error.js` não envolve o layout do mesmo segmento, então **a sidebar e o cabeçalho continuam** e só o conteúdo vira o aviso (`EmptyState` com `tone="danger"`): "Não foi possível carregar esta página", "Tentar novamente" e, fora do painel, "Ir para o painel";
  - **`app/(public)/quote/[publicId]/error.js`** — página da proposta e confirmações: quem vê é o cliente, então **nenhum link para o app**; mesmo visual da "Proposta não encontrada" ("Não foi possível abrir a proposta… fale com quem enviou");
  - **`app/error.js`** — o resto (telas de entrada, página inicial) e erros no próprio layout do painel: tela inteira (`StatusScreen`), "Algo deu errado", "Tentar novamente" + "Página inicial";
  - **`app/global-error.js`** — erro no layout raiz: substitui o documento inteiro, então traz `<html lang="pt-BR">`, `<body>`, o `globals.css`, as fontes e um `<title>` (não aceita `metadata`). Sem `ThemeProvider`: aplica o tema salvo pelo next-themes (`localStorage.theme`) ou o do sistema num efeito. `StatusScreen standalone` (sem seletor de tema; logo com `<a>` comum, que recarrega).
- **"Tentar novamente" = `retry()`** (estável no Next 16.3): por dentro é `startTransition(() => { router.refresh(); reset() })`. O `RetryButton` envolve a chamada no próprio `useTransition`, então mostra **"Tentando de novo…"** (desativado, ícone girando) até a resposta chegar; se falhar de novo, a tela de erro volta.
- **A mensagem do erro nunca aparece na tela:** em produção, erros de Server Component chegam ao navegador com um texto genérico em inglês. Mostramos só o **"Código do erro"** (o `digest`), que é o mesmo do log do servidor (conferido: `2644967712` na tela e no log). `useReportError` registra o erro no console do navegador.
- **`app/not-found.js` (404 geral):** endereço que não existe em nenhum lugar do app (os recursos continuam com os `not-found.js` deles, conferido). Tela inteira com "404" grande em Instrument Serif (gradiente), "Página não encontrada". **Logado → "Ir para o painel"; sem login → "Página inicial" + "Entrar"** (`getCurrentUser()` dentro de `try/catch`: o 404 não pode quebrar se o Supabase estiver fora). HTTP 404 e `noindex` (o Next põe sozinho). Título "Página não encontrada · InvoiceFlow".
- **`StatusScreen`** (`components/shared/status-screen.jsx`): a moldura das telas inteiras fora do painel — logo, seletor de tema, grade que some nas bordas, brilho (marca; vermelho mais fraco no claro, `bg-destructive/7 dark:bg-destructive/12`), número grande ou ícone, título serif, descrição, ações (largura total no celular) e rodapé.
- **`EmptyState`** ganhou `tone` (`default` | `danger`: brilho, ícone e tinta vermelhos) e `footer` (linha discreta embaixo das ações).
- **Fontes num módulo só:** `src/app/fonts.js` (`fontVariables`), usado pelo layout raiz e pelo `global-error.js`.
- `unauthorized()`/`forbidden()` continuam fora (experimentais).

## O que foi feito

- Novos: `src/app/fonts.js`, `src/app/not-found.js`, `src/app/error.js`, `src/app/global-error.js`, `src/app/(dashboard)/error.js`, `src/app/(public)/quote/[publicId]/error.js`, `src/components/shared/status-screen.jsx`, `src/components/shared/error-fallback.jsx` (`useReportError`, `RetryButton`, `ErrorDigest`).
- Alterados: `src/app/layout.js` (fontes do módulo), `src/components/shared/empty-state.jsx` (`tone`, `footer`).

## Verificação

- `npm run lint` ✅ · `npm test` ✅ 798 · `npm run build` ✅ (`/_not-found` dinâmica, porque olha a sessão).
- **Testado no build de produção** (`next build` + `next start`: o que o usuário vê, sem a camada de erros do modo dev), com **falhas temporárias** ligadas por um cookie de teste (`erro_teste=painel|login|proposta|raiz`) no painel, no login, na proposta e no layout raiz — **removidas depois** (as 3 páginas sem diferença no `git diff`) e build refeito:
  - **painel** (navegando pelo menu): aviso dentro do painel com a sidebar; "Tentar novamente" com a falha → "Tentando de novo… [desativado]" → volta ao aviso; sem a falha → o painel carrega; código igual ao do log do servidor;
  - **login** (sem sessão, `e2e.localhost`): "Algo deu errado" em tela inteira, temas escuro e claro;
  - **proposta**: "Não foi possível abrir a proposta", sem links para o app;
  - **layout raiz**: `global-error` com o CSS e as fontes do app, tema escuro do sistema, `lang="pt-BR"`, título próprio, sem seletor de tema; "Tentar novamente" sem a falha → a página de login volta;
  - **404:** logado ("Ir para o painel") e sem login ("Página inicial" + "Entrar"), HTTP 404 + `noindex`, temas escuro e claro;
  - **celular (360 px):** 404, erro geral e erro do painel sem nada passando da borda, botões com 40 px;
  - regressão: "Cliente não encontrado" (dentro do painel) e "Proposta não encontrada" continuam; console sem erros.
- Nenhum dado criado no banco.

## Problemas encontrados

1. No claro, o brilho vermelho da tela de erro ficou forte demais (rosa): `bg-destructive/7` no claro, `/12` no escuro.
2. Cookie de teste definido na aba errada (`localhost` em vez de `e2e.localhost`): os cookies são por host, a falha do login não disparou na 1ª tentativa.
3. O `next start` (como o `next dev`) deixa o processo `node` na porta 3000 ao ser parado pela ferramenta: encerrado pelo PID depois de conferir a linha de comando (2 vezes).
4. A busca de classes no CSS gerado falhou na 1ª vez por escape errado no `grep` (as classes estavam lá).
