# Etapa 01 — Sprint 1: Inicialização do projeto

**Data:** 2026-10-06
**Status:** ✅ Concluída (exceto criação do projeto Supabase, que depende do usuário)

## O que foi feito

1. **Ambiente verificado:** Node 22.14.0, npm 10.9.2, git 2.49.
2. **Documentos movidos:** `info.txt` e `InvoiceFlow_Plano_de_Desenvolvimento.txt` foram para `docs/` (o `create-next-app` exige pasta vazia, e `docs/` é permitida).
3. **Projeto Next.js criado** com `create-next-app@16.3.8`:
   - Flags: `--js --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-react-compiler --agents-md`
   - Gerou `AGENTS.md` e `CLAUDE.md` (que importa o `AGENTS.md`), além do repositório git com commit inicial.
4. **shadcn/ui inicializado:** `shadcn@4.21.3 init -b radix -p nova --pointer`
   - Gerou `components.json` (style `radix-nova`, `tsx: false`, ícones lucide).
   - Instalou: `radix-ui`, `class-variance-authority`, `cn`, `lucide-react`, `tw-animate-css`, `shadcn`.
   - Reescreveu `src/app/globals.css` com os tokens de tema (oklch, claro/escuro).
5. **Dependências da stack instaladas:**
   - `@supabase/supabase-js@^2.117.2`, `@supabase/ssr@^0.12.7`
   - `react-hook-form@^7.89.0`, `zod@^4.6.5`, `@hookform/resolvers@^5.9.1`
   - `zustand@^5.0.15`
6. **Supabase configurado no código** (sem credenciais ainda):
   - `src/lib/supabase/env.js`: `isSupabaseConfigured()` e `getSupabaseEnv()` (erro claro em português se faltar variável).
   - `src/lib/supabase/client.js`: `createClient()` para o navegador.
   - `src/lib/supabase/server.js`: `createClient()` assíncrono para o servidor (cookies via `await cookies()`).
   - `.env.example` com as variáveis necessárias; `.gitignore` ajustado com `!.env.example`.
7. **Layout raiz:** `lang="pt-BR"`, metadata do InvoiceFlow com template de título, fonte Geist ligada à variável `--font-sans` (a que o tema do shadcn espera).
8. **Home provisória** em `src/app/(public)/page.js`: título, descrição e, só em desenvolvimento, um indicador de "Supabase configurado/não configurado".
9. **Limpeza:** removidos `src/app/page.js` e os SVGs de exemplo de `public/`.
10. **`.gitattributes`** forçando finais de linha LF.
11. **README** reescrito em português.
12. **Sistema de memória:** pasta `memoria/` + `CLAUDE.md` importando `memoria/MEMORIA.md`.

## Verificação

- `npm run lint` → sem erros.
- `npm run build` → compilou (rotas `/` e `/_not-found`, estáticas).
- `npm run dev` → `GET / 200`, HTML com `lang="pt-BR"`, título correto e o aviso "Supabase não configurado".

## Arquivos criados/alterados

```
.env.example                      (novo)
.gitattributes                    (novo)
.gitignore                        (alterado: !.env.example)
CLAUDE.md                         (alterado: importa a memória)
README.md                         (reescrito)
components.json                   (novo, shadcn)
docs/                             (documentos do usuário)
memoria/MEMORIA.md                (novo)
memoria/etapas/etapa-01-setup.md  (novo)
package.json / package-lock.json  (dependências)
src/app/layout.js                 (pt-BR, metadata, fonte)
src/app/globals.css               (tema shadcn)
src/app/(public)/page.js          (home provisória)
src/lib/utils.js                  (cn)
src/lib/supabase/{env,client,server}.js
```

## Pendências deixadas

- Usuário precisa criar o projeto Supabase e preencher `.env.local`.
- Decidir se o projeto sai do OneDrive.
