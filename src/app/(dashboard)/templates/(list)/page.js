import Link from "next/link"
import { FileTextIcon, LayoutTemplateIcon, PlusIcon } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { TemplateCard } from "@/components/templates/template-card"
import { Button } from "@/components/ui/button"
import { listQuoteTemplates } from "@/lib/data/quote-templates"

export const metadata = { title: "Modelos" }

const DESCRIPTION = "Itens, condições e termos que você repete, prontos para virar uma proposta em segundos."

/** Os dois caminhos para ter um modelo (estado vazio). */
const WAYS = ["Crie do zero com “Criar modelo”", "Ou, num orçamento pronto, use ⋯ → “Salvar como modelo”"]

function NewTemplateButton({ size = "lg", children = "Novo modelo" }) {
  return (
    <Button asChild size={size} className="h-10 px-4">
      <Link href="/templates/new">
        <PlusIcon data-icon="inline-start" />
        {children}
      </Link>
    </Button>
  )
}

export default async function TemplatesPage() {
  const templates = await listQuoteTemplates()

  if (templates.length === 0) {
    return (
      <>
        <PageHeader title="Modelos" description={DESCRIPTION} actions={<NewTemplateButton />} />
        <EmptyState
          icon={LayoutTemplateIcon}
          title="Nenhum modelo ainda"
          description="Um modelo guarda os itens, o desconto, os impostos, os textos e o prazo de uma proposta. Você escolhe o cliente na hora de usar."
          footer={
            <ul className="flex flex-col items-center gap-2 text-sm sm:flex-row sm:gap-5">
              {WAYS.map((way, index) => (
                <li key={way} className="flex items-center gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full border bg-background text-[0.6875rem] font-medium text-foreground tabular-nums">
                    {index + 1}
                  </span>
                  {way}
                </li>
              ))}
            </ul>
          }
        >
          <NewTemplateButton size="default">Criar modelo</NewTemplateButton>
          <Button asChild variant="outline" className="h-10 px-4">
            <Link href="/quotes">
              <FileTextIcon data-icon="inline-start" />
              Ver meus orçamentos
            </Link>
          </Button>
        </EmptyState>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Modelos" description={DESCRIPTION} actions={<NewTemplateButton />} />

      <div className="flex flex-col gap-4">
        <p id="templates-summary" tabIndex={-1} className="text-sm text-muted-foreground outline-none" aria-live="polite">
          {templates.length === 1 ? "1 modelo" : `${templates.length} modelos`} · Também dá para criar um a partir de um
          orçamento: ⋯ → “Salvar como modelo”.
        </p>
        {/* Container query: as colunas acompanham a largura da lista (sidebar aberta ou não). */}
        <div className="@container">
          <ul className="grid grid-cols-1 gap-4 @2xl:grid-cols-2 @6xl:grid-cols-3">
            {templates.map((template, index) => (
              <TemplateCard key={template.id} template={template} index={index} />
            ))}
          </ul>
        </div>
      </div>
    </>
  )
}
