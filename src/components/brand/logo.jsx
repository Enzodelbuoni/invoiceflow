import { cn } from "@/lib/utils"

/** Símbolo da marca: monograma "F" de barras arredondadas sobre um bloco em gradiente índigo. */
export function LogoMark({ className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-[linear-gradient(135deg,oklch(0.6_0.2_268),oklch(0.48_0.24_282))] shadow-md ring-1 ring-white/15 ring-inset",
        className
      )}
    >
      <span className="absolute inset-x-0 top-0 h-1/2 bg-linear-to-b from-white/25 to-transparent" />
      <svg viewBox="0 0 32 32" className="relative size-[70%]" fill="white">
        <rect x="10" y="7" width="4.5" height="18" rx="2.25" />
        <rect x="10" y="7" width="12.5" height="4.5" rx="2.25" />
        <rect x="10" y="14" width="9" height="4.5" rx="2.25" fillOpacity="0.75" />
      </svg>
    </span>
  )
}

/** Logotipo "Invoice" (sans) + "Flow" (serif itálica). */
export function LogoWordmark({ className }) {
  return (
    <span className={cn("inline-flex items-baseline text-[1.05rem] leading-none tracking-tight", className)}>
      <span className="font-semibold">Invoice</span>
      <span className="font-display text-[1.2em] italic">Flow</span>
    </span>
  )
}
