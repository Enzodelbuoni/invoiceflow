"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  BanIcon,
  CopyIcon,
  EllipsisIcon,
  ExternalLinkIcon,
  LinkIcon,
  PencilLineIcon,
  PrinterIcon,
  SendIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react"
import { toast } from "sonner"

import { cancelQuoteAction, deleteQuoteAction, sendQuoteAction } from "@/actions/quotes"
import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog"
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useDuplicateQuote } from "@/hooks/use-duplicate-quote"
import { formatIsoDateShort } from "@/lib/dates"
import { formatCurrency } from "@/lib/money"

/** Endereço da página pública da proposta (o cliente abre sem login). */
function publicQuoteUrl(publicId) {
  return `${window.location.origin}/quote/${publicId}`
}

/** Copia o link da proposta, com aviso (e o link no aviso, se a cópia falhar). */
async function copyQuoteLink(quote) {
  const url = publicQuoteUrl(quote.public_id)
  try {
    await navigator.clipboard.writeText(url)
    toast.success("Link copiado", { description: "Cole na conversa com o cliente. Ele abre sem precisar de conta." })
  } catch {
    toast.info("Copie o link da proposta", { description: url, duration: 15000 })
  }
}

/** Resumo do que vai ser enviado, dentro da confirmação. */
function SendSummary({ quote, clientName, validityPassed }) {
  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-lg border bg-muted/40 p-3.5 text-sm">
        <dt className="text-muted-foreground">Cliente</dt>
        <dd className="truncate font-medium">{clientName ?? "—"}</dd>
        <dt className="text-muted-foreground">Total</dt>
        <dd className="font-medium tabular-nums">{formatCurrency(quote.total_cents)}</dd>
        <dt className="text-muted-foreground">Válida até</dt>
        <dd className={validityPassed ? "font-medium text-destructive" : undefined}>
          {formatIsoDateShort(quote.valid_until)}
        </dd>
      </dl>
      {validityPassed && (
        <p className="flex items-start gap-2 text-sm text-destructive">
          <TriangleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            A validade já passou.{" "}
            <Link href={`/quotes/${quote.id}/edit`} className="font-medium underline underline-offset-2">
              Edite a data
            </Link>{" "}
            antes de enviar.
          </span>
        </p>
      )}
    </div>
  )
}

/**
 * Ações da página do orçamento, conforme o status (máquina de estados do
 * Sprint 12): rascunho → editar, enviar, excluir; enviado/visualizado →
 * copiar link e cancelar; fora do rascunho → abrir a página do cliente;
 * qualquer status → duplicar como novo rascunho (Sprint 13). Cada mudança de status passa por uma confirmação e por
 * uma função do banco que confere o status de novo.
 * @param {{ quote: { id: string, public_id: string, quote_number: string, status: string, total_cents: number, valid_until: string },
 *   clientName: string|null, today: string }} props
 */
export function QuoteActions({ quote, clientName, today }) {
  const router = useRouter()
  const [dialog, setDialog] = useState(null) // "send" | "cancel" | "delete" | null
  const { duplicate, pending: duplicating } = useDuplicateQuote()
  const isDraft = quote.status === "draft"
  const isOpen = quote.status === "sent" || quote.status === "viewed"
  const validityPassed = quote.valid_until < today
  const close = (open) => !open && setDialog(null)

  return (
    <>
      {isDraft && (
        <>
          <Button asChild variant="outline" className="h-10">
            <Link href={`/quotes/${quote.id}/edit`}>
              <PencilLineIcon data-icon="inline-start" />
              Editar
            </Link>
          </Button>
          <Button className="h-10 shadow-sm" onClick={() => setDialog("send")}>
            <SendIcon data-icon="inline-start" />
            Enviar ao cliente
          </Button>
        </>
      )}
      {isOpen && (
        <Button variant="outline" className="h-10" onClick={() => copyQuoteLink(quote)}>
          <LinkIcon data-icon="inline-start" />
          Copiar link
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="size-10">
            <EllipsisIcon />
            <span className="sr-only">Mais ações do orçamento {quote.quote_number}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          {!isDraft && (
            <DropdownMenuItem asChild>
              <a href={`/quote/${quote.public_id}`} target="_blank" rel="noopener noreferrer">
                <ExternalLinkIcon />
                Abrir página do cliente
              </a>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem disabled={duplicating} onSelect={() => duplicate(quote)}>
            <CopyIcon />
            Duplicar como novo rascunho
          </DropdownMenuItem>
          {/* Depois de o menu fechar, para ele não aparecer atrás da janela de impressão. */}
          <DropdownMenuItem onSelect={() => requestAnimationFrame(() => window.print())}>
            <PrinterIcon />
            Imprimir ou salvar PDF
          </DropdownMenuItem>
          {(isDraft || isOpen) && <DropdownMenuSeparator />}
          {isDraft && (
            <DropdownMenuItem variant="destructive" onSelect={() => setDialog("delete")}>
              <Trash2Icon />
              Excluir rascunho
            </DropdownMenuItem>
          )}
          {isOpen && (
            <DropdownMenuItem variant="destructive" onSelect={() => setDialog("cancel")}>
              <BanIcon />
              Cancelar proposta
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmActionDialog
        open={dialog === "send"}
        onOpenChange={close}
        title={`Enviar o orçamento ${quote.quote_number}?`}
        description="Depois de enviado, o documento fica travado: itens, preços, cliente e condições não mudam mais. Para corrigir algo depois, cancele e duplique como novo rascunho."
        confirmLabel="Enviar orçamento"
        pendingLabel="Enviando…"
        icon={<SendIcon data-icon="inline-start" />}
        action={() => sendQuoteAction(quote.id)}
        onDone={() =>
          toast.success("Orçamento enviado", {
            description: "Agora copie o link e mande para o cliente.",
            action: { label: "Copiar link", onClick: () => copyQuoteLink(quote) },
          })
        }
      >
        <SendSummary quote={quote} clientName={clientName} validityPassed={validityPassed} />
      </ConfirmActionDialog>

      <ConfirmActionDialog
        open={dialog === "cancel"}
        onOpenChange={close}
        title={`Cancelar a proposta ${quote.quote_number}?`}
        description="O cliente não poderá mais aprovar. O orçamento continua no seu histórico, marcado como cancelado."
        confirmLabel="Cancelar proposta"
        cancelLabel="Voltar"
        pendingLabel="Cancelando…"
        icon={<BanIcon data-icon="inline-start" />}
        variant="destructive"
        action={() => cancelQuoteAction(quote.id)}
        onDone={() => toast.success("Proposta cancelada", { description: `Orçamento ${quote.quote_number}` })}
      />

      <ConfirmDeleteDialog
        open={dialog === "delete"}
        onOpenChange={close}
        title={`Excluir o rascunho ${quote.quote_number}?`}
        description="O rascunho e o histórico dele são apagados. Isso não pode ser desfeito."
        confirmLabel="Excluir rascunho"
        action={() => deleteQuoteAction(quote.id)}
        onDeleted={() => {
          toast.success("Rascunho excluído", { description: `Orçamento ${quote.quote_number}` })
          router.push("/quotes")
        }}
      />
    </>
  )
}
