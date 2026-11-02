# Etapa 42 — Sprint 22 (parte 7): landing page

**Data:** 2026-11-02
**Status:** ✅ Concluída e commitada em 4 partes. Combinado com o usuário: **commits menores ao longo da etapa** (a sessão pode acabar sem aviso), cada um com lint/testes passando e o "Onde paramos" da MEMORIA atualizado.

## O que mudou para o usuário

A página inicial `/` deixou de ser provisória. De cima para baixo:

1. **Cabeçalho fixo:** marca, atalhos para as seções (a partir de 1024 px), tema, "Entrar" e "Criar conta" (some no celular estreito; o botão grande está logo abaixo). "Pular para o conteúdo" no primeiro Tab.
2. **Abertura:** "Propostas que *fecham* negócio.", texto de apoio, "Criar conta grátis" e "Ver como funciona", três garantias. Embaixo, **a proposta de exemplo numa janela de navegador**, desenhada pelo **`QuotePreview` de verdade**, com a barra "Total · Recusar · Aprovar proposta" da página do cliente e, em telas ≥ 1280 px, dois avisos flutuantes ("Proposta visualizada", "Proposta aprovada") na margem da janela.
3. **Como funciona:** Monte, Envie, Feche, com ilustrações (resumo com os números da proposta de exemplo, mensagem com o link, histórico até a aprovação).
4. **Recursos:** grade de 7 cartões: aceite eletrônico, PDF pronto, WhatsApp e e-mail, métricas de conversão (colunas enviadas e aprovadas com as cores do painel), modelos, sua marca, situação de cada proposta (`StatusBadge`).
5. **Para o seu cliente:** celular com a página da proposta e o diálogo "Aprovar proposta" (mesmos textos do diálogo real) + quatro pontos (sem cadastro, aprova ou recusa, tudo registrado, PDF).
6. **Perguntas frequentes:** 6 perguntas (conta do cliente, aceite eletrônico e seus limites, cálculos, alterar depois de enviar, validade, logo e cores).
7. **Chamada final** no fundo índigo do painel da marca e **rodapé** com "Os nomes, empresas e valores dos exemplos são fictícios."

## Decisões

- **Produto real na vitrine:** a abertura usa o `QuotePreview` (o mesmo do cliente e do PDF) com `sampleQuote()` (`components/landing/sample-quote.js`): itens, desconto de 10% e impostos de 6% calculados pelo **motor de cálculos** (teste confere R$ 7.059,60). Pessoas e empresas fictícias (Estúdio Lia Moreira, Marina Lopes, Café Bonsucesso); e-mail de exemplo `marina@exemplo.com`. Nada de depoimentos, logos de clientes ou números inventados apresentados como reais.
- **Mockups decorativos fora da acessibilidade:** janela da proposta e celular com `aria-hidden` + `inert` (sem foco nem títulos duplicados); ilustrações dos cartões com `aria-hidden`. Conferido: 1 `h1`, `h2` por seção, `h3` nos cartões, nada focável escondido, sem ids repetidos.
- **Documento reduzido no desktop** com `sm:[zoom:0.8]` (cabem os itens, como numa captura de tela); no celular, o layout estreito do próprio documento.
- **Animações:** `animate-enter` na abertura (título sem atraso, por causa do LCP); **`animate-reveal`** (utilitário novo no `globals.css`) anima os blocos pela rolagem com `animation-timeline: view()`, **só CSS**, dentro de `prefers-reduced-motion: no-preference` + `@supports`: sem suporte, fica parado e visível.
- **Perguntas com `<details>/<summary>` nativos** (teclado e sem JavaScript); altura animada com `::details-content` + `interpolate-size` (classe `.faq-item` no `globals.css`), onde houver suporte.
- **Página estática, refeita uma vez por dia** (`revalidate = 86400`): as datas do exemplo ("enviada hoje, válida por 15 dias") acompanham. Precisa de **`dynamic = "force-static"`**: ver o problema abaixo.
- **Logado:** a página não lê a sessão (para ser estática). "Entrar" leva quem já está logado direto ao painel (o proxy redireciona).
- Breakpoint arbitrário `min-[75rem]:` **não gerou CSS** (como o `@max-[21rem]` da etapa 31): avisos flutuantes ficaram em `xl:`.

## Problema encontrado (não corrigido nesta etapa)

**Desde a etapa 33, todas as rotas do app são dinâmicas (ƒ), até `/forgot-password`, `/_not-found` e `/design-system`.** Causa confirmada: o 404 geral (`app/not-found.js`) chama `getCurrentUser()` (cookies) e o Next monta esse 404 junto de toda página; o `try/catch` em volta engole o erro, mas a rota já foi marcada como dinâmica. Teste: com a verificação desligada, essas rotas voltaram a ser estáticas (○). A landing contorna com `force-static`. **Correção na etapa 46 (desempenho), antes do Lighthouse:** 404 geral sem ler cookies no servidor, decidindo "Ir para o painel" × "Entrar" no navegador. Plano passo a passo na `MEMORIA.md` ("Próximo passo", item 46). Funciona normalmente hoje; só gasta mais servidor a cada acesso.

## Código

- `src/app/(public)/page.js` — página nova (`revalidate`, `force-static`, skip link, `main#conteudo`).
- `src/components/landing/`: `sample-quote.js` (+ teste), `section-heading.jsx`, `landing-header.jsx` (`LANDING_NAV`), `hero.jsx`, `how-it-works.jsx`, `features.jsx`, `client-experience.jsx`, `faq.jsx`, `final-cta.jsx`, `landing-footer.jsx`.
- `src/app/globals.css` — `@keyframes reveal` + `@utility animate-reveal`; `.faq-item`.

## Verificação

- `npm run lint` ✅ · `npm test` ✅ (**996**) · `npm run build` ✅ (`○ /` com revalidação de 1 dia; resposta `x-nextjs-cache: HIT`, `s-maxage=86400`).
- Chrome (dev e produção): 390, 820, 1024, 1280 e 1440 px, claro e escuro, sem rolagem lateral; âncoras do menu param logo abaixo do cabeçalho; Tab e Enter nas perguntas (anel de foco visível, altura animada); sem erros no console em produção (em dev, só o aviso da Grammarly).
- Correções feitas durante a conferência: aviso flutuante cobria a logo do documento; documento mostrava pouco (altura e escala); textos cortados nas ilustrações ("Gestão de redes sociais", "Aprovada por…", botão WhatsApp); chamada final mais larga que o conteúdo; rodapé quebrando no tablet; menu com 4 itens não cabia em 768 px (passou para 1024 px).

## Para depois

- Etapa 43 (acessibilidade): rodar o axe também na landing.
- Etapa 46: Lighthouse da landing (HTML de ~200 KB por causa do documento de exemplo no RSC) + imagem Open Graph; corrigir o 404 que deixa tudo dinâmico.
