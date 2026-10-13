"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { useFieldArray } from "react-hook-form"
import { ListPlusIcon, PackageIcon, PencilLineIcon } from "lucide-react"
import { toast } from "sonner"

import { QuoteItemRow } from "@/components/quotes/quote-item-row"
import { QuoteSectionEmpty } from "@/components/quotes/quote-section"
import { ServicePicker } from "@/components/quotes/service-picker"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"
import { useMounted } from "@/hooks/use-mounted"
import { listErrorMessage } from "@/lib/form-errors"
import { QUOTE_LIMITS, createQuoteItem } from "@/lib/validations/quote"

const plural = (count) => `${count} ${count === 1 ? "item" : "itens"}`

/** Nome para mensagens: “Design de landing page” ou “item 2”. */
function describeItem(values, position) {
  const name = values?.name?.trim()
  return name ? `“${name}”` : `item ${position}`
}

/**
 * Itens do orçamento (QuoteItems + AddItemButton do plano), com useFieldArray:
 * adicionar do catálogo (snapshot do serviço) ou avulso, mover e remover (com
 * "Desfazer" no aviso). Mudanças na lista são anunciadas para leitores de tela.
 * @param {{ form: object, services: Array<object>, onServiceCreated: (service: object) => void }} props
 */
export function QuoteItems({ form, services, onServiceCreated }) {
  const { fields, append, insert, move, remove } = useFieldArray({ control: form.control, name: "items" })
  // Os ids do useFieldArray são aleatórios: o servidor e o navegador geram ids
  // diferentes para os itens que já vêm preenchidos (edição). Até montar, os
  // ids do DOM partem da posição; o foco depois de mover/remover só acontece
  // depois de montado, já com os ids estáveis.
  const mounted = useMounted()
  const [announcement, setAnnouncement] = useState("")
  const full = fields.length >= QUOTE_LIMITS.items

  // Foco depois que a lista renderizar: um campo ou botão de uma linha (pelo
  // id; nos campos, o id é o próprio name, ex.: "items.2.name") ou, sem itens,
  // o botão do catálogo. Adicionar, mover e remover trocam elementos de lugar
  // (ou os tiram da tela), e o foco se perderia.
  // O foco é síncrono (useLayoutEffect + focus() direto) para mudar antes da
  // próxima tecla: com useEffect ou form.setFocus (que adia com setTimeout),
  // quem digita logo depois do Enter perde as primeiras letras ou as grava no item anterior.
  const pendingFocus = useRef(null)
  const emptyTriggerRef = useRef(null)
  useLayoutEffect(() => {
    const target = pendingFocus.current
    if (!target) return
    pendingFocus.current = null
    if (target.id) document.getElementById(target.id)?.focus()
    else emptyTriggerRef.current?.querySelector("button")?.focus()
  }, [fields])

  // Avisos de "Item removido" abertos: saindo da página, eles fecham (o
  // "Desfazer" mexeria num formulário que não existe mais).
  const undoToasts = useRef(new Set())
  useEffect(() => {
    const toasts = undoToasts.current
    return () => toasts.forEach((id) => toast.dismiss(id))
  }, [])

  // Item escolhido no catálogo: o foco vai para a quantidade quando a lista
  // ou o diálogo terminam de fechar (ServicePicker → onAdded).
  const lastAdded = useRef(null)

  function addFromCatalog(service) {
    if (full) return
    const index = fields.length
    append(createQuoteItem(service), { shouldFocus: false })
    lastAdded.current = `items.${index}.quantity`
    setAnnouncement(`“${service.name}” adicionado. ${plural(index + 1)} no orçamento.`)
  }

  function addBlank() {
    if (full) return
    const index = fields.length
    append(createQuoteItem(), { shouldFocus: false })
    pendingFocus.current = { id: `items.${index}.name` }
    setAnnouncement(`Item avulso adicionado. ${plural(index + 1)} no orçamento.`)
  }

  function moveItem(from, to, direction) {
    const values = form.getValues(`items.${from}`)
    const fieldId = fields[from].id
    move(from, to)
    // Mantém o foco no botão usado; se ele ficou desativado (chegou ao topo ou
    // ao fim), vai para o da direção oposta.
    const atEdge = direction === "up" ? to === 0 : to === fields.length - 1
    const button = atEdge ? (direction === "up" ? "down" : "up") : direction
    pendingFocus.current = { id: `item-${fieldId}-${button}` }
    setAnnouncement(`${describeItem(values, from + 1)} agora é o item ${to + 1} de ${fields.length}.`)
  }

  function removeItem(index) {
    // Cópia: é ela que volta para a lista se a pessoa clicar em "Desfazer".
    const values = { ...form.getValues(`items.${index}`) }
    const label = describeItem(values, index + 1)
    const remaining = fields.length - 1
    remove(index)

    // O foco vai para o botão de remover da linha que ocupou o lugar (ou da
    // anterior, se era a última); sem itens, para o botão do catálogo.
    const neighbor = fields[index + 1] ?? fields[index - 1]
    pendingFocus.current = neighbor ? { id: `item-${neighbor.id}-remove` } : { trigger: true }
    setAnnouncement(`${label} removido. ${remaining ? `${plural(remaining)} no orçamento.` : "O orçamento está sem itens."}`)

    const toastId = toast("Item removido", {
      description: label,
      // Mais tempo que o padrão (4 s) para dar tempo de desfazer.
      duration: 8000,
      onDismiss: () => undoToasts.current.delete(toastId),
      onAutoClose: () => undoToasts.current.delete(toastId),
      action: {
        label: "Desfazer",
        onClick: () => {
          const current = form.getValues("items").length
          if (current >= QUOTE_LIMITS.items) {
            toast.error(`O orçamento já tem o máximo de ${QUOTE_LIMITS.items} itens.`)
            return
          }
          const at = Math.min(index, current)
          insert(at, values, { shouldFocus: false })
          pendingFocus.current = { id: `items.${at}.name` }
          setAnnouncement(`${label} voltou para o orçamento.`)
        },
      },
    })
    undoToasts.current.add(toastId)
  }

  // Serviços que já estão no orçamento (marcados na lista do catálogo).
  function getUsedServiceIds() {
    return new Set((form.getValues("items") ?? []).map((item) => item.service_id).filter(Boolean))
  }

  const blankButton = (props) => (
    <Button type="button" disabled={full} onClick={addBlank} {...props}>
      <PencilLineIcon data-icon="inline-start" />
      Item avulso
    </Button>
  )

  const catalogPrice = new Map(services.map((service) => [service.id, service.price_cents]))

  // Erro da lista inteira (ex.: nenhum item). O botão do catálogo leva o id
  // "items": é para ele que vai o foco quando o envio encontra a lista vazia.
  const listError = listErrorMessage(form.formState.errors.items)
  const catalogA11y = {
    id: "items",
    "aria-invalid": Boolean(listError),
    "aria-describedby": listError ? "items-error" : undefined,
  }
  const listErrorMessageEl = listError && (
    <FieldError id="items-error" errors={[{ message: listError }]} className="mt-2" />
  )

  return (
    <>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <ServicePicker
        services={services}
        getUsedServiceIds={getUsedServiceIds}
        onPick={addFromCatalog}
        onServiceCreated={onServiceCreated}
        onAdded={() => lastAdded.current && document.getElementById(lastAdded.current)?.focus()}
      >
        {(catalogButton) =>
          fields.length === 0 ? (
            <div ref={emptyTriggerRef}>
              <QuoteSectionEmpty
                icon={ListPlusIcon}
                title="Nenhum item ainda"
                invalid={Boolean(listError)}
                description={
                  services.length
                    ? "Adicione serviços do seu catálogo (nome e preço vêm prontos) ou um item avulso só para este orçamento."
                    : "Seu catálogo está vazio. Cadastre um serviço (ele fica salvo para os próximos orçamentos) ou adicione um item avulso."
                }
              >
                {catalogButton({
                  ...catalogA11y,
                  variant: "outline",
                  className: "h-9",
                  children: (
                    <>
                      <PackageIcon data-icon="inline-start" />
                      Do catálogo
                    </>
                  ),
                })}
                {blankButton({ variant: "ghost", className: "h-9" })}
              </QuoteSectionEmpty>
              {listErrorMessageEl}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <ol aria-label="Itens do orçamento" className="flex flex-col gap-3">
                {fields.map((field, index) => (
                  <QuoteItemRow
                    key={field.id}
                    form={form}
                    index={index}
                    count={fields.length}
                    fieldId={mounted ? field.id : `ssr-${index}`}
                    fromCatalog={Boolean(field.service_id)}
                    catalogPriceCents={field.service_id ? catalogPrice.get(field.service_id) : undefined}
                    onMove={moveItem}
                    onRemove={removeItem}
                  />
                ))}
              </ol>

              <div className="flex flex-wrap items-center gap-2">
                {catalogButton({
                  ...catalogA11y,
                  variant: "outline",
                  className: "h-9",
                  disabled: full,
                  children: (
                    <>
                      <PackageIcon data-icon="inline-start" />
                      Adicionar do catálogo
                    </>
                  ),
                })}
                {blankButton({ variant: "ghost", className: "h-9" })}
                <p className="ml-auto text-sm text-muted-foreground tabular-nums">
                  {full ? `Limite de ${QUOTE_LIMITS.items} itens` : plural(fields.length)}
                </p>
              </div>
              {listErrorMessageEl}
            </div>
          )
        }
      </ServicePicker>
    </>
  )
}
