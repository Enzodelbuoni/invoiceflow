# Etapa 39 — Sprint 22 (parte 4): identidade visual — logo e cor de destaque

**Data:** 2026-10-21
**Status:** ✅ Concluída (migração aplicada — o usuário respondeu "faz o que quiser, contanto que funcione e fique bom"; testada de ponta a ponta na conta de teste; commitada).

## O que mudou para o usuário

- **Configurações → Identidade visual** (`/settings/branding`, a aba que era "Em breve"):
  - **Logo:** "Enviar logo" (ou arrastar para a área), "Trocar logo", "Remover". PNG/JPG/WebP até 2 MB. Vale na hora.
  - **Cor de destaque:** índigo do InvoiceFlow (padrão), 10 cores prontas ou "Personalizada" (seletor nativo). "Salvar cor"; aviso "Alteração ainda não salva" enquanto difere da salva. Cor clara → aviso de que textos e iniciais usam um tom mais escuro dela.
  - **Prévia ao vivo** (papel com faixa, logo/iniciais, rótulo "Proposta comercial", título e total de exemplo). A aba Negócio também mostra logo e cor na prévia.
- **Documento** (interna, pública, PDF, prévia do construtor): logo em cima do nome (serve para logo quadrado e largo); sem logo, as iniciais no tom da cor; faixa do topo e rótulos em versalete na cor.
- **Página do cliente** (`/quote/...` e confirmações): logo no cabeçalho (no tema escuro, num fundo branco) e **a cor do negócio no lugar do índigo** nos botões (Aprovar), destaques e foco — inclusive nos diálogos de aprovar/recusar (portal).

## Banco — migração `20261021170258_branding.sql`

- `businesses.logo_path` (CHECK `^[0-9a-f-]{36}/logo-[0-9a-f-]{36}\.webp$` **e** pasta = `user_id`) e `businesses.accent_color` (CHECK `^#[0-9a-f]{6}$`).
- **Bucket `logos`** (inserido em `storage.buckets`): **público** (o cliente e o PDF leem sem login; logo não é segredo), `file_size_limit` 512 KB, `allowed_mime_types` só `image/webp` (o servidor sempre gera WebP).
- Políticas em `storage.objects` (`to authenticated`, pasta = `auth.uid()`): INSERT, SELECT (o `remove()` precisa) e DELETE. **Sem UPDATE** (cada envio é arquivo novo, sem upsert). Leitura pública pela URL não precisa de política; anônimo listando → `[]`; anônimo enviando → 403 RLS.
- `get_public_quote` recriada (gerada por script a partir da anterior) com `logo_path` e `accent_color` no `issuer`.
- Teste antes do push: **14/14** ([etapa-39-teste-identidade.sql](etapa-39-teste-identidade.sql); rodar com `begin;` + a migração na frente se ainda não aplicada). Advisors: só os avisos já conhecidos.
- Docs/changelog do Supabase conferidos (skill): desde 21/04/2025 não se cria tabela/função no schema `storage`, mas **políticas em `storage.objects` e INSERT em `storage.buckets` continuam permitidos**.

## Código

- **`lib/accent.js`**: `ACCENT_PRESETS` (10 cores, todas ≥ 4,5:1 sem ajuste — teste), `normalizeAccent`, `relativeLuminance`/`contrastRatio` (WCAG), **`accentInk`** (escurece multiplicando os canais lineares pelo mesmo fator — mantém o matiz — até 4,5:1 contra `#fafafa`, o `--primary-foreground` do papel), **`accentInkOnDark`** (clareia misturando com branco até 4,5:1 contra `#30323a`), **`accentStyle`** (vars `--primary`/`--primary-ink` no `style` do papel) e **`accentPageCss`** (CSS `:root{…}` + `:root.dark{…}` para a página do cliente, num `<style>` do `PublicQuoteShell`, porque os diálogos são portais; o `.theme-paper` tem as próprias variáveis e não é afetado; só hex validado entra no CSS).
- **`lib/branding.js`** (navegador e servidor): `LOGO_BUCKET`, `LOGO_MAX_BYTES` (2 MB), `LOGO_TYPES`, `checkLogoFile`, `newLogoPath(userId)` (`<uid>/logo-<uuid>.webp`, nome novo a cada envio → URL nunca velha no cache), `logoPublicUrl(path)`.
- **`lib/logo-image.js`** (`server-only`, **`sharp` 0.35.5**, agora dependência explícita): formato pelo **conteúdo** (só png/jpeg/webp; SVG/GIF/texto recusados), cabeçalho lido com `limitInputPixels: false` para a imagem gigante receber "grande demais" (> 50 Mpx), mínimo 32 px por lado; `.rotate()` (EXIF) → **`.trim({ threshold: 10 })`** (corta margens da cor do canto; imagem lisa → sem corte) → `resize` 512×512 `inside` sem aumentar → WebP q90, **sem metadados**.
- **`lib/data/branding.js`**: `uploadLogo(bytes)` (processa → envia `upsert: false`, `cacheControl` 1 ano → upsert `logo_path` → apaga o antigo; falha no banco → apaga o novo), `removeLogo()`, `saveAccentColor()`. Erros do Storage pelo `logError`.
- **`actions/settings.js`**: `uploadLogoAction(formData)` (campo `logo`; confere `File`, tipo e tamanho de novo), `removeLogoAction`, `saveAccentAction` (`accentSchema`). `next.config.mjs`: `experimental.serverActions.bodySizeLimit: "3mb"` (padrão 1 MB; 2 MB + multipart).
- **Emitente:** `toIssuer` ganhou `logo_url` e `accent_color`; `withLogoUrl` converte o `logo_path` da `get_public_quote` (em `getPublicQuote`). `BUSINESS_COLUMNS` com `logo_path, accent_color`.
- **`QuotePreview`**: `style={accentStyle(issuer.accent_color)}` no papel; `IssuerIdentity` com logo (`<img>` com `eslint-disable` justificado: já reduzido no envio e o PDF abre sem JS) e iniciais em `bg-primary-ink`; `Eyebrow` exportado. Espaço inseparável do separador "·" agora escrito como ` ` (estava como caractere invisível).
- **UI:** `components/settings/paper-preview.jsx` (prévia compartilhada por Negócio e Identidade visual), `branding-form.jsx` (rádios nativos escondidos nas bolinhas → setas do teclado; borda `dark:ring-white/25` para o preto aparecer no tema escuro), aba ativada em `settings-nav.jsx`, `settings/branding/page.js` + `loading.js`.

## Verificação

- `npm run lint` ✅ · `npm test` ✅ (**938**; novos: `accent.test.js`, `branding.test.js`, `logo-image.test.js` — imagens reais geradas com o sharp: PNG/JPEG/WebP, EXIF + rotação, corte de margens, SVG, GIF, bomba de 100 Mpx —, `data/branding.test.js` — ordem upload → banco → apagar antigo e limpeza nas falhas) · build ✅.
- **Modo demonstração:** cor na prévia (preset e personalizada clara → `--primary-ink: #8a7007` + aviso), arquivo .txt recusado no navegador, envio chegando à action ("Conecte o Supabase…"), 360/390/1024 px sem rolagem lateral.
- **Banco real (conta de teste):** logo gerado na hora (PNG 800×240, 16,7 KB) → WebP 512×154 (7 KB, `image/webp`, `cache-control: public, max-age=31536000`); troca → 512×163 (com o corte) e **o arquivo antigo apagado** (1 objeto no bucket, o apontado); cor salva; documento interno, prévia do construtor e página do cliente com logo e cor (botão Aprovar e destaques na cor); **PDF com a imagem embutida** (2 objetos `/Subtype /Image` × 0 antes); Remover → bucket vazio; cor de volta ao padrão.
- **Limpeza:** orçamento de teste, contador e a linha do negócio apagados pelos ids. Banco como antes (1 usuário, 1 perfil, 1 cliente; 0 orçamentos/negócios/contadores/arquivos).

## Observações

- Conta excluída deixa o logo órfão no Storage (o SQL não apaga arquivos do Storage). Não há exclusão de conta no app hoje; se houver, apagar a pasta do usuário pela API antes.
- Mudanças no logo/cor valem para propostas já enviadas (dados lidos na hora, como os do negócio).
