"use client"

import Link, { useLinkStatus } from "next/link"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

/** Conteúdo do link; enquanto a página pedida carrega, um indicador no lugar. */
function LinkContent({ children }) {
  const { pending } = useLinkStatus()
  return pending ? <Spinner aria-hidden="true" /> : children
}

const pageButton = (active) =>
  cn(buttonVariants({ variant: active ? "outline" : "ghost", size: "icon" }), "tabular-nums", active && "pointer-events-none")

function StepLink({ href, label, children, className }) {
  if (!href) {
    return (
      <span aria-disabled="true" className={cn(buttonVariants({ variant: "ghost" }), "pointer-events-none opacity-40", className)}>
        {children}
      </span>
    )
  }
  return (
    <Link href={href} aria-label={label} className={cn(buttonVariants({ variant: "ghost" }), className)}>
      <LinkContent>{children}</LinkContent>
    </Link>
  )
}

/**
 * Paginação da lista de orçamentos (Sprint 19): anterior, páginas (com "…"
 * no lugar das que ficam de fora) e próxima. Os links vêm prontos do servidor.
 * @param {{ page: number, pages: number, items: Array<{ key: string, page?: number, href?: string }>,
 *   previousHref: string | null, nextHref: string | null }} props
 */
export function QuoteListPagination({ page, pages, items, previousHref, nextHref }) {
  return (
    <nav aria-label="Paginação" className="flex items-center justify-between gap-2">
      <p className="hidden text-sm text-muted-foreground sm:block">
        Página {page} de {pages}
      </p>
      <div className="flex w-full items-center justify-between gap-1 sm:w-auto sm:justify-end">
        <StepLink href={previousHref} label="Página anterior" className="px-2">
          <ChevronLeftIcon aria-hidden="true" />
          <span className="hidden sm:inline">Anterior</span>
        </StepLink>
        <ul className="flex items-center gap-1">
          {items.map((item) =>
            item.page ? (
              <li key={item.key}>
                <Link
                  href={item.href}
                  aria-label={`Página ${item.page}`}
                  aria-current={item.page === page ? "page" : undefined}
                  className={pageButton(item.page === page)}
                >
                  <LinkContent>{item.page}</LinkContent>
                </Link>
              </li>
            ) : (
              <li key={item.key} aria-hidden="true" className="flex size-8 items-center justify-center text-muted-foreground">
                …
              </li>
            ),
          )}
        </ul>
        <StepLink href={nextHref} label="Próxima página" className="px-2">
          <span className="hidden sm:inline">Próxima</span>
          <ChevronRightIcon aria-hidden="true" />
        </StepLink>
      </div>
    </nav>
  )
}
