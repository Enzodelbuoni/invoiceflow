import { cn } from "@/lib/utils"

/**
 * Abertura de uma seção da página inicial: rótulo em versalete, título em
 * serif e um parágrafo de apoio (opcional).
 * @param {{ id: string, eyebrow: string, title: React.ReactNode, children?: React.ReactNode,
 *   align?: "center"|"start", className?: string }} props `id` vai no título (aria-labelledby da seção).
 */
export function SectionHeading({ id, eyebrow, title, children, align = "center", className }) {
  return (
    <div className={cn("flex max-w-2xl flex-col gap-4", align === "center" && "mx-auto items-center text-center", className)}>
      <p className="text-xs font-semibold tracking-[0.16em] text-primary-ink uppercase">{eyebrow}</p>
      <h2 id={id} className="font-display text-4xl leading-[1.05] tracking-[-0.01em] text-balance sm:text-5xl">
        {title}
      </h2>
      {children && <p className="text-lg text-pretty text-muted-foreground">{children}</p>}
    </div>
  )
}
