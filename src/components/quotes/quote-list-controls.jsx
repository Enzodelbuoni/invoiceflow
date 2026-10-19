"use client"

import { useOptimistic, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowDownWideNarrowIcon, CalendarRangeIcon } from "lucide-react"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"

/**
 * Um seletor da lista (período ou ordenação). Cada opção já vem com o link
 * pronto (montado no servidor por quoteListHref, com os outros filtros); a
 * escolha aparece na hora (useOptimistic) e a página recarrega a lista.
 */
function ListSelect({ id, label, icon: Icon, value, options, onChange, pending }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full data-[size=default]:h-10 sm:w-auto" aria-busy={pending || undefined}>
          {pending ? (
            <Spinner aria-hidden="true" className="text-muted-foreground" />
          ) : (
            <Icon aria-hidden="true" className="text-muted-foreground" />
          )}
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" align="end">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/**
 * Período e ordenação da lista de orçamentos (Sprint 19). Ficam na URL
 * (?periodo=…&ordem=…), como os outros filtros.
 * @param {{ period: { value: string, options: Array<{ value: string, label: string, href: string }> },
 *   sort: { value: string, options: Array<{ value: string, label: string, href: string }> } }} props
 */
export function QuoteListControls({ period, sort }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const current = { period: period.value, sort: sort.value }
  const [optimistic, setOptimistic] = useOptimistic(current)

  function change(key, options, value) {
    const option = options.find((item) => item.value === value)
    if (!option || value === optimistic[key]) return
    startTransition(() => {
      setOptimistic((state) => ({ ...state, [key]: value }))
      router.replace(option.href, { scroll: false })
    })
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
      <ListSelect
        id="quotes-period"
        label="Período (pela data de envio; rascunhos, pela de criação)"
        icon={CalendarRangeIcon}
        value={optimistic.period}
        options={period.options}
        onChange={(value) => change("period", period.options, value)}
        pending={optimistic.period !== current.period}
      />
      <ListSelect
        id="quotes-sort"
        label="Ordenar por"
        icon={ArrowDownWideNarrowIcon}
        value={optimistic.sort}
        options={sort.options}
        onChange={(value) => change("sort", sort.options, value)}
        pending={optimistic.sort !== current.sort}
      />
    </div>
  )
}
