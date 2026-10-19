"use client"

import { useEffect, useRef, useState } from "react"
import Link, { useLinkStatus } from "next/link"
import { motion } from "motion/react"

import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

const countFormatter = new Intl.NumberFormat("pt-BR")
const FADE_PX = 32

/** Contagem da aba; enquanto a lista daquela aba carrega, um indicador no lugar. */
function TabCount({ count, active }) {
  const { pending } = useLinkStatus()
  if (pending) return <Spinner aria-hidden="true" className="size-3.5" />
  return (
    <span
      aria-hidden="true"
      className={cn(
        "min-w-5 rounded-full px-1.5 py-px text-center text-xs font-medium tabular-nums transition-colors",
        active ? "bg-primary/10 text-primary-ink dark:bg-primary/20" : "bg-muted text-muted-foreground",
        count === 0 && !active && "opacity-60",
      )}
    >
      {countFormatter.format(count)}
    </span>
  )
}

/**
 * Abas de status da lista de orçamentos (Sprint 19): links (?status=…), com a
 * contagem de cada aba já considerando a busca e o período. O traço da aba
 * ativa desliza até a nova (motion `layoutId`). No celular a fileira rola na
 * horizontal e a aba ativa fica à vista.
 * @param {{ tabs: Array<{ value: string, label: string, count: number, href: string, description?: string }>,
 *   current: string }} props `href`: o link da aba com os outros filtros mantidos.
 */
export function QuoteStatusTabs({ tabs, current }) {
  const listRef = useRef(null)
  // Bordas da rolagem: o lado que ainda tem abas escondidas fica esmaecido.
  const [edges, setEdges] = useState({ start: true, end: true })

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const update = () => {
      // Folga de 2 px: com zoom, scrollLeft tem fração e scrollWidth é arredondado.
      const start = list.scrollLeft <= 2
      const end = list.scrollLeft + list.clientWidth >= list.scrollWidth - 2
      setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }))
    }
    const observer = new ResizeObserver(update) // também avisa logo ao observar
    observer.observe(list)
    list.addEventListener("scroll", update, { passive: true })
    return () => {
      observer.disconnect()
      list.removeEventListener("scroll", update)
    }
  }, [])

  // Aba ativa escondida na rolagem horizontal (celular) → traz para o meio.
  useEffect(() => {
    const list = listRef.current
    const active = list?.querySelector("[aria-current=page]")
    if (!list || !active || list.scrollWidth <= list.clientWidth) return
    const left = active.offsetLeft // a lista é o offsetParent (relative)
    if (left < list.scrollLeft || left + active.offsetWidth > list.scrollLeft + list.clientWidth) {
      list.scrollLeft = left - (list.clientWidth - active.offsetWidth) / 2
    }
  }, [current])

  const fade =
    edges.start && edges.end
      ? undefined
      : `linear-gradient(to right, ${edges.start ? "black" : "transparent"}, black ${FADE_PX}px, black calc(100% - ${FADE_PX}px), ${edges.end ? "black" : "transparent"})`

  return (
    <nav aria-label="Filtrar por status" className="border-b">
      <ul
        ref={listRef}
        style={{ maskImage: fade, WebkitMaskImage: fade }}
        className="relative -mb-px flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab) => {
          const active = tab.value === current
          const name = `${tab.label}: ${countFormatter.format(tab.count)} ${tab.count === 1 ? "orçamento" : "orçamentos"}`
          return (
            <li key={tab.value} className="shrink-0">
              <Link
                href={tab.href}
                replace
                scroll={false}
                aria-current={active ? "page" : undefined}
                aria-label={name}
                title={tab.description}
                className={cn(
                  "relative flex h-10 items-center gap-2 rounded-t-md px-3 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
                <TabCount count={tab.count} active={active} />
                {active && (
                  <motion.span
                    layoutId="quote-status-tab"
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
