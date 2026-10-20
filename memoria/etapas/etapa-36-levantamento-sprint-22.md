# Etapa 36 — Sprint 22 (parte 1): levantamento e decisões do usuário

**Data:** 2026-10-20
**Status:** ✅ Concluída (só levantamento e plano; nenhum código).

## Levantamento: o que o plano pede × situação

| Item | Situação | O que falta |
|---|---|---|
| Acessibilidade WCAG | Muito feito: rótulos/`aria-describedby`, foco no 1º erro, teclado no gráfico, contrastes AA medidos (etapas 3/4), alvos de toque (etapas 30/31), "pular para o conteúdo", movimento reduzido, `role=status` nos esqueletos | Auditoria automática (axe-core) em todas as telas + fluxo principal só com teclado; corrigir |
| Server Components | 80 de 223 arquivos com "use client"; páginas no servidor | Revisão rápida |
| Imagens otimizadas | O app não tem imagens (logo em CSS/SVG; só favicon) | **Imagem de prévia (Open Graph)** — o link da proposta no WhatsApp sai sem imagem |
| Testes dos cálculos | ✅ (Vitest, 814 testes, invariantes do motor) | — |
| Testes de formulários | Só lógica pura (schemas, máscaras, campos) | Testes de componente (Testing Library + jsdom) dos formulários principais |
| Testes E2E | Nenhum | Playwright no fluxo principal |
| Tratamento global de erros | ✅ etapa 33 | — |
| Logs seguros | `databaseError` registra só código + mensagem; PDF registra a mensagem | `toFailure` registra o erro inteiro nos inesperados: revisar |
| CI/CD | Não existe (`.github/` ausente) | GitHub Actions (lint + testes + build) + deploy automático da Vercel |
| Lighthouse / Web Vitals | Nunca medido | Medir no build de produção (landing, login, página pública, painel) |
| README profissional | Desatualizado ("Fase 1", Node 20.9) | Reescrever no fim, com prints e o link do deploy |
| Deploy | Não feito | Ver as pendências "Antes do deploy" da MEMORIA |

Fora dos sprints, mas visível num portfólio: landing `/` provisória (36 linhas); `/settings` só com cartões "Em breve" (não dá para editar nem o nome que sai na proposta); **templates de orçamento (diferencial do `info.txt`) não implementados**; filtro por cliente na lista; origem da cópia (Sprint 13).

Ambiente: **sem Docker, sem GitHub CLI (`gh`), sem Vercel CLI** na máquina. Node 22.14.

## Decisões do usuário (2026-10-20)

1. **Hospedagem: Vercel, endereço grátis** (`*.vercel.app`). O usuário cria a conta e liga ao GitHub; eu preparo o projeto (variáveis, PDF no Linux etc.).
2. **E2E: Playwright + Supabase local com Docker.** O usuário vai **instalar o Docker Desktop** (precisa de administrador e do WSL2). Banco descartável: os testes rodam aqui e no CI do GitHub, sem tocar no banco real.
3. **Antes do deploy, além do Sprint 22:** landing page de verdade, **configurações (perfil e dados do negócio)**, **templates de orçamento** e **identidade visual** (logo e cor nas propostas).
4. **E-mails (SMTP/Resend): depois.** Cadastro continua sem confirmação de e-mail; recuperação de senha limitada (Free sem SMTP: só para a equipe, 2/hora).

## Ordem combinada das próximas etapas

Funcionalidades primeiro (mudam a interface), depois as auditorias (que passam a cobri-las), deploy e README:

| Etapa | O quê | Precisa do usuário? |
|---|---|---|
| 37 | CI no GitHub Actions (lint + testes + build) + logs seguros | o `git push` (só quando ele pedir) |
| 38 | Configurações: perfil e dados do negócio (emitente da proposta) | — |
| 39 | Identidade visual: logo (Supabase Storage) e cor de destaque nas propostas | — |
| 40 | Templates de orçamento | — |
| 41 | Landing page | — |
| 42 | Acessibilidade: axe + teclado em todas as telas | — |
| 43 | Testes de componente dos formulários | — |
| 44 | E2E com Playwright + Supabase local | **Docker Desktop instalado** |
| 45 | Lighthouse + imagem de prévia (Open Graph) | — |
| 46 | Deploy na Vercel (PDF no Linux, limite de PDFs, ping contra a pausa, URLs do Auth) | **conta na Vercel** |
| 47 | README final | — |
