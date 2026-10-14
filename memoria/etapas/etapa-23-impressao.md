# Etapa 23 — Sprint 16 (parte 1): versão para impressão / "Salvar como PDF"

**Data:** 2026-10-14
**Status:** ✅ Concluída. A parte 2 (PDF gerado no servidor, etapa 24) vem em seguida.

## Decisões

- **Escolha do usuário (2026-10-14): PDF "em duas etapas".** Primeiro a impressão do navegador (sem dependências, e base da etapa 2); depois o arquivo .pdf gerado no servidor com um Chrome headless a partir da mesma página.
- **Um documento só:** a impressão usa o mesmo `QuotePreview` da tela. Nada de layout separado para o PDF (plano: "Dados → QuotePreview → HTML → PDF").
- **A folha A4 tem ~703 px úteis, abaixo do breakpoint `md` (768 px):** ao imprimir, o painel já se comporta como no celular (sem sidebar, sem rolagem interna). Por segurança, o `globals.css` também esconde `sidebar-gap`/`sidebar-container` e solta o `sidebar-inset` na impressão.
- **`globals.css`:**
  - `@page { size: A4; margin: 12mm 12mm 14mm }`;
  - `@media print`: fundo branco em `html/body`; `.theme-paper { print-color-adjust: exact }` (faixa da marca e caixas tingidas saem mesmo com "gráficos de plano de fundo" desligado);
  - esconde toasts (`[data-sonner-toaster]`) e menus/popovers (`[data-radix-popper-content-wrapper]`);
  - fundos do app transparentes (no tema escuro, imprimiriam escuro).
- **Sem número de página por CSS (`@page` margin boxes):** segundo a documentação do Chrome (blog "print-margins"), o Chrome desenha o próprio cabeçalho/rodapé (data, URL, página) **junto** com o conteúdo das margens, e eles se sobreporiam. Na impressão do navegador fica o rodapé padrão do Chrome, que a pessoa pode desligar. No PDF do servidor (etapa 24), o rodapé com número da proposta e "Página X de Y" vem do gerador (`displayHeaderFooter`/`footerTemplate`).
- **`QuotePreview` na impressão:**
  - sem moldura, sombra, cantos e limite de largura;
  - padding lateral zero, espaços menores entre as seções (`print:gap-6`) e no bloco de aceite;
  - `break-inside-avoid` no cabeçalho, nos cartões, em cada item, nos totais, nos textos e no aceite; `break-after-avoid` nos títulos ("Itens da proposta", "Observações"…);
  - o **rodapé do documento some na impressão** (repete o cabeçalho e, numa proposta curta, ia sozinho para uma 2ª página);
  - o `<thead>` da tabela se repete em cada página (comportamento do Chrome).
  - Classes `print:` que disputam com variantes `@xl:`/`sm:`/`dark:` levam `!` (a ordem entre variantes no CSS gerado não é garantida).
- **Botões:** `PrintButton` (`components/shared/print-button.jsx`, "Imprimir ou salvar PDF", `window.print()`) acima do documento na página pública (fora "cancelada"). Na página interna, item "Imprimir ou salvar PDF" no menu "⋯" (todos os status; o print roda em `requestAnimationFrame` para o menu fechar antes).
- **O que some no papel** (`print:hidden`): na página pública, a faixa do dono, o cabeçalho, o aviso de status com os botões, o fechamento "Tudo certo…" e o rodapé "Proposta enviada com InvoiceFlow". Na página interna, o cabeçalho do app, o brilho, o `PageHeader` e a coluna de resposta/histórico; a "mesa" perde borda/fundo/padding.
- **Evento `downloaded`:** fica para a etapa 24. Na impressão não dá para saber se a pessoa salvou de fato; no servidor, sim.

## Verificação

- `npm run lint` ✅ · `npm test` ✅ 611 · `npm run build` ✅.
- **PDF de verdade pela linha de comando** (sem abrir a janela de impressão, que trava a automação):
  `chrome.exe --headless=new --disable-gpu --no-first-run --user-data-dir=<pasta temporária> --no-pdf-header-footer --virtual-time-budget=8000 --print-to-pdf=<arquivo> <url>`
  (Chrome em `C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`). O PDF depois é lido com a ferramenta Read. **Usar um perfil novo a cada rodada**: o perfil reaproveitado serviu o CSS antigo do cache.
  - Proposta longa (14 itens, descrições e termos grandes): 3 páginas A4, cabeçalho da tabela repetido, nenhum item cortado, cores preservadas, só o documento.
  - Proposta curta aprovada: 1 página com o bloco de aceite. Antes dos ajustes, o aceite e depois o rodapé caíam sozinhos numa 2ª página.
- **Página interna** (exige login, então o Chrome headless não abre): simulada num iframe de 703 px com as regras de `@media print` copiadas como regras de tela. Só o documento aparece, do canto, com fundo branco, sem cabeçalho/título/histórico.
  - Para copiar: o Tailwind v4 gera `print:` como **CSS aninhado** (`.print\:hidden { @media print {…} }`): é preciso levar o seletor do pai. E, como as regras vêm de outro "realm" (o iframe), **`instanceof CSSMediaRule` dá falso**: reconhecer pela propriedade `media`.
- Botão da página pública e item do menu chamam `window.print()` (interceptado no teste); o menu fecha antes. Console sem erros.
- Dados de teste (2 propostas criadas por SQL na conta de teste) apagados; banco com 1 usuário, 1 cliente e o resto zerado.

## Problemas encontrados

1. Bloco de aceite e, depois, o rodapé do documento indo sozinhos para uma 2ª página numa proposta curta: espaços compactados na impressão e rodapé do documento escondido no papel.
2. Script de dados de teste: o `select` do `public_id` rodou já como `anon` (que corretamente não lê a tabela); o `set local role` continua valendo depois do bloco `DO` (pôr `reset role` no fim); e `$$` dentro do texto de substituição do `String.replace` vira `$`. Nenhum dado ficou pela metade (tudo numa transação).
3. Ao parar o `npm run dev`, o `start-server.js` ficou na porta 3000 de novo; encerrado pelo PID.
