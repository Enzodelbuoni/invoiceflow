# Etapa 18 — Sprint 11: QuotePreview (o documento do orçamento)

**Data:** 2026-10-13
**Status:** ✅ Concluída. Sprint 11 completo; a Fase 4 começou.

## Decisões

- **Um componente só para o documento:** `src/components/quotes/quote-preview.jsx` (`QuotePreview`). Recebe os dados no formato do banco (inteiros) e só desenha; **sem "use client"**: é Server Component na página interna e vira componente de cliente dentro do construtor (pré-visualização). Será reaproveitado na página pública (Sprint 14) e no PDF (Sprint 16), como o plano pede.
- **Papel sempre claro (`.theme-paper`):** o documento é igual em qualquer tema (como o cliente recebe e como o PDF imprime). No `globals.css`, `.theme-paper` entra no MESMO bloco dos tokens claros (`:root, .theme-paper { … }`, sem duplicar cores), e a variante `dark:` ignora o que estiver dentro dele: `@custom-variant dark (&:is(.dark *):not(:is(.theme-paper, .theme-paper *)))`. Fundo/cor/`color-scheme` do papel ficam em `@layer base` (fora de camada venceria as utilitárias).
- **Container queries** (`@container` no `<article>`): a largura vem de onde o documento está (página, diálogo, iframe do celular). `@xl` (36rem) troca a lista de itens pela tabela e põe cabeçalho/cartões lado a lado; `@sm` põe os 2 destaques lado a lado.
- **Conteúdo do documento:** faixa da marca no topo; emitente (monograma + nome em serif + contato); "Proposta comercial", Nº, data (envio ou criação) e validade; título e descrição; "Preparada para" (nome, empresa, **CPF/CNPJ com rótulo**, e-mail, telefone, endereço); destaques "Investimento" e "Validade"; itens (tabela no largo, lista no estreito, `break-inside-avoid` pensando no PDF); totais (desconto/impostos só quando existem); observações e termos; rodapé. Selo `label` ("Rascunho" na página interna, "Prévia" no construtor). Valor em destaque diminui para quantias longas.
- **Emitente = perfil do usuário** (`full_name`, e-mail, telefone) até existir `/settings/business`. `getIssuer()` em `src/lib/data/profiles.js`; no documento salvo vem pelo join `issuer:profiles(...)`.
- **Página interna `/quotes/[id]`:** documento sobre uma "mesa" (`bg-muted/50`) + status, descrição do status e, em rascunho, "Editar" e "Enviar ao cliente" (em breve, Sprint 12). Depois de salvar (novo ou edição), o construtor vai para ela; a lista tem link em todos os status; o painel "não pode mais ser editado" leva a ela.
- **"Pré-visualizar" no construtor:** diálogo largo com o mesmo documento montado dos valores atuais por `previewQuoteFromForm` (`src/lib/quote-preview.js`, tolerante como o resumo: totais do motor de cálculos, acima do teto → "—", campos vazios com textos de reserva). O cliente aparece só com nome/empresa/e-mail (o seletor não recebe telefone, documento e endereço — minimização de dados); o diálogo avisa. Foco volta ao botão ao fechar (`onCloseAutoFocus`, porque o diálogo é controlado, sem `DialogTrigger`). Não usei Zustand para isso: um `useState` basta.
- **Dados do documento só no servidor:** `getQuoteDocument(id)` separa `{ quote, client, issuer }`; a edição continua recebendo só o `getQuote` (sem dados pessoais do cliente).

## O que foi feito

- `globals.css` (`.theme-paper`, variante `dark`, `scroll-padding-top` no `html`), `(dashboard)/layout.js` (`md:scroll-pt-16` no painel que rola).
- `quote-preview.jsx`, `quote-preview-dialog.jsx`, `lib/quote-preview.js` (+ testes), `data/profiles.js`, `getQuoteDocument` em `data/quotes.js` (+ testes).
- `quotes/[id]/page.js`; `quote-form.jsx` (vai para o documento depois de salvar; pré-visualização; prop `issuer`), `quote-summary.jsx` (`onPreview`, id `quote-preview-trigger`); páginas `new` e `[id]/edit` passam `issuer`; lista com link em todos os status; `updateQuoteAction` revalida `/quotes/[id]`.

## Verificação

- `npm run lint` ✅ · `npm test` ✅ **503 testes** (eram 497) · `npm run build` ✅ (`/quotes/[id]` nova).
- Chrome (`localhost:3000`, sessão de teste do usuário): orçamento com 3 itens (1 unidade, 1 unidade, 6 horas), 10% e 5% → salvar leva ao documento: totais R$ 6.900 − 690 + 310,50 = **R$ 6.520,50**; papel claro nos temas escuro e claro; tabela no desktop e lista no celular (iframe de 390 px, sem rolagem horizontal); pré-visualização na edição (número e data do salvo) e com o formulário vazio; Esc devolve o foco ao botão; console sem erros. Tema do navegador devolvido ao que era ("sistema"). Orçamento, contador e cópias locais do teste apagados (banco: 1 usuário, 1 cliente, 0 serviços, 0 orçamentos).

## Problemas encontrados

1. **Página nova escondida atrás do cabeçalho fixo:** ao navegar (ex.: salvar no fim do construtor), o Next rola o conteúdo novo até o topo do painel, e o título ficava sob o cabeçalho `sticky` (56 px). Corrigido com `scroll-padding-top` (64 px) no contêiner que rola (desktop: o painel; celular: o `html`). Também protege campos focados pelo teclado.
2. No celular, os 2 destaques lado a lado deixavam "R$ 6.520,50" encostando na borda: empilhados abaixo de `@sm` e tamanho do valor por comprimento.
3. Fechar o diálogo controlado (sem `DialogTrigger`) devolvia o foco para a página inteira: `onCloseAutoFocus` com `preventDefault` + foco no botão.
4. O `find` da automação às vezes lista opções escondidas de outros `Select` como se estivessem abertas; o ref da opção visível (`option`) é o certo.
