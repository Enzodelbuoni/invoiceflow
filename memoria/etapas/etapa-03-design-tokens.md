# Etapa 03 — Sprint 2 (parte 1): identidade visual, componentes base e providers

**Data:** 2026-10-06
**Status:** ✅ Concluída

## O que foi feito

1. **Componentes shadcn instalados** (`npx shadcn add ...`) em `src/components/ui/`:
   avatar, badge, button, card, dialog, dropdown-menu, input, label, select, separator, sheet, sidebar, skeleton, sonner, table, textarea, tooltip.
   - Junto vieram `src/hooks/use-mobile.js` e as dependências `sonner@^2.0.8` e `next-themes@^0.4.6`.
2. **Correção no `use-mobile.js` gerado pelo shadcn:** o lint (`react-hooks/set-state-in-effect`, regra nova do React 19) acusava `setState` dentro de `useEffect`. Reescrito com `useSyncExternalStore` (no servidor retorna `false`, então não há divergência na hidratação).
   - ⚠️ Se o shadcn regravar esse arquivo (ex.: `shadcn add sidebar --overwrite`), o erro volta. Reaplicar a correção.
3. **Identidade visual** em `src/app/globals.css`:
   - Cor da marca **índigo** (hue 268): `--primary` claro `oklch(0.511 0.23 268)` · escuro `oklch(0.55 0.2 268)`. `ring`, `sidebar-primary` e `sidebar-ring` acompanham a marca. No escuro, `--primary-foreground` passou a ser claro.
   - Novos tokens: `--success`, `--warning` e um por status do orçamento: `--status-draft`, `-sent`, `-viewed`, `-approved`, `-declined`, `-expired`, `-cancelled`, registrados no `@theme inline` (classes `text-status-sent`, `bg-status-sent/10` etc.).
   - Padrão de uso dos status: **texto na cor + fundo tingido** (`bg-status-x/10` no claro e `dark:bg-status-x/15` no escuro).
   - `background`, `muted`, `accent` etc. continuam neutros (visual sóbrio de documento).
4. **Providers globais** em `src/components/providers.jsx` (Client Component): `ThemeProvider` do next-themes (`attribute="class"`, `defaultTheme="system"`), `TooltipProvider` e `<Toaster richColors closeButton position="top-right" />`. O `layout.js` continua Server Component e ganhou `suppressHydrationWarning` no `<html>`, exigido pelo next-themes.
5. **Home** passou a usar `text-success`/`text-warning` em vez de `emerald-600`/`amber-600`.
6. **Vitrine `/design-system`** (`src/app/(public)/design-system/`): página só para desenvolvimento, que chama `notFound()` em produção. Mostra botões, chips de status, badges, formulário (input, select, textarea, estado de erro), tabela com avatar, skeleton, toasts e seletor de tema (`demo-actions.jsx`).

## Contrastes medidos (WCAG AA ≥ 4.5:1)

Calculados com script (oklch → sRGB, composição de alpha em sRGB com gama, como o navegador faz):

| Token | Claro | Escuro |
|---|---|---|
| primary (texto branco no botão) | 5.90 | 4.88 |
| primary como texto/link no fundo branco | 6.16 | — |
| status-draft (texto sobre o próprio tingido) | 6.41 | 8.68 |
| status-sent | 5.15 | 8.79 |
| status-viewed | 5.68 | 8.50 |
| status-approved | 4.91 | 9.09 |
| status-declined | 5.37 | 7.97 |
| status-expired | 4.99 | 9.08 |
| status-cancelled | 4.83 | 6.89 |
| success / warning (texto puro) | 5.66 / 5.74 | 9.77 / 10.40 |

Todas as cores ficam dentro do gamut sRGB. Para isso o croma de `sent` e `expired` no claro foi reduzido para 0.12.

## Verificação

- `npm run lint` ✅
- `npm run build` ✅ (rotas `/`, `/_not-found`, `/design-system`)
- `npm run dev` → `/` 200 · `/design-system` 200. Testado no Chrome: tema claro, escuro e sistema funcionando, toast funcionando, **console sem erros** (sem aviso de hidratação e sem o aviso de `<script>` do next-themes).
- `next start` (produção) → `/design-system` **404**, `/` 200.

## Observações

- "Rascunho" e "Cancelado" ficam visualmente parecidos (ambos cinza). O `StatusBadge` (próxima etapa) terá ícone por status, então a diferença não vai depender só da cor.
- O hover do botão primário é `bg-primary/80` (padrão do shadcn), um pouco mais claro que o normal. Aceitável por ser um estado transitório.
- O navegador usado nos testes tem viewport muito larga (3018 px CSS) e os screenshots vêm reduzidos. Para interagir, usar `javascript_tool` ou referências do `find`/`read_page` em vez de coordenadas.

## Arquivos criados/alterados

```
package.json / package-lock.json            (sonner, next-themes)
src/app/globals.css                          (marca, success/warning, status)
src/app/layout.js                            (Providers, suppressHydrationWarning)
src/app/(public)/page.js                     (tokens success/warning)
src/app/(public)/design-system/page.js       (novo, vitrine dev-only)
src/app/(public)/design-system/demo-actions.jsx (novo)
src/components/providers.jsx                 (novo)
src/components/ui/*.jsx                      (17 componentes shadcn)
src/hooks/use-mobile.js                      (novo, corrigido)
```
