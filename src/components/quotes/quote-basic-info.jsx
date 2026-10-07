"use client"

import { useWatch } from "react-hook-form"

import { TextField, TextareaField } from "@/components/shared/form-fields"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { addDaysIso, daysBetweenIso, describeDaysFromToday, formatIsoDateLong } from "@/lib/dates"
import { cn } from "@/lib/utils"
import { QUOTE_LIMITS, VALIDITY_PRESETS } from "@/lib/validations/quote"

/**
 * Validade da proposta: data + atalhos (7, 15, 30 dias). Embaixo, a data por
 * extenso e quanto falta, para não haver dúvida sobre o dia escolhido.
 */
function ValidityField({ form, today }) {
  const value = useWatch({ control: form.control, name: "valid_until" })
  const error = form.formState.errors.valid_until
  const days = daysBetweenIso(today, value)
  const longDate = formatIsoDateLong(value)

  function choose(daysAhead) {
    form.setValue("valid_until", addDaysIso(today, daysAhead), { shouldDirty: true, shouldTouch: true })
  }

  return (
    <Field data-invalid={!!error} className="sm:col-span-2">
      <FieldLabel htmlFor="valid_until">Válido até</FieldLabel>
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <Input
          id="valid_until"
          type="date"
          min={today}
          className="h-10 sm:w-48"
          aria-invalid={!!error}
          aria-describedby={error ? "valid_until-error" : "valid_until-hint"}
          {...form.register("valid_until")}
        />
        <div role="group" aria-label="Atalhos de validade" className="flex gap-1.5">
          {VALIDITY_PRESETS.map((preset) => {
            const active = days === preset
            return (
              <button
                key={preset}
                type="button"
                aria-pressed={active}
                onClick={() => choose(preset)}
                className={cn(
                  "h-8 rounded-full border px-3 text-xs font-medium tabular-nums transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  active
                    ? "border-primary/40 bg-primary/10 text-primary-ink dark:bg-primary/15"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {preset} dias
              </button>
            )
          })}
        </div>
      </div>
      {!error && (
        <FieldDescription id="valid_until-hint">
          {longDate ? (
            <>
              {longDate} <span aria-hidden="true">·</span> {describeDaysFromToday(days)}
            </>
          ) : (
            "Até quando o cliente pode aprovar a proposta."
          )}
        </FieldDescription>
      )}
      <FieldError id="valid_until-error" errors={[error]} />
    </Field>
  )
}

/** Título, descrição e validade (QuoteBasicInfo do plano). */
export function QuoteBasicInfo({ form, today }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <TextField
        form={form}
        name="title"
        label="Título"
        required
        autoComplete="off"
        placeholder="Ex.: Site institucional para o Estúdio Aurora"
        className="sm:col-span-2"
      />
      <TextareaField
        form={form}
        name="description"
        label="Descrição"
        rows={3}
        maxLength={QUOTE_LIMITS.description}
        hint="Contexto e objetivo do projeto. Aparece no topo da proposta."
        placeholder="Ex.: Novo site com 5 páginas, focado em gerar contatos pelo WhatsApp."
        className="sm:col-span-2"
      />
      <ValidityField form={form} today={today} />
    </div>
  )
}
