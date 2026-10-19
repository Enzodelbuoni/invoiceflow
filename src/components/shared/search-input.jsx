"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { SearchIcon, XIcon } from "lucide-react"

import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

const DEBOUNCE_MS = 300

/**
 * Busca das listas (clientes, serviços, orçamentos): escreve `?q=` na URL com
 * debounce e a página, no servidor, filtra. Os outros parâmetros (filtros,
 * ordem) continuam; a página (`?pagina=`) volta para a primeira.
 * @param {{ initialQuery?: string, label: string, placeholder: string, className?: string }} props
 */
export function SearchInput({ initialQuery = "", label, placeholder, className }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(initialQuery)
  const [pending, startTransition] = useTransition()
  const timer = useRef(null)

  // A busca também muda por fora (link "Limpar filtros", voltar do navegador):
  // aí o campo acompanha a URL. A navegação que o próprio campo fez não mexe
  // nele, senão o que foi digitado depois dela seria apagado.
  const urlQuery = searchParams.get("q") ?? ""
  const [seenQuery, setSeenQuery] = useState(urlQuery)
  const [ownQuery, setOwnQuery] = useState(urlQuery)
  if (urlQuery !== seenQuery) {
    setSeenQuery(urlQuery)
    if (urlQuery !== ownQuery) setValue(urlQuery)
  }

  useEffect(() => () => clearTimeout(timer.current), [])

  function navigate(term) {
    const params = new URLSearchParams(searchParams)
    const trimmed = term.trim()
    if (trimmed) params.set("q", trimmed)
    else params.delete("q")
    params.delete("pagina")
    setOwnQuery(trimmed)
    const query = params.toString()
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }))
  }

  function handleChange(event) {
    const next = event.target.value
    setValue(next)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => navigate(next), DEBOUNCE_MS)
  }

  function clear() {
    clearTimeout(timer.current)
    setValue("")
    navigate("")
  }

  return (
    <InputGroup className={cn("h-10 w-full sm:max-w-sm", className)}>
      <InputGroupAddon>
        {pending ? <Spinner aria-hidden="true" /> : <SearchIcon aria-hidden="true" />}
      </InputGroupAddon>
      <InputGroupInput
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label={label}
        className="h-full [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton size="icon-xs" onClick={clear} aria-label="Limpar busca">
            <XIcon />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  )
}
