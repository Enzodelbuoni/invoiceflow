"use client"

import { useCallback, useMemo, useState } from "react"
import { useForm } from "react-hook-form"

import { ClientSelector } from "@/components/quotes/client-selector"
import { QuoteAdjustments } from "@/components/quotes/quote-adjustments"
import { QuoteBasicInfo } from "@/components/quotes/quote-basic-info"
import { QuoteItems } from "@/components/quotes/quote-items"
import { QuoteNotes } from "@/components/quotes/quote-notes"
import { QuoteSection } from "@/components/quotes/quote-section"
import { QuoteSummary } from "@/components/quotes/quote-summary"
import { createEmptyQuoteForm } from "@/lib/validations/quote"

const byName = (a, b) => a.name.localeCompare(b.name, "pt-BR")

/**
 * Lista do servidor + registros cadastrados pelos diálogos rápidos. A action
 * revalida a página e a lista do servidor passa a incluí-los, mas até lá eles
 * precisam aparecer (o cliente selecionado, o serviço no catálogo).
 */
function useOptionsWithCreated(options) {
  const [created, setCreated] = useState([])
  const merged = useMemo(() => {
    const known = new Set(options.map((option) => option.id))
    const missing = created.filter((option) => !known.has(option.id))
    return missing.length ? [...options, ...missing].sort(byName) : options
  }, [options, created])
  const addCreated = useCallback((option) => setCreated((current) => [...current, option]), [])
  return [merged, addCreated]
}

/**
 * Construtor de orçamentos: seções numeradas à esquerda e o resumo financeiro
 * fixo à direita (no celular, o resumo vem depois das seções).
 * O schema Zod (Sprint 7) e o salvamento (Sprint 10) ainda não existem, então
 * o envio do formulário não faz nada por enquanto.
 * @param {{ today: string,
 *   clients: Array<{ id: string, name: string, company: string|null, email: string|null }>,
 *   services: Array<{ id: string, name: string, description: string|null, unit: string, price_cents: number }> }} props
 *   `today` ("AAAA-MM-DD") calculado no servidor; `clients` para o seletor; `services` para o catálogo.
 */
export function QuoteForm({ today, clients, services }) {
  const form = useForm({
    mode: "onTouched",
    defaultValues: createEmptyQuoteForm({ today }),
  })

  const [clientOptions, addCreatedClient] = useOptionsWithCreated(clients)
  const [serviceOptions, addCreatedService] = useOptionsWithCreated(services)

  return (
    <form
      noValidate
      onSubmit={(event) => event.preventDefault()}
      className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]"
    >
      <div className="flex min-w-0 flex-col gap-6">
        <QuoteSection id="quote-client" step={1} title="Cliente" description="Quem vai receber a proposta.">
          <ClientSelector form={form} clients={clientOptions} onClientCreated={addCreatedClient} />
        </QuoteSection>

        <QuoteSection
          id="quote-info"
          step={2}
          title="Informações"
          description="O que está sendo proposto e até quando vale."
        >
          <QuoteBasicInfo form={form} today={today} />
        </QuoteSection>

        <QuoteSection
          id="quote-items"
          step={3}
          title="Itens"
          description="Serviços, quantidades e preços. O subtotal é calculado automaticamente."
        >
          <QuoteItems form={form} services={serviceOptions} onServiceCreated={addCreatedService} />
        </QuoteSection>

        <QuoteSection id="quote-adjustments" step={4} title="Desconto e impostos" description="Opcionais. Entram no total.">
          <QuoteAdjustments form={form} />
        </QuoteSection>

        <QuoteSection
          id="quote-notes"
          step={5}
          title="Observações e termos"
          description="Condições que o cliente aceita ao aprovar."
        >
          <QuoteNotes form={form} />
        </QuoteSection>
      </div>

      <QuoteSummary control={form.control} today={today} clients={clientOptions} />
    </form>
  )
}
