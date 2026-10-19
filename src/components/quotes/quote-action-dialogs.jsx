"use client"

import Link from "next/link"
import { BanIcon, SendIcon, TriangleAlertIcon } from "lucide-react"
import { toast } from "sonner"

import { cancelQuoteAction, deleteQuoteAction, sendQuoteAction } from "@/actions/quotes"
import { ShareQuoteDialog } from "@/components/quotes/share-quote-dialog"
import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog"
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog"
import { formatIsoDateShort } from "@/lib/dates"
import { formatCurrency } from "@/lib/money"
import { pdfFileName, quotePdfUrl } from "@/lib/pdf/document"
import { downloadPdf } from "@/lib/pdf-download"
import { publicQuoteUrl } from "@/lib/share"

// Ações de um orçamento que a página dele (QuoteActions) e cada linha da lista
// (QuoteRowActions) compartilham: copiar o link, baixar o PDF e os diálogos de
// enviar, compartilhar, cancelar e excluir.

/** Copia o link da proposta, com aviso (e o link no aviso, se a cópia falhar). */
export async function copyQuoteLink(quote) {
  const url = publicQuoteUrl(quote.public_id, window.location.origin)
  try {
    await navigator.clipboard.writeText(url)
    toast.success("Link copiado", { description: "Cole na conversa com o cliente. Ele abre sem precisar de conta." })
  } catch {
    toast.info("Copie o link da proposta", { description: url, duration: 15000 })
  }
}

/** Baixa o PDF gerado no servidor, com o andamento num aviso ("Gerando PDF…"). */
export function downloadQuotePdf(quote) {
  toast.promise(downloadPdf(quotePdfUrl(quote.public_id), pdfFileName(quote.quote_number)), {
    loading: "Gerando PDF…",
    success: `PDF da proposta ${quote.quote_number} pronto`,
    error: (error) => ({ message: "Não foi possível baixar o PDF", description: error.message }),
  })
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
 * Os diálogos das ações de um orçamento, controlados por quem os usa.
 * `dialog`: o que está aberto ("send" | "share" | "share-sent" | "cancel" |
 * "delete" | null). Enviar abre em seguida o "Compartilhar" ("share-sent"):
 * enviar só trava o documento, o passo seguinte é mandar o link.
 * `returnFocus`: id do elemento que recebe o foco quando cada diálogo fecha,
 * por diálogo ({ share: "…" }) ou para todos ({ default: "…" }), e um
 * `fallback` para quando ele não está mais na tela (ex.: a linha da lista
 * sumiu depois de excluir). Sem nenhum dos dois, vale o padrão do Radix.
 * @param {{ quote: { id: string, public_id: string, quote_number: string, title: string,
 *     total_cents: number, valid_until: string },
 *   client: { name: string, phone?: string|null, email?: string|null } | null,
 *   today: string, dialog: string | null, onDialogChange: (dialog: string | null) => void,
 *   onDeleted?: () => void, returnFocus?: Record<string, string> }} props
 */
export function QuoteActionDialogs({ quote, client, today, dialog, onDialogChange, onDeleted, returnFocus = {} }) {
  const validityPassed = quote.valid_until < today
  const close = (open) => !open && onDialogChange(null)
  const focusBack = (kind) => (event) => {
    const target = [returnFocus[kind] ?? returnFocus.default, returnFocus.fallback]
      .map((id) => id && document.getElementById(id))
      .find(Boolean)
    if (target) {
      event.preventDefault()
      target.focus()
    }
  }

  return (
    <>
      <ConfirmActionDialog
        open={dialog === "send"}
        onOpenChange={close}
        title={`Enviar o orçamento ${quote.quote_number}?`}
        description="Depois de enviado, o documento fica travado: itens, preços, cliente e condições não mudam mais. Para corrigir algo depois, cancele e duplique como novo rascunho."
        confirmLabel="Enviar orçamento"
        pendingLabel="Enviando…"
        icon={<SendIcon data-icon="inline-start" />}
        action={() => sendQuoteAction(quote.id)}
        onDone={() => {
          toast.success("Orçamento enviado", { description: `Orçamento ${quote.quote_number}` })
          onDialogChange("share-sent")
        }}
        onCloseAutoFocus={focusBack("send")}
      >
        <SendSummary quote={quote} clientName={client?.name ?? null} validityPassed={validityPassed} />
      </ConfirmActionDialog>

      <ShareQuoteDialog
        open={dialog === "share" || dialog === "share-sent"}
        onOpenChange={close}
        quote={quote}
        client={client}
        justSent={dialog === "share-sent"}
        onCloseAutoFocus={focusBack("share")}
      />

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
        onCloseAutoFocus={focusBack("cancel")}
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
          onDeleted?.()
        }}
        onCloseAutoFocus={focusBack("delete")}
      />
    </>
  )
}
