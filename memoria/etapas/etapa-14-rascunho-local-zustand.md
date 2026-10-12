# Etapa 14 — Sprint 9: rascunho local do construtor (Zustand)

**Data:** 2026-10-12
**Status:** ✅ Concluída.

## Decisões

- **Uso do Zustand escolhido com o usuário:** cópia de segurança local do orçamento que está sendo montado (opção 1 de 3; as outras eram preferências de interface e modo pré-visualização). Atende a regra do plano "evitar perda silenciosa de dados" e respeita "não transformar Zustand em um segundo banco": o formulário continua no RHF, a persistência de verdade será no Supabase (Sprint 10).
- **Store `src/store/quote-draft-store.js`:** `persist` em localStorage (chave `invoiceflow:quote-draft`, versão 1), `drafts` **por usuário** (`{ [userId]: { values, savedAt } }`), storage à prova de falhas (modo privado, cota cheia → "sem rascunho") e **`skipHydration`** (o servidor não tem localStorage; o hook chama `persist.rehydrate()` depois de montar, então o 1º render bate com o HTML do servidor).
- **Fluxo:**
  - ao abrir `/quotes/new` com um rascunho de até **30 dias**: aviso "Você tem um orçamento não salvo" (título, cliente, itens, "guardado neste navegador hoje às 17:37") com **Recuperar** e **Descartar**;
  - **enquanto a pessoa não decide, nada é gravado** (para não sobrescrever o rascunho antigo);
  - decidido (ou sem rascunho): grava a cada alteração com 400 ms de espera, e na hora ao fechar a aba (`pagehide`), ao esconder a página (`visibilitychange`) ou ao sair pelo menu (desmontagem);
  - formulário igual ao vazio → o rascunho é apagado;
  - rascunho vencido (> 30 dias) é descartado sem perguntar.
- **Recuperar limpa o que ficou velho** (`sanitizeDraftValues`): cliente excluído é desmarcado; item cujo serviço foi excluído vira avulso (o snapshot fica); campos ausentes/tipos errados (rascunho de versão antiga) voltam ao valor inicial; no máximo 100 itens. Validade que ficou no passado mostra o erro na hora. `form.reset(values, { keepDefaultValues: true })`, para o "vazio" continuar sendo o orçamento em branco.
- **Sair da conta apaga os rascunhos do navegador** (`clearQuoteDrafts` no "Sair"): eles têm nomes de clientes e preços, e o computador pode ser compartilhado.
- **Indicador discreto** embaixo das ações do resumo: "Cópia de segurança neste navegador · hoje às 17:37". Deixa claro que o trabalho está protegido e que ainda NÃO foi salvo na conta. Assina só o `savedAt` do store, para os salvamentos automáticos não re-renderizarem o formulário.
- **Ao salvar no servidor (Sprint 10), apagar o rascunho local** (`removeDraft(userId)`) antes de navegar, senão a desmontagem gravaria de novo.

## O que foi feito

- `src/lib/dates.js`: `formatMomentRelative` ("hoje às 14:32", "ontem às 09:05", "3 de out. às 18:40", com o ano se for outro), no fuso de SP (+ testes, inclusive virada de dia UTC × SP).
- `src/lib/quote-draft.js` (+ testes): `QUOTE_DRAFT_MAX_AGE_DAYS`, `isDraftExpired`, `hasDraftContent`, `sanitizeDraftValues`.
- `src/store/quote-draft-store.js`: `useQuoteDraftStore` (`saveDraft`, `removeDraft`), `clearQuoteDrafts`, `QUOTE_DRAFT_STORAGE_KEY`.
- `src/hooks/use-quote-draft.js` (`useQuoteDraft`): hidratação, aviso, gravação automática (`form.subscribe`), recuperar/descartar, foco no 1º campo depois da escolha.
- `src/components/quotes/quote-draft.jsx`: `QuoteDraftBanner` (entra e sai com animação de altura) e `QuoteDraftStatus`.
- `quote-form.jsx`: recebe `userId`; aviso acima do formulário (`AnimatePresence` dentro de um `<div>`); indicador no rodapé do resumo (`footer` do `QuoteSummary`).
- `quotes/new/page.js`: `requireUser()` em paralelo com clientes e serviços (passa `user.id`).
- `nav-user.jsx`: "Sair" chama `clearQuoteDrafts()`.

## Verificação

- `npm run lint` ✅ · `npm test` ✅ **462 testes** (eram 440) · `npm run build` ✅.
- Chrome (`localhost:3000`, sessão de teste do usuário; nada gravado no banco; o rascunho de teste foi apagado do localStorage no fim):
  - sem rascunho: sem aviso e sem indicador;
  - digitar título e item → localStorage com o rascunho (versão 1, 1 usuário) e indicador "hoje às 17:37";
  - recarregar → aviso com título, "1 item" e horário; formulário em branco;
  - digitar com o aviso aberto **não** altera o rascunho guardado;
  - Recuperar → título, item e preço de volta, subtotal/total recalculados, toast, foco no cliente, indicador visível;
  - sair para `/clients` pelo menu e voltar → aviso de novo (gravou ao desmontar);
  - Descartar → rascunho removido, formulário em branco, foco no cliente;
  - digitar e apagar tudo → rascunho removido;
  - celular (390 px) sem rolagem horizontal; console sem erros de hidratação.
- **Não testado no navegador:** "Sair" apagando os rascunhos (sair derrubaria a sessão do usuário, e não entro com senha); conferido pelo código.

## Problemas encontrados

- Nenhum bug novo. Cuidados registrados: não gravar enquanto o aviso está aberto; `keepDefaultValues` no `reset`; `structuredClone` dos valores antes de guardar (o RHF continua mexendo no objeto).
- Limitação conhecida: duas abas montando orçamentos ao mesmo tempo gravam no mesmo rascunho (vale o último). Aceitável para um rascunho local.
