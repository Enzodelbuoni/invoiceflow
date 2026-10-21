"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Building2Icon, PaletteIcon, UserRoundIcon } from "lucide-react"
import { motion } from "motion/react"

import { cn } from "@/lib/utils"

// Abas de Configurações (etapas 38 e 39): links para as sub-rotas, com o traço
// da aba ativa deslizando (motion `layoutId`, como nas abas da lista de
// orçamentos). No celular as abas ficam sem ícone, para caber em 360 px.
const TABS = [
  { href: "/settings/profile", label: "Perfil", icon: UserRoundIcon },
  { href: "/settings/business", label: "Negócio", icon: Building2Icon },
  { href: "/settings/branding", label: "Identidade visual", icon: PaletteIcon },
]

export function SettingsNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Seções das configurações" className="border-b">
      <ul className="-mb-px flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const active = pathname === tab.href
          return (
            <li key={tab.href} className="shrink-0">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-10 items-center gap-2 rounded-t-md px-3 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
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
