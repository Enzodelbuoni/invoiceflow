"use client"

import { useLayoutEffect, useRef } from "react"
import { useWatch } from "react-hook-form"
import { motion } from "motion/react"
import { BanknoteIcon, PercentIcon, PlusIcon, ReceiptTextIcon, TagIcon, XIcon } from "lucide-react"

import { CurrencyField, PercentField } from "@/components/shared/form-fields"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { DISCOUNT_TYPE } from "@/lib/validations/quote"

const DISCOUNT_OPTIONS = Object.freeze([
  { value: DISCOUNT_TYPE.PERCENT, label: "Percentual", icon: PercentIcon },
  { value: DISCOUNT_TYPE.AMOUNT, label: "Valor fixo", icon: BanknoteIcon },
])

/**
 * Foco síncrono depois que a linha abre ou fecha: abrir leva ao campo de
 * valor; fechar, ao botão "Adicionar" (o "Remover" que tinha o foco some).
 * Mesmo motivo do QuoteItems: o foco precisa mudar antes da próxima tecla.
 */
function useFocusAfterToggle(open) {
  const pendingRef = useRef(null)
  const addRef = useRef(null)
  useLayoutEffect(() => {
    const target = pendingRef.current
    if (!target) return
    pendingRef.current = null
    if (target === "add") addRef.current?.focus()
    else document.getElementById(target)?.focus()
  }, [open])
  /** "add" (botão Adicionar) ou o id de um campo. */
  const focusNext = (target) => {
    pendingRef.current = target
  }
  return { focusNext, addRef }
}

/**
 * Linha de ajuste (desconto ou imposto): fechada, mostra "Adicionar"; aberta,
 * mostra os campos embaixo (alinhados ao texto, depois do ícone) e "Remover".
 */
function AdjustmentRow({ id, icon: Icon, title, description, emptyLabel, open, onAdd, onRemove, addRef, children }) {
  const titleId = `${id}-title`
  return (
    <div className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3.5">
        <span
          aria-hidden="true"
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
            open ? "bg-primary/10 text-primary-ink dark:bg-primary/15" : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 id={titleId} className="text-sm font-medium">
            {title}
          </h3>
          <p className="text-sm text-pretty text-muted-foreground">{description}</p>
        </div>
        {open ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive max-md:h-10 dark:hover:bg-destructive/20"
          >
            <XIcon data-icon="inline-start" />
            Remover<span className="sr-only"> {title.toLowerCase()}</span>
          </Button>
        ) : (
          <>
            <span className="hidden text-sm text-muted-foreground sm:inline">{emptyLabel}</span>
            <Button ref={addRef} type="button" variant="outline" size="sm" onClick={onAdd} className="max-md:h-10 max-md:px-3">
              <PlusIcon data-icon="inline-start" />
              Adicionar<span className="sr-only"> {title.toLowerCase()}</span>
            </Button>
          </>
        )}
      </div>
      {open && (
        // 3.125rem = ícone (2,25rem) + espaço (0,875rem): os campos alinham com o título.
        <div role="group" aria-labelledby={titleId} className="animate-enter sm:pl-[3.125rem]">
          {children}
        </div>
      )}
    </div>
  )
}

/**
 * Percentual ou valor fixo: rádios nativos (as setas trocam a opção) com
 * visual de controle segmentado; a pílula desliza entre as opções.
 */
function DiscountTypeControl({ value, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      <span id="discount_type-label" className="text-sm leading-snug font-medium">
        Tipo
      </span>
      <div
        role="radiogroup"
        aria-labelledby="discount_type-label"
        className="inline-flex h-10 w-fit items-center gap-0.5 rounded-lg border bg-muted/60 p-0.5 dark:bg-muted/30"
      >
        {DISCOUNT_OPTIONS.map((option) => {
          const checked = value === option.value
          const Icon = option.icon
          return (
            <label key={option.value} className="relative cursor-pointer">
              <input
                type="radio"
                name="discount_type_choice"
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="peer sr-only"
              />
              {checked && (
                <motion.span
                  layoutId="discount-type-pill"
                  aria-hidden="true"
                  className="absolute inset-0 rounded-md bg-background shadow-xs ring-1 ring-border dark:bg-card"
                  transition={{ type: "spring", stiffness: 520, damping: 42 }}
                />
              )}
              <span
                className={cn(
                  "relative flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
                  checked ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon aria-hidden="true" className="size-3.5" />
                {option.label}
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

/** Desconto (DiscountField do plano): percentual OU valor fixo sobre o subtotal. */
function DiscountRow({ form }) {
  const type = useWatch({ control: form.control, name: "discount_type" })
  const open = type !== DISCOUNT_TYPE.NONE
  const { focusNext, addRef } = useFocusAfterToggle(open)

  function setType(next) {
    form.setValue("discount_type", next, { shouldDirty: true })
    // Percentual e valor fixo não se convertem: "10" pode ser 10% ou R$ 10.
    form.setValue("discount_value", "", { shouldDirty: true })
    form.clearErrors("discount_value")
  }

  return (
    <AdjustmentRow
      id="quote-discount"
      icon={TagIcon}
      title="Desconto"
      description="Percentual ou valor fixo sobre o subtotal."
      emptyLabel="Sem desconto"
      open={open}
      addRef={addRef}
      onAdd={() => {
        focusNext("discount_value")
        setType(DISCOUNT_TYPE.PERCENT)
      }}
      onRemove={() => {
        focusNext("add")
        setType(DISCOUNT_TYPE.NONE)
      }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <DiscountTypeControl value={type} onChange={setType} />
        {type === DISCOUNT_TYPE.AMOUNT ? (
          <CurrencyField
            key="amount"
            form={form}
            name="discount_value"
            label="Valor do desconto"
            required
            hint="Abatido do subtotal."
            className="sm:w-56"
          />
        ) : (
          <PercentField
            key="percent"
            form={form}
            name="discount_value"
            label="Percentual de desconto"
            required
            hint="Sobre o subtotal dos itens."
            className="sm:w-56"
          />
        )}
      </div>
    </AdjustmentRow>
  )
}

/**
 * Imposto (TaxField do plano): um percentual simples, como o ISS (regra 4 do
 * plano: sem regras fiscais complexas). Incide sobre o subtotal com desconto.
 * `tax_enabled` diz se a linha está aberta; aberta, a alíquota é obrigatória.
 */
function TaxRow({ form }) {
  const open = useWatch({ control: form.control, name: "tax_enabled" })
  const { focusNext, addRef } = useFocusAfterToggle(open)

  function setEnabled(next) {
    form.setValue("tax_enabled", next, { shouldDirty: true })
    form.setValue("tax_rate", "", { shouldDirty: true })
    form.clearErrors("tax_rate")
  }

  return (
    <AdjustmentRow
      id="quote-tax"
      icon={ReceiptTextIcon}
      title="Impostos"
      description="Percentual que você repassa no preço, como o ISS."
      emptyLabel="Sem impostos"
      open={open}
      addRef={addRef}
      onAdd={() => {
        focusNext("tax_rate")
        setEnabled(true)
      }}
      onRemove={() => {
        focusNext("add")
        setEnabled(false)
      }}
    >
      <PercentField
        form={form}
        name="tax_rate"
        label="Alíquota"
        required
        hint="Sobre o subtotal com desconto."
        className="sm:w-56"
      />
    </AdjustmentRow>
  )
}

/** Desconto e impostos do orçamento. Os valores entram no total no Sprint 8 (motor de cálculos). */
export function QuoteAdjustments({ form }) {
  return (
    <div className="flex flex-col divide-y">
      <DiscountRow form={form} />
      <TaxRow form={form} />
    </div>
  )
}
