import Link from "next/link"
import { CalculatorIcon, CheckIcon, Link2Icon, SignatureIcon } from "lucide-react"

import { LogoMark, LogoWordmark } from "@/components/brand/logo"
import { StatusBadge } from "@/components/shared/status-badge"
import { formatCurrency } from "@/lib/format"

const SAMPLE_ITEMS = [
  { name: "Identidade visual", value: 3200 },
  { name: "Landing page", value: 2400 },
  { name: "Social media (3 meses)", value: 1800 },
]
const SAMPLE_TOTAL = SAMPLE_ITEMS.reduce((sum, item) => sum + item.value, 0)

const HIGHLIGHTS = [
  { label: "Cálculo automático", icon: CalculatorIcon },
  { label: "Link público", icon: Link2Icon },
  { label: "Aceite online", icon: SignatureIcon },
]

// Proposta ilustrativa (decorativa) mostrando o produto em uso.
function QuoteMock() {
  return (
    <div aria-hidden="true" className="relative w-full max-w-md">
      <div className="animate-float">
        <div className="-rotate-2 rounded-2xl border border-white/10 bg-card p-6 text-card-foreground shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs text-muted-foreground">#2026-014</p>
              <p className="mt-1 font-medium">Estúdio Aurora</p>
              <p className="text-xs text-muted-foreground">Identidade visual e site</p>
            </div>
            <StatusBadge status="approved" />
          </div>
          <ul className="mt-5 divide-y text-sm">
            {SAMPLE_ITEMS.map((item) => (
              <li key={item.name} className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-muted-foreground">{item.name}</span>
                <span className="tabular-nums">{formatCurrency(item.value)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-end justify-between border-t pt-4">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="font-display text-3xl leading-none">{formatCurrency(SAMPLE_TOTAL)}</span>
          </div>
        </div>
      </div>

      {/* Notificação que "chega" depois da página carregar. */}
      <div className="absolute -top-14 -right-4 animate-enter xl:-right-12" style={{ animationDelay: "900ms" }}>
        <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 py-2.5 pr-4 pl-2.5 text-sm text-white shadow-xl backdrop-blur-md">
          <span className="flex size-8 items-center justify-center rounded-full bg-[oklch(0.62_0.15_155)]">
            <CheckIcon className="size-4" strokeWidth={2.5} />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-medium">Proposta aprovada</span>
            <span className="text-xs text-white/60">Estúdio Aurora · agora</span>
          </span>
        </div>
      </div>
    </div>
  )
}

/** Painel da marca exibido ao lado dos formulários de autenticação (só em telas grandes). */
export function AuthBrandPanel() {
  return (
    <aside className="relative isolate hidden overflow-hidden bg-[oklch(0.2_0.05_270)] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
      {/* Atmosfera: brilhos coloridos + grade que some nas bordas. */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-48 -left-40 -z-10 size-144 rounded-full bg-[oklch(0.55_0.22_268)] opacity-45 blur-[120px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 -bottom-56 -z-10 size-120 rounded-full bg-[oklch(0.6_0.2_300)] opacity-30 blur-[120px]" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,oklch(1_0_0/0.06)_1px,transparent_1px),linear-gradient(to_bottom,oklch(1_0_0/0.06)_1px,transparent_1px)] bg-size-[44px_44px] mask-[radial-gradient(ellipse_70%_60%_at_40%_45%,black,transparent)]"
      />

      <Link href="/" className="flex w-fit items-center gap-2.5 rounded-lg" aria-label="InvoiceFlow, página inicial">
        <LogoMark />
        <LogoWordmark />
      </Link>

      <div className="mx-auto flex w-full max-w-xl flex-col gap-14">
        <div>
          <p className="font-display text-5xl leading-[1.02] tracking-[-0.01em] text-balance xl:text-6xl">
            Propostas que <em className="text-[oklch(0.82_0.11_268)]">fecham</em> negócio.
          </p>
          <p className="mt-5 max-w-md text-lg text-pretty text-white/70">
            Monte orçamentos profissionais em minutos, envie por link e acompanhe cada aprovação em tempo real.
          </p>
        </div>
        <QuoteMock />
      </div>

      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70">
        {HIGHLIGHTS.map(({ label, icon: Icon }) => (
          <li key={label} className="flex items-center gap-2">
            <Icon aria-hidden="true" className="size-4 text-white/50" />
            {label}
          </li>
        ))}
      </ul>
    </aside>
  )
}
