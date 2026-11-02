"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronsUpDownIcon, LayoutTemplateIcon, RotateCcwIcon } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import { formatCurrency } from "@/lib/money"
import { templateItemsLabel } from "@/lib/quote-template"
import { matchesSearch } from "@/lib/search"

/** Busca sem acentos no nome e no título sugerido (o padrão do cmdk não ignora acentos). */
function filterTemplates(value, search, keywords = []) {
  return matchesSearch(keywords.join(" "), search) ? 1 : 0
}

/** "3 itens · R$ 1.158,10" (sem itens, só "Sem itens"). */
function templateDetails(template) {
  const items = templateItemsLabel(template.itemCount)
  if (!template.itemCount || template.totalCents === null) return items
  return `${items} · ${formatCurrency(template.totalCents)}`
}

/**
 * Barra do "Novo orçamento" para começar a partir de um modelo (etapa 40):
 * escolher, trocar ou voltar ao orçamento em branco. Aplicar um modelo abre o
 * construtor de novo já preenchido com ele (`/quotes/new?modelo=…`, o cliente
 * escolhido vai junto). Se a pessoa já mexeu no formulário, confirma antes,
 * porque o que foi preenchido é substituído.
 * @param {{ templates: Array<{ id: string, name: string, title: string|null, itemCount: number,
 *     totalCents: number|null }>,
 *   current: { id: string, name: string } | null,
 *   hasChanges: () => boolean, hrefFor: (templateId: string|null) => string, onLeave: () => void }} props
 *   `hasChanges`: o formulário difere da versão de partida; `hrefFor`: endereço do construtor com
 *   o modelo (ou em branco); `onLeave`: chamado antes de sair (apaga a cópia local deste formulário).
 */
export function QuoteTemplateBar({ templates, current, hasChanges, hrefFor, onLeave }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  // Escolha à espera da confirmação: id do modelo, null (em branco) ou undefined (nenhuma).
  const [pending, setPending] = useState(undefined)
  const [navigating, startNavigation] = useTransition()
  const nameOf = (id) => templates.find((template) => template.id === id)?.name

  function go(templateId) {
    onLeave()
    if (templateId) {
      toast.success(`Usando o modelo “${nameOf(templateId)}”`, {
        description: "Escolha o cliente e ajuste o que precisar.",
      })
    }
    startNavigation(() => router.replace(hrefFor(templateId), { scroll: false }))
  }

  function choose(templateId) {
    setOpen(false)
    if (templateId === (current?.id ?? null)) return
    if (hasChanges()) setPending(templateId)
    else go(templateId)
  }

  const pendingName = pending ? nameOf(pending) : null

  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border bg-card p-3 pl-4 shadow-xs">
      <div className="flex min-w-0 flex-[1_1_16rem] items-center gap-3">
        <div
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-xl border bg-primary/8 text-primary-ink"
        >
          <LayoutTemplateIcon className="size-[1.125rem]" />
        </div>
        <div className="min-w-0" aria-live="polite">
          {current ? (
            <p className="truncate text-sm font-medium">
              Modelo: <span className="text-primary-ink">{current.name}</span>
            </p>
          ) : (
            <p className="text-sm font-medium">Comece a partir de um modelo</p>
          )}
          <p className="text-xs text-muted-foreground">
            {current
              ? "Itens, condições e termos vieram do modelo. Ajuste o que precisar."
              : "Itens, condições e termos já preenchidos. Você só escolhe o cliente."}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 max-sm:w-full">
        {current && (
          <Button
            type="button"
            variant="ghost"
            className="h-9 text-muted-foreground max-md:h-10 max-sm:flex-1"
            onClick={() => choose(null)}
            disabled={navigating}
          >
            <RotateCcwIcon data-icon="inline-start" />
            Começar em branco
          </Button>
        )}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id="quote-template-trigger"
              type="button"
              variant="outline"
              className="h-9 max-md:h-10 max-sm:flex-1"
              disabled={navigating}
              aria-busy={navigating || undefined}
            >
              {navigating ? <Spinner aria-hidden="true" /> : null}
              {navigating ? "Aplicando…" : current ? "Trocar modelo" : "Escolher modelo"}
              {!navigating && <ChevronsUpDownIcon data-icon="inline-end" className="opacity-60" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
            <Command filter={filterTemplates}>
              <CommandInput placeholder="Buscar modelo" />
              <CommandList>
                <CommandEmpty>Nenhum modelo encontrado.</CommandEmpty>
                <CommandGroup heading={`Modelos (${templates.length})`}>
                  {templates.map((template) => (
                    <CommandItem
                      key={template.id}
                      value={template.id}
                      keywords={[template.name, template.title ?? ""]}
                      data-checked={template.id === current?.id}
                      onSelect={() => choose(template.id)}
                      className="gap-2.5"
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-medium">{template.name}</span>
                        <span className="truncate text-xs text-muted-foreground">{templateDetails(template)}</span>
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <AlertDialog open={pending !== undefined} onOpenChange={(next) => !next && setPending(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending ? `Usar o modelo “${pendingName}”?` : "Começar em branco?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {pending
                ? "O que você já preencheu neste orçamento será substituído pelo conteúdo do modelo. O cliente escolhido continua."
                : "O que você já preencheu neste orçamento será apagado. O cliente escolhido continua."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction onClick={() => go(pending)}>
              {pending ? "Usar o modelo" : "Começar em branco"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
