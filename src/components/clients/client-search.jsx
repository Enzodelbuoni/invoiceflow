"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"
import { SearchIcon, XIcon } from "lucide-react"

import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"

const DEBOUNCE_MS = 300

/** Busca de clientes: escreve `?q=` na URL (o servidor filtra) com debounce. */
export function ClientSearch({ initialQuery = "" }) {
  const router = useRouter()
  const pathname = usePathname()
  const [value, setValue] = useState(initialQuery)
  const [pending, startTransition] = useTransition()
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  function navigate(term) {
    const params = new URLSearchParams()
    if (term.trim()) params.set("q", term.trim())
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
    <InputGroup className="h-10 w-full sm:max-w-sm">
      <InputGroupAddon>
        {pending ? <Spinner aria-hidden="true" /> : <SearchIcon aria-hidden="true" />}
      </InputGroupAddon>
      <InputGroupInput
        type="search"
        value={value}
        onChange={handleChange}
        placeholder="Buscar por nome, empresa ou e-mail"
        aria-label="Buscar clientes"
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
