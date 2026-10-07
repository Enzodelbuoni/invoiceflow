# Etapa 07 — Sprint 4: Clientes (CRUD completo)

**Data:** 2026-10-06
**Status:** ✅ Concluída

## Decisões

- **Arquitetura (recomendação da doc do Next 16, `guides/data-security.md`):**
  - **camada de acesso a dados** `server-only` (`src/lib/data/clients.js`) confere o usuário em toda operação e filtra por `user_id`, além do RLS;
  - **Server Actions finas** (`src/actions/clients.js`) revalidam a entrada com o mesmo schema Zod, chamam a camada de dados e devolvem só `{ ok, id }` ou `{ ok: false, message, fieldErrors }`.
- **Exclusão (regra 11 do plano):** exclusão real por enquanto. Quando `quotes` existir (Sprint 10), a FK `client_id` deve usar **ON DELETE RESTRICT**. A camada de dados já traduz o erro 23503 para "Este cliente tem orçamentos e não pode ser excluído".
- **Dados brasileiros:** telefone e CPF/CNPJ guardados **só com dígitos** (com CHECK no banco); máscara só na interface. CPF/CNPJ validados com dígitos verificadores (`src/lib/br.js`).
- `ClientDialog` do plano (criação rápida em diálogo) **ficou para o Sprint 6** (seletor de cliente do construtor de orçamentos), onde ele faz sentido.

## O que foi feito

- **Migração** `20261006181806_create_clients.sql`:
  - tabela `clients` (user_id default `auth.uid()` → `profiles.id` cascade; CHECKs de nome 2–120, e-mail, telefone 10–11 dígitos, documento 11/14 dígitos e tamanhos);
  - índice `(user_id, name)`; gatilho `set_updated_at`;
  - RLS com 4 políticas do dono (select/insert/update/delete, `with check` no insert/update);
  - `revoke all` + grants mínimos.
  - **Advisors: sem problemas.**
- `src/lib/br.js`: `onlyDigits`, `isValidCpf`, `isValidCnpj`, `formatDocument`, `formatPhone` (14 casos testados).
- `src/lib/validations/client.js`: `clientSchema` (normaliza para o banco: trim, "" → null, só dígitos) + `EMPTY_CLIENT_FORM`.
- `src/lib/data/clients.js`: `listClients({ query })` (busca ilike em nome/empresa/e-mail, com o termo sanitizado), `getClient` (com `cache` do React; UUID inválido → null), `insertClient`, `updateClient`, `deleteClient` + `DataError`.
- `src/actions/clients.js`: `createClientAction`, `updateClientAction`, `deleteClientAction` (+ `revalidatePath`).
- `src/lib/format.js`: `formatShortDate` ("6 de out. de 2026").
- **Componentes** (`src/components/clients/`):

  | Componente | O quê |
  |---|---|
  | `client-avatar.jsx` | iniciais com tom estável derivado do nome, contraste AA nos dois temas |
  | `client-form.jsx` | seções Contato / Empresa e documento / Observações; máscaras; erros do servidor por campo; criar e editar |
  | `client-search.jsx` | `?q=` na URL, debounce de 300 ms, spinner, limpar |
  | `client-row-actions.jsx` | menu ⋯ com ver, editar e excluir |
  | `delete-client-dialog.jsx` | AlertDialog com "Excluindo…" |
  | `client-detail-actions.jsx` | botão Excluir da página de detalhes |
- **Rotas:**
  - `/clients` (em `clients/(list)/` com `loading.js` próprio): tabela no desktop, cartões no mobile, contador, estado vazio e "nenhum resultado";
  - `/clients/new`;
  - `/clients/[id]`: contato (mailto, WhatsApp `wa.me/55…`), dados, observações, espaço para orçamentos, `generateMetadata` com o nome;
  - `/clients/[id]/edit`;
  - `/clients/[id]/not-found.js`.
- shadcn `alert-dialog` instalado (sem sobrescrever o `button.jsx`).

## Verificação

- `npm run lint` ✅ · `npm run build` ✅.
- **Ponta a ponta com o banco real** (conta de teste apagada no fim; o banco ficou com 0 usuários, perfis e clientes):
  - lista vazia;
  - envio vazio → erro e foco no nome;
  - telefone e CPF inválidos → erros ao sair do campo, que somem ao corrigir;
  - máscaras `(11) 93456-7890` e `##.###.###/####-##`;
  - criar 2 clientes;
  - busca "aurora" → 1 resultado; "zzz" → "Nenhum cliente encontrado";
  - detalhes (título da aba, CPF e telefone formatados, link de WhatsApp);
  - edição com valores pré-formatados → toast → detalhes atualizados;
  - UUID inexistente e id inválido → "Cliente não encontrado";
  - excluir → "Excluindo…" → toast → lista atualizada.
- **RLS:**
  - dono vê 1;
  - outro usuário vê 0;
  - anon recebe permissão negada;
  - insert no nome de outro é bloqueado;
  - transferir `user_id` é bloqueado;
  - outro usuário apaga 0;
  - CHECK de telefone no banco funciona.

## Problemas encontrados

1. **Bug da máscara (corrigido):** aplicar a máscara com `setValue` dentro do `onChange` do `register` faz o RHF **pular a revalidação** do campo (ele compara o valor do evento com o do form, que mudou). Resultado: um erro ficava preso mesmo depois de corrigido. **Solução:** mudar `event.target.value = mask(...)` e então chamar `registration.onChange(event)`.
2. **Testes em aba oculta:**
   - páginas com `loading.js` (streaming) deixam o conteúdo numa `div[hidden]` até um `requestAnimationFrame`, que não roda em aba oculta, então nada hidrata;
   - capturas de tela expiram ("renderer frozen");
   - o `blur` sintético não serve, porque o React escuta `focusout`.

   Saídas: testar interações em páginas sem streaming ou com a aba visível, e disparar `focusout`. **Não é bug do app.**
