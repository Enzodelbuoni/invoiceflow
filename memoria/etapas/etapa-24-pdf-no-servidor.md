# Etapa 24 — Sprint 16 (parte 2): PDF gerado no servidor ("Baixar PDF")

**Data:** 2026-10-14
**Status:** ✅ Concluída. Com ela o **Sprint 16 (PDF) está completo**.

## Decisões

- **Rota `/quote/<public_id>/pdf`** (route handler em `src/app/(public)/quote/[publicId]/pdf/route.js`). Abre a **página pública** num Chrome headless (`puppeteer-core`) e devolve `application/pdf` com `Content-Disposition: attachment; filename="Proposta-2026-001.pdf"`, `Cache-Control: private, no-store` e `X-Robots-Tag: noindex`. Serve o cliente e o dono (o dono usa a mesma rota).
  - O PDF reaproveita o HTML/CSS de impressão da etapa 23. Não existe um segundo layout.
  - **Rascunho não tem PDF do servidor** (não tem página pública): para ele, só "Imprimir". Cancelada/inexistente/id inválido → 404 em texto.
  - Erros previstos respondem **texto em pt-BR**: 404; 503 "não está disponível agora, use Imprimir"; 500 "não foi possível gerar". O botão mostra essa mensagem.
- **JavaScript desligado no headless** (`page.setJavaScriptEnabled(false)`): o documento é Server Component. Com JS, o `RegisterQuoteView` marcaria a proposta como "visualizada". Conferido: depois do download pelo `curl`, a proposta continuou `sent`.
- **Rodapé de cada página pelo gerador** (`displayHeaderFooter` + `footerTemplate`): "Junior Francisco · Proposta Nº 2026-001" à esquerda, "Página X de Y" à direita, alinhado às margens do `@page` (12 mm). O nome entra escapado (`escapeHtml`): não injeta HTML nem as classes especiais do Chrome (`url`, `title`…). Fontes da web não carregam no rodapé (cai em Segoe UI/Arial).
- **Origem da página = `NEXT_PUBLIC_SITE_URL` (`siteOrigin()`), nunca o `Host` da requisição:** com um Host forjado, o gerador poderia ser apontado para um endereço interno (SSRF). Sem endereço válido (http/https) → 503.
- **Chrome em dev:** `PDF_CHROME_PATH` no `.env.local` (Chrome instalado: `C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`). Documentado no `.env.example`. **Sem a variável, a interface mostra só "Imprimir ou salvar PDF"** (`isPdfAvailable()`).
- **Dependência:** `puppeteer-core` **25.12.0** (exata; a 25.14.0 saiu no mesmo dia e a 25.12.0 tinha 3 semanas). Não baixa navegador. 7,8 MB. Já está na lista de pacotes que o Next deixa fora do bundle (`serverExternalPackages` padrão), então não precisou de configuração. `npm audit` inalterado.
  - **NÃO instalado agora: `@sparticuz/chromium`** (Chromium para Linux/Vercel). Exige **Node ≥ 22.17** (a máquina tem 22.14) e não roda no Windows. Fica para o deploy (Sprint 22), junto com `maxDuration` da rota e a proteção de deploy da Vercel (o headless precisa abrir a página pública).
- **Evento `downloaded`** (migração `20261014170709_quote_downloads.sql`, aplicada): `public.register_quote_download(public_id)`, SECURITY DEFINER para `anon`/`authenticated`.
  - Ignora rascunho, cancelada e inexistente.
  - Decide **quem baixou** (`metadata.by` = `owner` se o logado é o dono, senão `client`): não dá para forjar.
  - **Repetições do mesmo lado em 10 minutos contam uma vez.**
  - Chamado pela rota em `after()` (depois de responder); uma falha ao registrar não estraga o download.
  - Advisor 0028/0029 aceito, como nas outras funções da página pública.
- **Histórico:** "PDF baixado pelo cliente" / "PDF baixado por você" (`quoteEventLabel`). Downloads seguidos do mesmo lado viram um item ("· 2 vezes"), como os salvamentos.
- **Interface:**
  - **Botão:** `DownloadPdfButton` (`components/shared/download-pdf-button.jsx`). Busca o PDF com `fetch`, mostra "Gerando PDF…" (leva ~3 s) e salva via blob (`lib/pdf-download.js`). Em erro, mostra um aviso com a mensagem da rota (ou "sem conexão").
  - **Página pública:** "Imprimir" (ghost) + "Baixar PDF" acima do documento.
  - **Confirmação da aprovação:** "Baixar a proposta aprovada (PDF)".
  - **Página interna:** "Baixar PDF" no menu "⋯" (fora de rascunho/cancelada), com `toast.promise` ("Gerando PDF…" → "PDF da proposta 2026-001 pronto").
- **Pendente antes do deploy:** a rota é pública e gerar PDF custa CPU (abre um Chrome por pedido). O banco já ignora eventos repetidos, mas falta **limitar a frequência de geração** (rate limit) ou fazer cache do arquivo.

## O que foi feito

- Migração acima + teste `memoria/etapas/etapa-24-teste-downloads.sql` (**9/9**, antes do push numa transação desfeita e depois no remoto).
- `src/lib/pdf/render.js` (`isPdfAvailable`, `renderPdf`; `server-only`), `src/lib/pdf/document.js` (`quotePdfUrl`, `pdfFileName`, `pdfFooterTemplate`, `escapeHtml`), `src/lib/site-url.js` (`siteOrigin`), `src/lib/pdf-download.js` (`downloadPdf`, `fileNameFromDisposition`).
- `registerQuoteDownload` em `data/public-quotes.js`; rota do PDF.
- `download-pdf-button.jsx`; a página pública, a confirmação, `quote-actions.jsx` e `quotes/[id]/page.js` passam a usar `isPdfAvailable()`.
- `quote-events.js` (`DOWNLOAD_EVENT_LABELS`, `quoteEventLabel`, agrupamento), `quote-timeline.jsx`.
- Testes: `pdf/document.test.js`, `site-url.test.js`, `pdf-download.test.js`, `quote-events.test.js` (download) e **`pdf/route.test.js`**, que testa a rota em si com o banco e o Chrome falsos: Host forjado ignorado, 404/503/500, cabeçalhos, registro do download.

## Verificação

- `npm run lint` ✅ · `npm test` ✅ **641 testes** (eram 611) · `npm run build` ✅.
- **PDF real com o servidor de dev:**
  - proposta longa, baixada pelo `curl` sem login: 3 páginas, rodapé "Página X de 3" em todas, ~5,5 s com o servidor frio; proposta continuou `sent`; evento `downloaded:client`;
  - repetição: sem novo evento; aprovada: 1 página com o aceite;
  - id inválido/inexistente → 404 "Proposta não encontrada.".
- **Chrome** (downloads **interceptados** no teste: o clique do link foi substituído, nada foi salvo no computador do usuário):
  - **página pública** (`e2e.localhost`): "Imprimir" + "Baixar PDF"; "Gerando PDF…" desativado; `Proposta-2026-001.pdf` como blob em ~3 s; sem rede → aviso e o botão volta;
  - **confirmação da aprovada:** o botão baixa `Proposta-2026-002.pdf`;
  - **dono:** menu → "Baixar PDF" → toasts de andamento e de pronto; histórico com "PDF baixado pelo cliente" e "PDF baixado por você".
  - Console sem erros; nenhum Chrome headless ficou aberto.
- Dados de teste apagados (banco: 1 usuário, 1 cliente, o resto zerado).

## Problemas encontrados

- Nenhum bug. Cuidados: a pasta temporária da sessão (scratchpad) deixou de estar disponível no meio do trabalho. Os arquivos de teste foram para `.tmp/` no projeto, ignorada só localmente (`.git/info/exclude`), e apagados no fim.
- O `start-server.js` ficou na porta 3000 de novo ao parar o `npm run dev` (já conhecido).
