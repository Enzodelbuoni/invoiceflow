@AGENTS.md

# InvoiceFlow — instruções para o Claude

- **Antes de qualquer coisa, considere a memória do projeto abaixo** (estado atual, decisões, pendências e próximo passo).
- Responder sempre em **português**.
- Trabalhar em **etapas pequenas**: construir um pouco, reportar ao usuário o que foi feito e só então seguir.
- **Avisar o usuário sobre qualquer problema** encontrado.
- Ao concluir uma etapa: criar `memoria/etapas/etapa-XX-<nome>.md` e atualizar `memoria/MEMORIA.md`.
- Requisitos e roadmap originais: `docs/info.txt` e `docs/InvoiceFlow_Plano_de_Desenvolvimento.txt`.
- Stack: Next.js 16 (App Router) em **JavaScript** (sem TypeScript), Tailwind v4, shadcn/ui, React Hook Form, Zod, Zustand, Supabase.

@memoria/MEMORIA.md
