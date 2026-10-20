# Etapa 34 — Sprint 21 (parte 3): sem conexão e sessão expirada no meio de uma ação

**Data:** 2026-10-20
**Status:** ✅ Concluída. Sem migração. Nenhum dado de teste ficou no banco.

## O que estava errado (medido no navegador antes de mexer)

1. **Sem conexão** nos formulários de cliente e serviço (página e cadastro rápido no construtor): a exceção da action ficava solta (`unhandledrejection` "Failed to fetch"), o botão voltava ao normal e **nenhum aviso aparecia**.
2. **Sessão expirada** (ex.: saiu da conta em outra aba): o proxy redirecionava também o POST da Server Action para `/login`; o `fetch` seguia o redirecionamento, recebia a página de login (HTML) e o Next lançava **"An unexpected response was received from the server."** — de novo sem aviso (no construtor isso aparecia como "sem conexão", o que era enganoso). Nada era gravado (a action nem rodava).

Simulação usada (sem tocar na sessão real do usuário): trocar o `window.fetch` da página — recusar os pedidos com cabeçalho `Next-Action` (sem conexão) ou mandá-los com `credentials: "omit"` (o servidor vê alguém deslogado). Para navegação, o mesmo com o cabeçalho `RSC`.

## Decisões

- **Proxy não redireciona pedidos de Server Action** (`isServerActionRequest`: cabeçalho `Next-Action`). A doc do Next 16 diz que as Server Functions são POSTs para a rota onde são usadas e que **cada uma deve conferir o login por conta própria** — a nossa camada de dados já faz isso (`getDataContext` → `DataError("unauthenticated", "Sua sessão expirou. Entre novamente.")`). O proxy continua renovando os cookies nesses pedidos e redirecionando as navegações normais.
- **`loginPath(next)`** em `lib/auth/redirect.js` (usado pelo proxy): `/login?next=<caminho interno codificado>`, ou só `/login` se o destino não for interno.
- **`toFailure` devolve o `code` do `DataError`** (`{ ok: false, message, code, fieldErrors? }`). Os códigos são identificadores internos sem dados ("not_found", "unauthenticated"…).
- **`src/lib/action-client.js`** (navegador): `runAction(call)` chama a action sem deixar exceção escapar — sem resposta vira `{ ok: false, offline: true, message: OFFLINE_MESSAGE }`; resultado `unauthenticated` dispara `notifySessionExpired()`; sucesso tira o aviso de sessão da tela. `OFFLINE_MESSAGE` passou a ser um só (estava repetido em 5 lugares, inclusive na página pública e no PDF).
- **Aviso de sessão expirada:** toast fixo (`id: "session-expired"`, `duration: Infinity`) "Sua sessão expirou · Entre de novo (abre em outra aba) e tente outra vez aqui. Nada do que você preencheu se perde." com o botão **"Entrar novamente"**, que abre **`/login` numa nova aba** (`window.open(…, "_blank", "noopener")`). Motivo: levar ao login na mesma aba perderia o que foi digitado nos formulários de cliente/serviço (só o construtor tem cópia local). Depois de entrar na outra aba, os cookies valem nesta, e "Salvar" de novo funciona. (Padrão de apps como o Google Docs.)
- **Onde vale:** formulários de cliente e serviço (página e diálogo de cadastro rápido: mensagem no `FormAlert` + aviso), `ConfirmActionDialog` (enviar, cancelar, excluir: mensagem no diálogo + aviso), duplicar (o toast "Duplicando…" some e fica só o aviso), construtor (só o aviso de sessão; "sem conexão" continua com o texto "O orçamento continua guardado neste navegador"), aprovar/recusar na página pública (só sem conexão; ali não há sessão).
- **Navegação com a sessão expirada** já funcionava: o Next segue o redirecionamento do proxy e abre `/login?next=<página>` sem erro (medido). Nada mudou ali.
- Não feito (possível melhoria): avisar no login "sua sessão expirou". O proxy não distingue "nunca entrou" de "saiu em outra aba" (os dois chegam sem cookie).

## O que foi feito

- `src/lib/action-client.js` (+ `action-client.test.js`, 9 testes), `src/lib/auth/redirect.js` (`loginPath`, `isServerActionRequest`, + testes), `src/lib/supabase/proxy.js`, `src/lib/action-result.js` (`code`, + teste).
- `runAction` em: `client-form.jsx`, `client-dialog.jsx`, `service-form.jsx`, `service-dialog.jsx`, `confirm-action-dialog.jsx`, `use-duplicate-quote.js`, `quote-form.jsx`, `approve-quote-dialog.jsx`, `decline-quote-dialog.jsx`. `OFFLINE_MESSAGE` saiu de `response-summary.jsx` e do `pdf-download.js`.

## Verificação

- `npm run lint` ✅ · `npm test` ✅ **814 testes** (eram 798) · `npm run build` ✅.
- Chrome (`localhost:3000`, sessão de teste do usuário):
  - **Novo cliente sem conexão:** "Não foi possível falar com o servidor…" no formulário, nome mantido, nenhuma rejeição solta;
  - **Novo cliente com a sessão expirada:** resposta 200 da própria action (sem redirecionamento), "Sua sessão expirou. Entre novamente." no formulário + aviso com "Entrar novamente" → abre `/login` em nova aba (interceptado); formulário intacto. Com os cookies de volta, enviar de novo salvou e o aviso saiu;
  - **Construtor** (cliente + item preenchidos) com a sessão expirada: só o aviso de sessão, nada salvo, formulário intacto;
  - **Excluir cliente** (confirmação) com a sessão expirada: erro dentro do diálogo + aviso; com os cookies de volta, excluiu;
  - **Novo serviço** com a sessão expirada: mesmo comportamento;
  - **Navegar** pelo menu com a sessão expirada → `/login?next=%2Fservices`, sem erro; a sessão real continuou valendo; console sem erros.
- **Limpeza:** o cliente "Teste Sem Conexão" criado no teste foi excluído pela própria tela (banco: 1 usuário, 1 cliente, resto zerado) e a cópia local do construtor criada no teste foi apagada do localStorage.

## Problemas encontrados

1. O `find` da automação rodou antes da navegação terminar (achou a página anterior): esperar a página trocar antes de procurar.
2. O de sempre: `start-server.js` na porta 3000 depois de parar o `npm run dev` (encerrado pelo PID depois de conferir a linha de comando).
