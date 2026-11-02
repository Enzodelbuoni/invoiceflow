"use client"

import { useCallback, useMemo, useState } from "react"

const byName = (a, b) => a.name.localeCompare(b.name, "pt-BR")

/**
 * Lista do servidor + registros cadastrados pelos diálogos rápidos. A action
 * revalida a página e a lista do servidor passa a incluí-los, mas até lá eles
 * precisam aparecer (o cliente selecionado, o serviço no catálogo).
 * Usado pelo construtor de orçamentos e pelo editor de modelos.
 * @returns {[Array<{ id: string, name: string }>, (option: object) => void]}
 */
export function useOptionsWithCreated(options) {
  const [created, setCreated] = useState([])
  const merged = useMemo(() => {
    const known = new Set(options.map((option) => option.id))
    const missing = created.filter((option) => !known.has(option.id))
    return missing.length ? [...options, ...missing].sort(byName) : options
  }, [options, created])
  const addCreated = useCallback((option) => setCreated((current) => [...current, option]), [])
  return [merged, addCreated]
}
