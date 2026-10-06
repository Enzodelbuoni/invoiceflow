# Etapa 04 — Sprint 2 (parte 2): layout da área privada, StatusBadge, EmptyState e polimento visual

**Data:** 2026-10-06
**Status:** ✅ Concluída (Sprint 2 encerrado)

## Contexto

Ao ver a vitrine da etapa 03, o usuário disse que estava tudo "MUITO básico" e pediu **design bonito, profissional, com animações e fontes que combinem**. Esta etapa fechou o Sprint 2 com esse padrão de acabamento, que passa a valer para todas as telas.

## Direção visual

- **Tipografia (par de fontes):**
  - **Instrument Serif** → títulos de página, estados vazios, números dos KPIs, parte "Flow" do logo. Classe `font-display`. Só tem peso 400: **nunca usar `font-bold`/`font-semibold` com ela**.
  - **Inter** → interface e textos (`font-sans`), com `cv02 cv03 cv04 cv11` (dígitos abertos e "a" de um andar).
  - **Geist Mono** → códigos e identificadores (`font-mono`).
  - `--font-heading` (usado nos títulos de Card, Dialog e Sheet do shadcn) continua sendo Inter, de propósito.
- **Estilo "app shell inset"**: sidebar sobre um "canvas" levemente acinzentado e conteúdo num painel branco elevado (borda + sombra), como Linear e Vercel. Brilho radial sutil da marca no topo do painel.
- **Neutros com leve tom azulado** (hue 268) nos dois temas. Escuro: canvas `0.145`, painel `0.18`, cards `0.21`.
- **Sombras em camadas** (`--elevation-xs..xl`, mapeadas em `shadow-xs..xl`), tingidas com o hue da marca no claro e com brilho interno de 1px no escuro.
- **Novo token `--primary-ink`** (`text-primary-ink`): índigo para **texto**. No escuro é `oklch(0.75 0.13 268)`, porque o `--primary` (0.55) como texto sobre o fundo escuro ficava abaixo de 4.5:1. Os variants `link` do Button e do Badge passaram a usá-lo.

## Motion

- Biblioteca **`motion` v14.0.0** (`import { motion } from "motion/react"`). API conferida: `layoutId`, `AnimatePresence`, `MotionConfig`.
- `MotionConfig reducedMotion="user"` nos providers, e CSS global zerando animações e transições com `prefers-reduced-motion: reduce`.
- Tokens no `globals.css` (`@theme`): `ease-out-quart`, `ease-out-expo`, `ease-spring`, `animate-enter` (fade + 10px para cima), `animate-float` e `animate-float-delayed`. Os keyframes usam a propriedade `translate`, para compor com `rotate-*`.
- Onde há animação:
  - **Entrada das páginas:** `src/app/(dashboard)/template.js` remonta a cada navegação. Cada filho direto da página entra em sequência (0, 80, 160, 240, 320 ms). Cards dos KPIs e das configurações têm stagger próprio (60 ms).
  - **Indicador ativo da sidebar:** `motion.span` com `layoutId="sidebar-active-item"` desliza entre os itens (mola stiffness 520 / damping 42).
  - **Trilha do header:** crossfade com blur ao trocar de página (`AnimatePresence mode="popLayout"`).
  - **Troca de tema:** revelação circular a partir do botão, via **View Transitions API** (`document.startViewTransition` + `clip-path` em `::view-transition-new(root)`). Sem suporte ou com movimento reduzido, troca na hora. O sol e a lua giram e escalam com CSS (`dark:`).
  - **Estado vazio:** folhas de papel flutuando (`animate-float`).
  - **Botão "Novo orçamento" da sidebar:** sobe 1px no hover, com sombra.

## O que foi criado

| Arquivo | O quê |
|---|---|
| `src/lib/constants/quote-status.js` | `QUOTE_STATUS`, `QUOTE_STATUS_VALUES`, `QUOTE_STATUS_LABELS` (pt-BR), `QUOTE_STATUS_DESCRIPTIONS`, `isQuoteStatus()`. Valores em inglês no banco. |
| `src/lib/format.js` | `formatCurrency` (BRL), `formatPercent` (recebe fração), `formatLongDate` (fuso America/Sao_Paulo). Fica em `lib/format.js` porque `lib/utils.js` já existe como arquivo. |
| `src/components/shared/status-badge.jsx` | Selo com **cor + ícone + texto** por status (PencilLine, Send, Eye, CircleCheck, CircleX, TimerOff, Ban). Tamanhos `sm` e `default`. Server Component. |
| `src/components/shared/empty-state.jsx` | Ilustração em camadas (folhas flutuando, ícone num cartão, brilho da marca, grade com máscara radial), título serif, descrição e ações (`children`). |
| `src/components/shared/coming-soon-button.jsx` | Botão de ação ainda não implementada: mostra toast "Em breve" em vez de levar a uma página 404. **Trocar pelo link real quando a funcionalidade existir.** |
| `src/components/brand/logo.jsx` | `LogoMark` (monograma "F" em bloco com gradiente índigo) e `LogoWordmark` ("Invoice" sans + "*Flow*" serif itálica). |
| `src/components/layout/page-header.jsx` | Cabeçalho das páginas: eyebrow, título serif, descrição e ações. |
| `src/components/layout/nav-items.js` | `NAV_GROUPS`, `SECONDARY_NAV`, `isNavItemActive()`, `findNavItem()`. Os ícones são componentes, então só deve ser importado por Client Components. |
| `src/components/layout/app-sidebar.jsx` | Sidebar `variant="inset"`, `collapsible="icon"`: logo, botão "Novo orçamento", grupos "Visão geral" e "Gestão", Configurações no rodapé, `NavUser`, `SidebarRail`. Fecha o Sheet ao navegar no mobile. |
| `src/components/layout/nav-user.jsx` | Cartão do usuário com avatar em gradiente e menu (Meu perfil, Configurações, Sair). O "Sair" ainda mostra toast. |
| `src/components/layout/app-header.jsx` | Header fixo com blur: trigger da sidebar, trilha de navegação animada e `ThemeToggle`. |
| `src/components/layout/theme-toggle.jsx` | Menu Claro/Escuro/Sistema com a revelação circular. |
| `src/hooks/use-mounted.js` | `useMounted()` via `useSyncExternalStore` (`false` no servidor e na hidratação). |
| `src/app/(dashboard)/layout.js` | `SidebarProvider` (lê o cookie `sidebar_state`), link "Pular para o conteúdo", `AppSidebar`, `SidebarInset` (no desktop o painel rola por dentro; no mobile rola a página). Usuário placeholder `PLACEHOLDER_USER` (**TODO Sprint 3**). |
| `src/app/(dashboard)/template.js` | Animação de entrada em sequência das páginas. |
| `src/app/(dashboard)/{dashboard,quotes,clients,services,settings}/page.js` | Páginas iniciais: dashboard com 4 KPIs zerados + estado vazio; orçamentos com estado vazio + cartão "Como funciona o ciclo de um orçamento" (usa o StatusBadge); clientes e serviços com estado vazio; configurações com 3 cartões "Em breve". |

## Alterações em arquivos existentes

- `src/app/layout.js`: fontes Inter, Instrument Serif e Geist Mono (saiu a Geist Sans).
- `src/app/globals.css`: neutros azulados, `--primary-ink`, `--font-display`, elevação, motion, `::selection`, view transitions, reduced motion.
- `src/components/providers.jsx`: `MotionConfig reducedMotion="user"`.
- `src/components/ui/{dialog,sheet,sidebar}.jsx`: textos de acessibilidade traduzidos ("Fechar", "Menu de navegação", "Alternar menu lateral"…).
- `src/components/ui/{button,badge}.jsx`: variant `link` usa `text-primary-ink`.
- `src/app/(public)/design-system/`: vitrine com seção de tipografia, StatusBadge (2 tamanhos), EmptyState e `ThemeToggle` real (o `ThemeDemo` foi removido).
- CRLF → LF nos componentes `src/components/ui/*.jsx` gerados pelo shadcn (depois do commit da etapa 03).

## Contraste (WCAG AA) dos novos neutros

| Par | Claro | Escuro |
|---|---|---|
| foreground / background | 18.82 | 17.24 |
| muted-foreground / background | 6.01 | 7.58 |
| muted-foreground / muted | 5.46 | 6.45 |
| muted-foreground / sidebar | 5.59 | 7.97 |
| sidebar-foreground / sidebar | 12.70 | 12.52 |
| primary-ink (texto) / sidebar-accent | 5.16 | 7.47 |
| pior status (cancelled) sobre card escuro tingido | — | 5.88 |

## Verificação

- `npm run lint` ✅ · `npm run build` ✅. `/dashboard`, `/quotes`, `/clients`, `/services` e `/settings` são dinâmicas (ƒ) porque o layout lê o cookie da sidebar, o que é esperado.
- Chrome (monitor ultrawide, viewport 3018 px):
  - Dashboard e Orçamentos testados nos temas escuro e claro.
  - Sidebar recolhida (Ctrl+B) em modo ícones.
  - Navegação pelas 5 páginas pela sidebar com **console sem erros nem avisos**.
- Mobile (iframes de 390 px): sem rolagem horizontal; menu vira Sheet com título acessível; KPIs em 2 colunas.
- Classes Tailwind arbitrárias (`bg-size-[28px_28px]`, `mask-[radial-gradient(...)]`) e keyframes confirmados no CSS gerado.

## Observações e problemas encontrados

- **Separador vertical do header** aparecia no topo: o `data-vertical:self-stretch` do shadcn com altura fixa alinha no início. Corrigido com `data-vertical:self-center`.
- **Logo:** a primeira versão tinha um ponto ao lado do "F" e parecia "F.". O ponto foi removido.
- **`disableTransitionOnChange` do next-themes** desliga todas as transições na troca de tema. Por isso a animação do tema é feita pela View Transitions API (a classe é aplicada dentro do callback), e não por transições CSS.
- **Erros `removeChild` no console durante os testes** foram causados pelo próprio teste (apaguei o `<body>` para montar iframes e o hot reload tentou atualizar o React). Num carregamento limpo o console fica sem erros.
- **Testes de mobile no Chrome:** `resize_window` não altera a viewport neste monitor. Usar iframes de 390 px numa página descartável e recarregar a aba depois.
- O indicador do Next.js em modo dev (círculo "N" no canto inferior esquerdo) cobre o avatar do usuário. Só acontece em desenvolvimento.
