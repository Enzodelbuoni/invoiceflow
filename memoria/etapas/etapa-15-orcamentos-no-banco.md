# Etapa 15 — Sprint 10 (parte 1): tabelas de orçamento no banco

**Data:** 2026-10-12
**Status:** ✅ Concluída. Migração aplicada no Supabase remoto e testada; o app ainda não grava (parte 2).

## Decisões

- **Migração `20261012204730_create_quotes.sql`** (aplicada com `db push --linked`):
  - `public.quotes`: número (`quote_number` "2026-001"), `public_id` aleatório e único (regra 8), status com CHECK (default `draft`), validade, desconto (`discount_type` + `discount_value`), `tax_rate_bps`, totais em centavos, notas/termos, datas de envio/aprovação/recusa;
  - `public.quote_items`: posição (0–99), snapshot do serviço (nome, descrição, unidade, preço), `quantity_hundredths`, `subtotal_cents`;
  - `private.quote_counters` + `private.next_quote_number()`: numeração por usuário e ano (fuso de SP);
  - `public.create_quote(p_quote jsonb, p_items jsonb)`: RPC que cria orçamento + itens + número **numa transação só**.
- **FKs compostas com `user_id`** (`clients(id, user_id)`, `services(id, user_id)`, `quotes(id, user_id)`): a checagem de FK do Postgres **ignora o RLS**, então uma FK simples deixaria um usuário apontar o orçamento para o cliente ou serviço de outra pessoa (e travar a exclusão dele). `quote_items` ganhou `user_id` (o RLS dos itens fica simples e rápido, sem `exists`).
- **`quotes.client_id` com `ON DELETE NO ACTION`, e não `RESTRICT`** (mudança em relação ao que estava planejado): excluir um cliente com orçamentos continua bloqueado (erro 23503, que a camada de clientes já traduz). Com `RESTRICT`, porém, **excluir a conta falharia**: a checagem é imediata e a cascata de `profiles` tentaria apagar os clientes antes dos orçamentos. Com `NO ACTION`, a checagem fica para o fim do comando.
- **`quote_items.service_id`: `ON DELETE SET NULL (service_id)`** (sintaxe do PG 15+, só zera essa coluna da FK composta).
- **O banco confere os totais** com as mesmas regras do motor de cálculos (arredondamento meio para cima = `round()` de numeric positivo):
  - CHECKs por linha: subtotal do item; total do desconto (percentual ou `least(valor, subtotal)`); imposto sobre (subtotal − desconto); `total = subtotal − desconto + imposto`;
  - na função: subtotal = soma dos itens, 1–100 itens, validade de hoje até +365 dias.
  O app calcula (Sprint 8) e o banco recusa qualquer número incoerente.
- **Contador fora da API:** schema `private` (o PostgREST não expõe), sem permissões para `anon`/`authenticated`; só a função SECURITY DEFINER (que confere `auth.uid()`) toca nele. Assim ninguém zera o contador para gerar números repetidos. Números com mais de 3 dígitos continuam inteiros ("2026-1000"; o `lpad` puro cortaria).
- **RLS:** dono lê/cria/altera/exclui os próprios orçamentos e itens; **inserção só como `draft`** e sem datas de envio/aprovação (a máquina de estados do Sprint 12 vai controlar as mudanças de status: hoje um UPDATE direto ainda poderia mudar o status do próprio orçamento).
- `create_quote` é SECURITY INVOKER (o RLS vale); `EXECUTE` revogado de `public`/`anon`.

## O que foi feito

- Migração (acima), `db push --linked --dry-run` → `db push --linked --yes`.
- **Advisors:** nenhum problema da migração. Única observação (não é desta etapa): **"Leaked Password Protection Disabled"** (Auth; checagem de senhas vazadas no HaveIBeenPwned) → anotado nas pendências antes do deploy.
- **Teste de RLS/regras no banco: 24/24**, num bloco `DO` que termina em `RAISE EXCEPTION` (tudo desfeito; o banco continuou com 1 usuário, 1 cliente, 0 orçamentos, 0 contadores). Script em `memoria/etapas/etapa-15-teste-rls.sql`. Casos:
  - números 2026-001, 2026-002 e, depois de falhas, 2026-003 (falha não deixa buraco); contador em 999 → 2026-1000;
  - desconto 10% + imposto 5% com os mesmos números do motor (total 115810);
  - recusados: subtotal ≠ soma dos itens, desconto incoerente, subtotal de item incoerente, cliente de outro usuário, serviço de outro usuário, validade no passado e acima de 1 ano, zero itens, inserção direta como "aprovado";
  - contador inacessível; excluir cliente com orçamentos → 23503; excluir serviço → item com `service_id` NULL e snapshot intacto;
  - outro usuário: não vê orçamentos nem itens, não altera, não exclui e não consegue pôr itens no orçamento alheio;
  - `anon`: sem leitura e sem `create_quote`;
  - excluir a conta apaga tudo em cascata.
- `src/lib/validations/quote-migration.test.js`: confere que os limites da migração são os do app (textos, status, valores, percentuais, unidades, itens, validade).

## Verificação

- `npm run lint` ✅ · `npm test` ✅ **467 testes** · `npm run build` ✅.

## Problemas encontrados

- Nenhum erro. Duas armadilhas evitadas no desenho: FK simples atravessando usuários (resolvido com FKs compostas) e `RESTRICT` quebrando a exclusão de conta (resolvido com `NO ACTION`).
