"use client"

import { useRef, useState } from "react"
import { PackagePlusIcon } from "lucide-react"

import { ServiceDialog } from "@/components/services/service-dialog"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatServiceUnit } from "@/lib/constants/service-units"
import { formatCurrency } from "@/lib/money"
import { matchesSearch } from "@/lib/search"

// Filtro do cmdk: ignora acentos e aceita as palavras em qualquer ordem.
// O `value` de cada item é o id; nome e descrição vão em `keywords`.
function filterServices(value, search, keywords = []) {
  return matchesSearch(keywords.join(" "), search) ? 1 : 0
}

/**
 * Catálogo de serviços do orçamento: lista com busca (Popover + Command) e
 * cadastro rápido no ServiceDialog. Cada escolha vira um item (snapshot).
 *
 * O botão que abre a lista é desenhado por quem usa (`children` recebe uma
 * função que monta o botão), porque ele muda de lugar: no estado vazio e, depois
 * do 1º item, na barra embaixo da lista. O Popover e o diálogo ficam aqui, então
 * continuam abertos/animando quando o botão troca de lugar.
 *
 * Foco: depois de adicionar, `onAdded` é chamado quando a lista ou o diálogo
 * terminam de fechar (o diálogo prende o foco até lá); quem usa leva o foco ao
 * item novo. Sem adicionar, o foco volta ao botão (a não ser que a lista tenha
 * fechado por um clique em outro lugar).
 *
 * @param {{
 *   services: Array<{ id: string, name: string, description: string|null, unit: string, price_cents: number }>,
 *   getUsedServiceIds: () => Set<string>,   serviços que já estão no orçamento (lido ao abrir)
 *   onPick: (service: object) => void,
 *   onServiceCreated: (service: object) => void,
 *   onAdded: () => void,
 *   children: (renderTrigger: (props: object) => React.ReactNode) => React.ReactNode,
 * }} props
 */
export function ServicePicker({ services, getUsedServiceIds, onPick, onServiceCreated, onAdded, children }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [used, setUsed] = useState(() => new Set())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogName, setDialogName] = useState("")
  const triggerRef = useRef(null)
  // A lista fecha para o diálogo abrir: aí ela não devolve o foco ao botão,
  // senão tiraria o foco que o diálogo acabou de pôr no campo Nome.
  const openingDialog = useRef(false)
  // Um item acabou de entrar: ao fechar, o foco vai para ele (onAdded).
  const added = useRef(false)
  // A lista fechou por um clique fora (ex.: em outro campo): o foco fica onde a
  // pessoa clicou, como o Radix faria sem o preventDefault.
  const interactedOutside = useRef(false)

  function handlePopoverCloseAutoFocus(event) {
    event.preventDefault()
    const outside = interactedOutside.current
    interactedOutside.current = false
    if (openingDialog.current) {
      openingDialog.current = false
    } else if (added.current) {
      added.current = false
      onAdded()
    } else if (!outside) {
      triggerRef.current?.focus()
    }
  }

  // O diálogo devolveria o foco ao campo de busca da lista, que já fechou.
  function handleDialogCloseAutoFocus(event) {
    event.preventDefault()
    if (added.current) {
      added.current = false
      onAdded()
    } else {
      triggerRef.current?.focus()
    }
  }

  function handleOpenChange(next) {
    if (next) {
      setSearch("")
      setUsed(getUsedServiceIds())
    }
    setOpen(next)
  }

  function pick(service) {
    added.current = true
    setOpen(false)
    onPick(service)
  }

  function openDialog(name = "") {
    openingDialog.current = open
    setDialogName(name)
    setOpen(false)
    setDialogOpen(true)
  }

  // Sem serviços no catálogo, o botão já abre o cadastro (uma lista vazia não ajudaria).
  const renderTrigger = ({ children: label, ...props }) =>
    services.length === 0 ? (
      <Button ref={triggerRef} type="button" {...props} onClick={() => openDialog()}>
        <PackagePlusIcon data-icon="inline-start" />
        Cadastrar serviço
      </Button>
    ) : (
      <PopoverTrigger asChild>
        <Button ref={triggerRef} type="button" {...props}>
          {label}
        </Button>
      </PopoverTrigger>
    )

  const typed = search.trim()

  return (
    <>
      <Popover open={open} onOpenChange={handleOpenChange}>
        {children(renderTrigger)}
        <PopoverContent
          align="start"
          className="w-[min(28rem,calc(100vw-2rem))] p-0"
          onCloseAutoFocus={handlePopoverCloseAutoFocus}
          onInteractOutside={() => {
            interactedOutside.current = true
          }}
        >
          <Command filter={filterServices}>
            <CommandInput placeholder="Buscar serviço por nome ou descrição" value={search} onValueChange={setSearch} />
            <CommandList>
              <CommandEmpty>Nenhum serviço encontrado.</CommandEmpty>
              <CommandGroup heading={`Catálogo (${services.length})`}>
                {services.map((service) => {
                  const inQuote = used.has(service.id)
                  return (
                    <CommandItem
                      key={service.id}
                      value={service.id}
                      keywords={[service.name, service.description ?? ""]}
                      data-checked={inQuote}
                      onSelect={() => pick(service)}
                      className="items-start gap-3 py-2"
                    >
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate">{service.name}</span>
                        {service.description && (
                          <span className="truncate text-xs text-muted-foreground">{service.description}</span>
                        )}
                        {inQuote && <span className="sr-only"> (já está no orçamento)</span>}
                      </span>
                      <span className="flex shrink-0 flex-col items-end">
                        <span className="tabular-nums">{formatCurrency(service.price_cents)}</span>
                        <span className="text-xs text-muted-foreground">por {formatServiceUnit(service.unit, 1)}</span>
                      </span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
              <CommandSeparator alwaysRender />
              <CommandGroup forceMount>
                <CommandItem value="__novo-servico__" forceMount onSelect={() => openDialog(typed)} className="gap-2.5">
                  <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary-ink dark:bg-primary/15">
                    <PackagePlusIcon className="size-4" />
                  </span>
                  {typed ? (
                    <span className="truncate">
                      Cadastrar <span className="font-medium">“{typed}”</span>
                    </span>
                  ) : (
                    "Cadastrar novo serviço"
                  )}
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <ServiceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultName={dialogName}
        onCloseAutoFocus={handleDialogCloseAutoFocus}
        onCreated={(service) => {
          onServiceCreated(service)
          pick(service)
        }}
      />
    </>
  )
}
