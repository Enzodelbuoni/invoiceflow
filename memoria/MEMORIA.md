# MEMÓRIA DO PROJETO — InvoiceFlow

> **Para o Claude:** este arquivo é carregado automaticamente em toda sessão (via `CLAUDE.md`).
> Ele é a fonte da verdade sobre o andamento do projeto. Ao concluir uma etapa:
> 1. Crie `memoria/etapas/etapa-XX-<nome>.md` com o detalhe do que foi feito.
> 2. Atualize as seções **Estado atual**, **Próximo passo**, **Pendências**, **Decisões** e **Histórico** abaixo.
> 3. Marque os sprints concluídos no **Roadmap**.

---

## Resumo do projeto

SaaS para freelancers criarem propostas/orçamentos profissionais: clientes, serviços, construtor de orçamento com cálculo automático (subtotal, desconto, impostos, total), status (rascunho → enviado → visualizado → aprovado/recusado), link público para o cliente aprovar com aceite eletrônico, PDF, compartilhamento por WhatsApp e métricas de conversão.

- Requisitos: `docs/info.txt`
- Plano completo (22 sprints, modelagem, regras de negócio): `docs/InvoiceFlow_Plano_de_Desenvolvimento.txt`

## Forma de trabalho combinada com o usuário

- Idioma: **português**.
- Construir **em etapas pequenas**: fazer um pouco → reportar o que foi feito → seguir. Nunca tentar fazer tudo de uma vez.
- **Avisar o usuário sempre que houver algum problema** (erros, decisões que dependem dele, riscos).
- Ao fim de cada etapa, registrar tudo nesta pasta `memoria/`.

## Estado atual

- **Data da última atualização:** 2026-10-06
- **Local do projeto:** `C:\dev\invoiceflow` (movido para fora do OneDrive na etapa 2 — o caminho antigo em `OneDrive\Área de Trabalho\meus-projetos\invoiceflow` não deve mais ser usado)
- **Fase:** 1 — Setup & Design System
- **Concluído:** Sprint 1 (inicialização), exceto criação do projeto Supabase, que depende do usuário.
- **Build:** `npm run lint` ✅ · `npm run build` ✅ · `npm run dev` ✅ (página abre em http://localhost:3000)

## Próximo passo

**Sprint 2 — Design System:**
1. Definir identidade visual (cor primária da marca, cores de status) em `src/app/globals.css`.
2. Adicionar componentes shadcn: button, input, label, textarea, select, card, dialog, dropdown-menu, table, badge, avatar, skeleton, sonner (toast), sheet, separator, tooltip, sidebar.
3. Criar o layout da área privada: Sidebar | Header | Conteúdo (sidebar vira Sheet no mobile).
4. Criar `StatusBadge` e `EmptyState` compartilhados.

## Pendências com o usuário

- [ ] **Criar projeto no Supabase** (supabase.com) e informar `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` → colocar em `.env.local` (copiar de `.env.example`). Necessário antes do Sprint 3 (Auth).
- [x] ~~Projeto dentro do OneDrive~~ → resolvido na etapa 2 (movido para `C:\dev\invoiceflow`).
- [ ] Criar repositório remoto no GitHub (opcional, quando o usuário quiser).
- [ ] (Opcional, requer admin) Adicionar `C:\dev` às exclusões do Windows Defender para acelerar `npm install`/build. Não foi feito — só sugerido.

## Decisões técnicas (importante lembrar)

- **Next.js 16.3.8** — tem mudanças em relação a versões antigas. Ler `node_modules/next/dist/docs/` antes de usar APIs (ver `AGENTS.md`).
  - `middleware.js` agora se chama **`proxy.js`** (fica em `src/proxy.js`, função exportada `proxy`).
  - `params`, `searchParams`, `cookies()` e `headers()` são **assíncronos** (usar `await`).
  - Turbopack é o bundler padrão em dev e build.
- **JavaScript puro**, sem TypeScript (`jsconfig.json` com alias `@/*` → `./src/*`).
- **shadcn/ui 4.x** com base **Radix** e preset **Nova** (ícones Lucide, fonte Geist). `components.json` com `tsx: false`.
  - O helper `cn()` vem do pacote `cn` (substituto de clsx + tailwind-merge, mantido pelo shadcn): `src/lib/utils.js`.
  - O pacote `shadcn` fica em `dependencies` porque o `globals.css` importa `shadcn/tailwind.css`.
- **Tailwind v4** — configuração via CSS (`@theme inline` no `globals.css`), sem `tailwind.config.js`.
- **Supabase:** `@supabase/ssr` com `getAll`/`setAll`. Variáveis: `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (nova nomenclatura; a chave anon legada também funciona).
  - `src/lib/supabase/client.js` → browser · `src/lib/supabase/server.js` → servidor (`import "server-only"`) · `src/lib/supabase/env.js` → leitura/validação das env vars.
  - O helper do proxy de sessão será `src/lib/supabase/proxy.js` (o plano original chamava de `middleware.js`).
- **Zod v4** + `@hookform/resolvers` v5 (compatível com Zod 4).
- **Rotas com route groups:** `(public)`, `(auth)`, `(dashboard)` conforme o plano. A home está em `src/app/(public)/page.js`.
- **Finais de linha:** `.gitattributes` força LF; `.vscode/settings.json` usa `files.eol: "\n"`.
- **VS Code do projeto** (`.vscode/settings.json`): `*.css` associado a `tailwindcss` (evita falsos avisos de `@theme`/`@apply`), autocomplete de classes em `cn()`/`cva()`, `.next` fora da busca/watcher. Extensões recomendadas: Tailwind CSS IntelliSense, ESLint, Prettier (o usuário já tem as três).
- `package.json` declara `engines.node >= 20.9.0` (mínimo do Next 16).
- Os documentos originais do usuário foram movidos para `docs/`.

## Problemas conhecidos / avisos

- `npm audit` acusa 5 vulnerabilidades "high" no pacote `braces` (via `fast-glob`/`micromatch`), usado apenas por ferramentas de dev (eslint-plugin-next e CLI do shadcn). Não vai para o bundle do navegador. Não rodar `npm audit fix --force` (quebraria versões).
- No Windows, ao parar o `npm run dev` em background, o processo `node` filho pode continuar escutando a porta 3000. Verificar com `Get-NetTCPConnection -LocalPort 3000 -State Listen`, conferir pela linha de comando (`Get-CimInstance Win32_Process`) que é o `next ... start-server.js` do invoiceflow e só então encerrar o PID.

## Histórico de etapas

| # | Data       | Etapa                                   | Detalhes |
|---|------------|-----------------------------------------|----------|
| 1 | 2026-10-06 | Sprint 1 — Inicialização do projeto     | [etapa-01-setup.md](etapas/etapa-01-setup.md) |
| 2 | 2026-10-06 | Mudança para fora do OneDrive + ajustes de ambiente | [etapa-02-mudanca-de-pasta.md](etapas/etapa-02-mudanca-de-pasta.md) |

## Roadmap (do plano de desenvolvimento)

**Fase 1 — Setup & Design System**
- [x] Sprint 1 — Inicialização (falta só o projeto Supabase do usuário)
- [ ] Sprint 2 — Design System + layout (sidebar/header/sheet mobile)

**Fase 2 — Autenticação & Clientes/Serviços**
- [ ] Sprint 3 — Autenticação (signup, login, logout, recuperação, proxy, profiles)
- [ ] Sprint 4 — Clientes (CRUD, RHF + Zod)
- [ ] Sprint 5 — Serviços (CRUD)

**Fase 3 — Quote Builder**
- [ ] Sprint 6 — Estrutura do construtor
- [ ] Sprint 7 — React Hook Form + Zod (useFieldArray)
- [ ] Sprint 8 — Motor de cálculos (função pura + testes)
- [ ] Sprint 9 — Zustand (estado de UI)
- [ ] Sprint 10 — Persistência (draft, quote_number, public_id, snapshot)

**Fase 4 — Visualização, Exportação & Assinatura**
- [ ] Sprint 11 — QuotePreview
- [ ] Sprint 12 — Máquina de estados
- [ ] Sprint 13 — Imutabilidade
- [ ] Sprint 14 — Página pública
- [ ] Sprint 15 — Aprovação/aceite
- [ ] Sprint 16 — PDF
- [ ] Sprint 17 — Compartilhamento (link + WhatsApp)

**Fase 5 — Dashboard, Métricas & Polimento**
- [ ] Sprint 18 — Dashboard
- [ ] Sprint 19 — Lista de orçamentos (busca, filtros)
- [ ] Sprint 20 — Responsividade
- [ ] Sprint 21 — Estados de UX
- [ ] Sprint 22 — Qualidade (a11y, testes, CI/CD, deploy, README final)
