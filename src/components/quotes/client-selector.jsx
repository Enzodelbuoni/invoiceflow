"use client"

import { useEffect, useRef, useState } from "react"
import { useController } from "react-hook-form"
import { ArrowLeftRightIcon, UserRoundIcon, UserRoundPlusIcon, UsersRoundIcon, XIcon } from "lucide-react"

import { ClientAvatar } from "@/components/clients/client-avatar"
import { ClientDialog } from "@/components/clients/client-dialog"
import { QuoteSectionEmpty } from "@/components/quotes/quote-section"
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
import { FieldError } from "@/components/ui/field"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { matchesSearch } from "@/lib/search"

/** "Empresa · e-mail" (o que existir). */
function clientDetails(client) {
  return [client.company, client.email].filter(Boolean).join(" · ")
}

// Filtro do cmdk: ignora acentos e aceita as palavras em qualquer ordem.
// O `value` de cada item é o id; nome, empresa e e-mail vão em `keywords`.
function filterClients(value, search, keywords = []) {
  return matchesSearch(keywords.join(" "), search) ? 1 : 0
}

/**
 * Seletor de cliente do orçamento (ClientSelector do plano): busca entre os
 * clientes e cadastro rápido no ClientDialog. Grava o id em `client_id`.
 * @param {{ form: object, clients: Array<{ id: string, name: string, company: string|null, email: string|null }>,
 *   onClientCreated: (client: object) => void }} props
 */
export function ClientSelector({ form, clients, onClientCreated }) {
  const { field, fieldState } = useController({ control: form.control, name: "client_id" })
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogName, setDialogName] = useState("")
  // O botão que abre a lista muda (vazio → "Trocar") ao escolher um cliente;
  // os dois usam este ref para o foco voltar ao botão que estiver na tela.
  const triggerRef = useRef(null)
  // Ao remover o cliente, o botão focado (X) some da tela; depois que a troca
  // renderizar, o foco vai para o botão "Selecionar cliente".
  const refocusTrigger = useRef(false)
  useEffect(() => {
    if (!refocusTrigger.current) return
    refocusTrigger.current = false
    triggerRef.current?.focus()
  }, [field.value])

  const selected = clients.find((client) => client.id === field.value) ?? null
  const error = fieldState.error
  const describedBy = error ? "client_id-error" : undefined

  function focusTrigger(event) {
    event.preventDefault()
    triggerRef.current?.focus()
  }

  // A lista fecha para o diálogo abrir: aí ela não devolve o foco ao botão,
  // senão tiraria o foco que o diálogo acabou de pôr no campo Nome.
  const openingDialog = useRef(false)
  // A lista fechou por um clique fora (ex.: em outro campo): o foco fica onde a
  // pessoa clicou, como o Radix faria sem o preventDefault.
  const interactedOutside = useRef(false)
  function handlePopoverCloseAutoFocus(event) {
    event.preventDefault()
    const outside = interactedOutside.current
    interactedOutside.current = false
    if (openingDialog.current) {
      openingDialog.current = false
      return
    }
    if (!outside) triggerRef.current?.focus()
  }

  function handleOpenChange(next) {
    if (next) setSearch("")
    else field.onBlur()
    setOpen(next)
  }

  function choose(id) {
    field.onChange(id)
    field.onBlur()
    setOpen(false)
  }

  function openDialog(name = "") {
    openingDialog.current = open
    setDialogName(name)
    setOpen(false)
    setDialogOpen(true)
  }

  const trigger = (label, props) => (
    <PopoverTrigger asChild>
      <Button
        ref={triggerRef}
        type="button"
        aria-invalid={!!error}
        aria-describedby={describedBy}
        {...props}
      >
        {label}
      </Button>
    </PopoverTrigger>
  )

  let content
  if (selected) {
    content = (
      // Em telas estreitas as ações descem para uma segunda linha, em vez de cortar o nome.
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-3 rounded-xl border bg-background/60 p-4 dark:bg-background/30">
        <div className="flex min-w-0 flex-1 basis-56 items-center gap-3.5">
          <ClientAvatar name={selected.name} />
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="truncate font-medium">{selected.name}</p>
            <p className="truncate text-sm text-muted-foreground">{clientDetails(selected) || "Sem empresa nem e-mail"}</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1">
          {trigger(
            <>
              <ArrowLeftRightIcon data-icon="inline-start" />
              Trocar<span className="sr-only"> cliente</span>
            </>,
            { variant: "outline", size: "sm" },
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            onClick={() => {
              refocusTrigger.current = true
              field.onChange("")
              field.onBlur()
            }}
          >
            <XIcon />
            <span className="sr-only">Remover {selected.name} do orçamento</span>
          </Button>
        </div>
      </div>
    )
  } else if (clients.length === 0) {
    content = (
      <QuoteSectionEmpty
        icon={UsersRoundIcon}
        title="Você ainda não tem clientes"
        description="Cadastre o primeiro aqui mesmo. Ele fica salvo para os próximos orçamentos."
      >
        <Button ref={triggerRef} type="button" variant="outline" className="h-9" onClick={() => openDialog()}>
          <UserRoundPlusIcon data-icon="inline-start" />
          Cadastrar cliente
        </Button>
      </QuoteSectionEmpty>
    )
  } else {
    content = (
      <QuoteSectionEmpty
        icon={UserRoundIcon}
        title="Nenhum cliente selecionado"
        description="Escolha quem vai receber a proposta ou cadastre um cliente novo sem sair daqui."
      >
        {trigger("Selecionar cliente", { variant: "outline", className: "h-9" })}
      </QuoteSectionEmpty>
    )
  }

  const typed = search.trim()

  return (
    <>
      <Popover open={open} onOpenChange={handleOpenChange}>
        {content}
        <PopoverContent
          align="end"
          className="w-[min(24rem,calc(100vw-2rem))] p-0"
          onCloseAutoFocus={handlePopoverCloseAutoFocus}
          onInteractOutside={() => {
            interactedOutside.current = true
          }}
        >
          <Command filter={filterClients}>
            <CommandInput placeholder="Buscar por nome, empresa ou e-mail" value={search} onValueChange={setSearch} />
            <CommandList>
              <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
              <CommandGroup heading={`Clientes (${clients.length})`}>
                {clients.map((client) => (
                  <CommandItem
                    key={client.id}
                    value={client.id}
                    keywords={[client.name, client.company ?? "", client.email ?? ""]}
                    data-checked={client.id === field.value}
                    onSelect={() => choose(client.id)}
                    className="gap-2.5"
                  >
                    <ClientAvatar name={client.name} size="xs" />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">{client.name}</span>
                      {clientDetails(client) && (
                        <span className="truncate text-xs text-muted-foreground">{clientDetails(client)}</span>
                      )}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator alwaysRender />
              <CommandGroup forceMount>
                <CommandItem value="__novo-cliente__" forceMount onSelect={() => openDialog(typed)} className="gap-2.5">
                  <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary-ink dark:bg-primary/15">
                    <UserRoundPlusIcon className="size-4" />
                  </span>
                  {typed ? (
                    <span className="truncate">
                      Cadastrar <span className="font-medium">“{typed}”</span>
                    </span>
                  ) : (
                    "Cadastrar novo cliente"
                  )}
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <FieldError id="client_id-error" errors={[error]} className="mt-2" />

      <ClientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultName={dialogName}
        onCloseAutoFocus={focusTrigger}
        onCreated={(client) => {
          onClientCreated(client)
          field.onChange(client.id)
          field.onBlur()
        }}
      />
    </>
  )
}
