# Etapa 38 — Sprint 22 (parte 3): Configurações — perfil e dados do negócio

**Data:** 2026-10-21
**Status:** ✅ Concluída (migração aplicada com o "sim" do usuário; testada no navegador com a conta de teste; commitada).

## O que mudou para o usuário

- **`/settings`** → redireciona para **`/settings/profile`**. Layout com `PageHeader` "Configurações" + abas **Perfil · Negócio · Identidade visual** ("Em breve", etapa 39).
- **Perfil** (`/settings/profile`): nome (obrigatório, 2–80) e telefone/WhatsApp; e-mail de acesso só para leitura. Salvar atualiza o nome no menu lateral na hora (`revalidatePath("/", "layout")`).
- **Negócio** (`/settings/business`): nome nas propostas, razão social, CPF/CNPJ, endereço, e-mail de contato, telefone/WhatsApp, site ou rede social. Tudo opcional: **campo em branco usa o do perfil** (nome, e-mail da conta, telefone) — os placeholders e dicas mostram qual. **Prévia ao vivo** "Como aparece na proposta" ao lado (embaixo em telas estreitas), com o mesmo bloco do documento.
- **Documento** (página interna, pública, PDF e prévia do construtor): o topo mostra nome, contato (e-mail · telefone · site), razão social · CPF/CNPJ e endereço. O WhatsApp/e-mail da página pública usam os do negócio.
- **Decisão:** os dados do emitente são lidos na hora (como os do cliente), então valem também para propostas já enviadas — a tela avisa. Congelar o emitente no envio seria o "versionamento" (Sprint 13 avançado).

## Banco — migração `20261021161431_business_settings.sql`

- **`public.businesses`** (1:1 com `profiles`, PK `user_id` com `default auth.uid()`, cascade): `name` (2–120, nulo = usa o perfil), `legal_name` (≤160), `document` (11 ou 14 dígitos), `email`, `phone` (10–11 dígitos), `website` (**`^https?://[^\s/]+\.[^\s]+$`**, ≤200 — nunca `javascript:`), `address` (≤300), `created_at/updated_at` (gatilho `set_updated_at`). RLS: select/insert/update do próprio; **sem DELETE** (some com o perfil). A linha nasce no primeiro "Salvar" (**upsert** `onConflict: "user_id"`, que precisa de SELECT+INSERT+UPDATE).
- **`profiles`**: `UPDATE` só nas colunas **`full_name, phone`** (antes era a tabela toda: dava para trocar o `email`, que aparece nas propostas, pela API) + CHECK `profiles_phone_digits` (10–11 dígitos; o único perfil estava sem telefone).
- **`get_public_quote`** recriada (corpo igual ao da `quote_responses`): `issuer` = negócio com o perfil no lugar do que estiver em branco (`coalesce(nome do negócio, nome do perfil, início do e-mail)`, `coalesce(b.email, p.email)`, `coalesce(b.phone, p.phone)`) + `legal_name`, `document`, `website`, `address`.
- **Teste antes do push:** transação desfeita com usuários fictícios — **17/17** (perfil: nome/telefone ok, e-mail recusado 42501, telefone fora do padrão 23514; emitente sem e com negócio, anônimo, fallback de nome/e-mail; anônimo sem acesso à tabela; CHECKs de nome/site/documento; sem DELETE; outro usuário não lê/altera/cria em nome de A). Arquivo reaproveitável: [etapa-38-teste-negocio.sql](etapa-38-teste-negocio.sql) (rodar com `begin;` + a migração na frente, se ela ainda não estiver aplicada).
- `db push` barrado pelo verificador ("Blind Apply") mesmo com a autorização do Supabase: mostrei o `--dry-run` e o usuário disse "sim". **`db advisors`:** só os avisos já conhecidos (funções públicas SECURITY DEFINER de propósito; proteção de senhas vazadas).

## Código

- **`lib/website.js`**: `normalizeWebsite` (põe `https://` se faltar), `isValidWebsite` (http/https, domínio com ponto, sem usuário/senha — "banco.com@golpe.com"), `displayWebsite` (sem protocolo e barra final), `websiteFormValue` (só o `https://` sai).
- **`lib/validations/contact.js`**: `optionalEmail`, `optionalPhone`, `optionalDocument`, `optionalWebsite` — **compartilhados**; `client.js` passou a usá-los (mesmas mensagens).
- **`lib/validations/settings.js`**: `profileSchema`, `businessSchema`, `EMPTY_BUSINESS_FORM`, `toProfileFormValues`, `toBusinessFormValues`, `businessFromForm` (prévia: campo ainda inválido conta como em branco).
- **`lib/issuer.js`**: `toIssuer({ profile, business, fallbackName })` — a mesma regra da `get_public_quote` (um teste confere o SQL).
- **`lib/data/profiles.js`**: `getProfile`, `updateProfile`, `getBusiness`, `saveBusiness` (upsert), `getIssuer` (perfil + `business:businesses(...)` embutido, `toIssuer`). **`getQuoteDocument`** agora busca o emitente com `getIssuer()` em paralelo (antes: join `issuer:profiles`).
- **`actions/settings.js`**: `updateProfileAction`, `saveBusinessAction` (`parseInput` + `toFailure` + `revalidatePath("/", "layout")`).
- **`QuotePreview`**: exporta **`IssuerIdentity`** (usado na prévia de Configurações). Linhas montadas por partes: telefone e documento com `whitespace-nowrap`, e-mail e site com `wrap-anywhere`, separador `" · "` (a linha nunca começa com "·"). Bloco da direita (número/datas) com `shrink-0`.
- **Interface:** `components/settings/settings-nav.jsx` (abas com traço `layoutId="settings-tab"`; **no celular sem ícones e o selo "Em breve" só para leitor de tela**, senão não cabia em 360 px), `profile-form.jsx`, `business-form.jsx` (grade `@4xl:grid-cols-[minmax(0,1fr)_20rem]`, prévia `@4xl:sticky`). `settings/template.js` (remonta na troca de aba → animação de entrada), `loading.js` em cada aba (só o formulário; cabeçalho e abas ficam no layout).

## Verificação

- `npm run lint` ✅ · `npm test` ✅ (**872**; novos: `website.test.js`, `validations/settings.test.js`; `quotes.test.js` agora simula as duas consultas do documento) · build ✅.
- **Modo demonstração (antes do push):** redirecionamento, abas, máscaras, prévia ao vivo, erros no campo + foco no primeiro, "Conecte o Supabase…" ao salvar; iframes 360/390/1024 sem rolagem lateral (corrigidos: telefone quebrando no meio na prévia; aba "Em breve" não cabendo no celular).
- **Banco real, conta de teste do usuário:** prévia com o perfil como reserva; salvar negócio → toast; orçamento de teste enviado (criado por SQL com `create_quote` + `send_quote`) mostrando o emitente novo na página interna, na pública (título "Proposta Nº … · Estúdio Aurora", WhatsApp `wa.me/55…` e `mailto:` do negócio) e no PDF (200, `application/pdf`; sem `pdftoppm` para ver a página); perfil: telefone salvo, nome curto recusado, nome novo no menu na hora e depois revertido.
- **Limpeza pelos ids:** orçamento de teste (itens e 3 eventos em cascata), o contador de 2026 que ele criou e a linha do negócio. Banco como antes: 1 usuário, 1 perfil (sem telefone), 1 cliente, 0 orçamentos/negócios/contadores.
