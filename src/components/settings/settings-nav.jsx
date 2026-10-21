"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Building2Icon, PaletteIcon, UserRoundIcon } from "lucide-react"
import { motion } from "motion/react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// Abas de Configurações (etapa 38): links para as sub-rotas, com o traço da
// aba ativa deslizando (motion `layoutId`, como nas abas da lista de
// orçamentos). "Identidade visual" chega na etapa 39.
const TABS = [
  { href: "/settings/profile", label: "Perfil", icon: UserRoundIcon },
  { href: "/settings/business", label: "Negócio", icon: Building2Icon },
  { label: "Identidade visual", icon: PaletteIcon, soon: true },
]

const tabClass =
  "relative flex h-10 items-center gap-2 rounded-t-md px-3 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"

export function SettingsNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Seções das configurações" className="border-b">
      <ul className="-mb-px flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((tab) => {
          const Icon = tab.icon
          if (tab.soon) {
            return (
              <li key={tab.label} className="shrink-0">
                <span aria-disabled="true" title="Em breve" className={cn(tabClass, "cursor-default text-muted-foreground/70")}>
                  <Icon aria-hidden="true" className="size-4 max-sm:hidden" />
                  {tab.label}
                  {/* No celular o selo não cabe na fileira (a aba continua apagada). */}
                  <Badge variant="secondary" className="px-1.5 text-[0.6875rem] max-sm:sr-only">
                    Em breve
                  </Badge>
                </span>
              </li>
            )
          }
          const active = pathname === tab.href
          return (
            <li key={tab.href} className="shrink-0">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(tabClass, active ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                <Icon aria-hidden="true" className="size-4 max-sm:hidden" />
                {tab.label}
                {active && (
                  <motion.span
                    layoutId="settings-tab"
                    aria-hidden="true"
                    className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 520, damping: 42 }}
                  />
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
