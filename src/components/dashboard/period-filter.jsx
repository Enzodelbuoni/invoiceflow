"use client"

import Link, { useLinkStatus } from "next/link"

import { Spinner } from "@/components/ui/spinner"
import { DASHBOARD_PERIODS } from "@/lib/dashboard"
import { cn } from "@/lib/utils"

/** Indicador na opção clicada enquanto a página recalcula os números. */
function PendingHint() {
  const { pending } = useLinkStatus()
  return pending ? <Spinner aria-hidden="true" className="size-3" /> : null
}

/**
 * Seletor de período do painel (Sprint 18): links (?periodo=…), então o período
 * fica na URL (dá para recarregar ou compartilhar) e a página é renderizada no
 * servidor com os números certos.
 * @param {{ current: string }} props `current`: o valor do período ativo.
 */
export function PeriodFilter({ current }) {
  return (
    <nav aria-label="Período" className="inline-flex w-full rounded-lg border bg-muted/50 p-1 sm:w-auto">
      {DASHBOARD_PERIODS.map((period) => {
        const active = period.value === current
        return (
          <Link
            key={period.value}
            href={`/dashboard?periodo=${period.value}`}
            replace
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 max-md:h-9 sm:flex-none",
              active && "bg-background text-foreground shadow-xs ring-1 ring-border dark:bg-input/40",
            )}
          >
            {period.label}
            <PendingHint />
          </Link>
        )
      })}
    </nav>
  )
}
