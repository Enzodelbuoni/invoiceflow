import { Building2Icon, PaletteIcon, UserRoundIcon } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"

export const metadata = { title: "Configurações" }

const SECTIONS = [
  {
    title: "Perfil",
    description: "Seu nome, e-mail, telefone e foto.",
    icon: UserRoundIcon,
  },
  {
    title: "Dados do negócio",
    description: "Razão social, CNPJ/CPF e endereço que aparecem nas propostas.",
    icon: Building2Icon,
  },
  {
    title: "Identidade visual",
    description: "Logo e cor de destaque aplicadas aos seus orçamentos.",
    icon: PaletteIcon,
  },
]

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Configurações"
        description="Personalize sua conta e a aparência das propostas que seus clientes recebem."
      />

      <section aria-label="Seções de configuração" className="grid gap-4 md:grid-cols-3">
        {SECTIONS.map((section, index) => {
          const Icon = section.icon
          return (
            <div
              key={section.title}
              className="flex animate-enter flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm"
              style={{ animationDelay: `${120 + index * 60}ms` }}
            >
              <div className="flex items-start justify-between">
                <span
                  aria-hidden="true"
                  className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary-ink ring-1 ring-primary/15 ring-inset"
                >
                  <Icon className="size-5" />
                </span>
                <Badge variant="secondary">Em breve</Badge>
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="font-medium">{section.title}</h2>
                <p className="text-sm text-muted-foreground">{section.description}</p>
              </div>
            </div>
          )
        })}
      </section>
    </>
  )
}
