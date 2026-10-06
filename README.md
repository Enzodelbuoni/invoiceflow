# InvoiceFlow

Ferramenta para freelancers criarem **propostas comerciais e orçamentos profissionais**, calcularem valores automaticamente, compartilharem um link público com o cliente e acompanharem aprovações.

> 🚧 Projeto em desenvolvimento — Fase 1 (Setup & Design System).

## Stack

| Camada        | Tecnologia                                      |
| ------------- | ----------------------------------------------- |
| Framework     | Next.js 16 (App Router, Turbopack) + React 19   |
| Linguagem     | JavaScript (sem TypeScript)                     |
| Estilo        | Tailwind CSS v4 + shadcn/ui (Radix, preset Nova) |
| Formulários   | React Hook Form + Zod                           |
| Estado de UI  | Zustand                                         |
| Backend       | Supabase (Auth + PostgreSQL + RLS)              |

## Como rodar

Pré-requisito: Node.js 20.9 ou superior.

```bash
npm install
cp .env.example .env.local   # depois preencha com os dados do Supabase
npm run dev
```

Acesse http://localhost:3000.

### Variáveis de ambiente

| Variável                               | Descrição                                   |
| -------------------------------------- | ------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | URL do projeto Supabase                     |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (ou a chave `anon` legada)  |
| `NEXT_PUBLIC_SITE_URL`                 | URL pública da aplicação                    |

## Scripts

| Comando         | O que faz                     |
| --------------- | ----------------------------- |
| `npm run dev`   | Servidor de desenvolvimento   |
| `npm run build` | Build de produção             |
| `npm run start` | Sobe o build de produção      |
| `npm run lint`  | ESLint                        |

## Estrutura

```
src/
├── app/            # Rotas, layouts e composição (App Router)
│   └── (public)/   # Rotas públicas (landing, orçamento público)
├── components/     # UI (components/ui = shadcn/ui)
└── lib/
    ├── supabase/   # Clientes Supabase (browser e servidor)
    └── utils.js    # Helper cn() para classes Tailwind
docs/               # Documentos de requisitos e plano de desenvolvimento
memoria/            # Registro do andamento do projeto, etapa por etapa
```

## Documentação do projeto

- [`docs/info.txt`](docs/info.txt): conceito e funcionalidades
- [`docs/InvoiceFlow_Plano_de_Desenvolvimento.txt`](docs/InvoiceFlow_Plano_de_Desenvolvimento.txt): roadmap completo por sprints
- [`memoria/MEMORIA.md`](memoria/MEMORIA.md): estado atual e histórico do desenvolvimento
