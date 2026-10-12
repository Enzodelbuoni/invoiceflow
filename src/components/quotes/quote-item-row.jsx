"use client"

import { get, useWatch } from "react-hook-form"
import { motion } from "motion/react"
import { ArrowDownIcon, ArrowUpIcon, PackageIcon, PencilLineIcon, Trash2Icon } from "lucide-react"

import { CurrencyField, QuantityField, SelectField, TextField, TextareaField } from "@/components/shared/form-fields"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { SERVICE_UNIT_OPTIONS } from "@/lib/constants/service-units"
import { formatCurrency, parseCurrencyInput } from "@/lib/money"
import { cn } from "@/lib/utils"
import { QUOTE_LIMITS } from "@/lib/validations/quote"

/** Botão só com ícone: nome acessível no `label` e o mesmo texto no tooltip. */
function IconAction({ id, label, tooltip, icon: Icon, className, ...props }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button id={id} type="button" variant="ghost" size="icon-sm" className={cn("text-muted-foreground", className)} {...props}>
          <Icon />
          <span className="sr-only">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}

/**
 * Preço unitário. Num item do catálogo, quando o valor foi ajustado, a dica
 * lembra o preço do serviço (o orçamento guarda o valor digitado).
 */
function UnitPriceField({ form, name, catalogPriceCents, className }) {
  const value = useWatch({ control: form.control, name })
  const cents = parseCurrencyInput(value ?? "")
  const adjusted = catalogPriceCents != null && cents !== null && cents !== catalogPriceCents
  return (
    <CurrencyField
      form={form}
      name={name}
      label="Preço unitário"
      required
      hint={adjusted ? `No catálogo: ${formatCurrency(catalogPriceCents)}` : undefined}
      className={className}
    />
  )
}

/**
 * Uma linha do orçamento (QuoteItemRow do plano): nome, descrição, quantidade,
 * unidade e preço unitário, com ações de mover e remover. O subtotal da linha
 * chega com o motor de cálculos (Sprint 8).
 * `fieldId` é o id estável do useFieldArray: os ids dos botões partem dele para
 * o foco voltar ao lugar certo depois de mover ou remover.
 */
export function QuoteItemRow({ form, index, count, fieldId, fromCatalog, catalogPriceCents, onMove, onRemove }) {
  const path = (field) => `items.${index}.${field}`
  const titleId = `item-${fieldId}-title`
  const position = index + 1
  const name = useWatch({ control: form.control, name: path("name") })
  const itemLabel = name?.trim() ? `“${name.trim()}”` : `item ${position}`
  // Algum campo desta linha com erro: a borda do item muda de cor, para achar
  // o item com problema numa lista longa.
  const hasError = Boolean(get(form.formState.errors, `items.${index}`))

  return (
    <motion.li
      // "position": anima só o deslocamento (ao mover ou remover um vizinho),
      // sem esticar o conteúdo quando a altura muda (ex.: aparece um erro).
      // Sem animação de saída de propósito: o item removido continuaria na tela
      // com os campos registrados no RHF pelo índice antigo, que já pertence a
      // outro item (ele mostraria o texto do vizinho e, ao desmontar, marcaria o
      // campo do vizinho como desmontado). O "Desfazer" do aviso cobre o engano.
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 520, damping: 42 }}
      className="list-none"
    >
      <fieldset
        aria-labelledby={titleId}
        className={cn(
          "min-w-0 rounded-xl border bg-background/60 shadow-xs transition-colors dark:bg-background/30",
          hasError && "border-destructive/50",
        )}
      >
        <div className="flex items-center gap-2 border-b border-dashed py-2 pr-2 pl-4">
          <h3 id={titleId} className="flex min-w-0 items-center gap-2 text-sm font-medium">
            <span className="text-muted-foreground tabular-nums">Item {position}</span>
          </h3>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-medium",
              fromCatalog
                ? "bg-primary/10 text-primary-ink dark:bg-primary/15"
                : "bg-muted text-muted-foreground",
            )}
          >
            {fromCatalog ? <PackageIcon aria-hidden="true" className="size-3" /> : <PencilLineIcon aria-hidden="true" className="size-3" />}
            {fromCatalog ? "Do catálogo" : "Avulso"}
          </span>
          <div className="ml-auto flex items-center gap-0.5">
            <IconAction
              id={`item-${fieldId}-up`}
              icon={ArrowUpIcon}
              label={`Mover ${itemLabel} para cima`}
              tooltip="Mover para cima"
              disabled={index === 0}
              onClick={() => onMove(index, index - 1, "up")}
            />
            <IconAction
              id={`item-${fieldId}-down`}
              icon={ArrowDownIcon}
              label={`Mover ${itemLabel} para baixo`}
              tooltip="Mover para baixo"
              disabled={index === count - 1}
              onClick={() => onMove(index, index + 1, "down")}
            />
            <IconAction
              id={`item-${fieldId}-remove`}
              icon={Trash2Icon}
              label={`Remover ${itemLabel}`}
              tooltip="Remover item"
              className="hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/20"
              onClick={() => onRemove(index)}
            />
          </div>
        </div>

        {/* Container query: a largura da coluna do construtor muda com a sidebar e o resumo. */}
        <div className="@container">
          <div className="grid grid-cols-2 gap-4 p-4 @md:grid-cols-6">
            <TextField
              form={form}
              name={path("name")}
              label="Nome"
              required
              autoComplete="off"
              placeholder="Ex.: Hospedagem anual"
              className="col-span-2 @md:col-span-6"
            />
            <TextareaField
              form={form}
              name={path("description")}
              label="Descrição"
              rows={2}
              maxLength={QUOTE_LIMITS.itemDescription}
              placeholder="O que está incluído (opcional)"
              className="col-span-2 @md:col-span-6"
            />
            <QuantityField form={form} name={path("quantity")} label="Quantidade" required className="@md:col-span-2" />
            <SelectField
              form={form}
              name={path("unit")}
              label="Unidade"
              required
              options={SERVICE_UNIT_OPTIONS}
              className="@md:col-span-2"
            />
            <UnitPriceField
              form={form}
              name={path("unit_price")}
              catalogPriceCents={catalogPriceCents}
              className="col-span-2 @md:col-span-2"
            />
          </div>
        </div>
      </fieldset>
    </motion.li>
  )
}
