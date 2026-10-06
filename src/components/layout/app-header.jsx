"use client"

import { usePathname } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import { ChevronRightIcon } from "lucide-react"

import { ThemeToggle } from "@/components/layout/theme-toggle"
import { findNavItem } from "@/components/layout/nav-items"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function AppHeader() {
  const pathname = usePathname()
  const current = findNavItem(pathname)

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/75 px-4 backdrop-blur-xl backdrop-saturate-150 md:px-6">
      <SidebarTrigger className="-ml-1.5 text-muted-foreground hover:text-foreground" />
      <Separator orientation="vertical" className="mr-1 data-vertical:h-4 data-vertical:self-center" />

      <nav aria-label="Trilha de navegação" className="min-w-0">
        <ol className="flex items-center gap-1.5 text-sm">
          <li className="hidden text-muted-foreground sm:block">InvoiceFlow</li>
          <li aria-hidden="true" className="hidden text-muted-foreground/50 sm:block">
            <ChevronRightIcon className="size-3.5" />
          </li>
          <li className="relative min-w-0">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={current?.href ?? pathname}
                aria-current="page"
                className="block truncate font-medium"
                initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                {current?.title ?? "Painel"}
              </motion.span>
            </AnimatePresence>
          </li>
        </ol>
      </nav>

      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
      </div>
    </header>
  )
}
