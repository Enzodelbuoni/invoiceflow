"use client"

import { useState } from "react"
import Link from "next/link"
import {
  BanIcon,
  CopyIcon,
  DownloadIcon,
  EllipsisIcon,
  ExternalLinkIcon,
  FileTextIcon,
  LinkIcon,
  PencilLineIcon,
  SendIcon,
  Share2Icon,
  Trash2Icon,
} from "lucide-react"

import { QuoteActionDialogs, copyQuoteLink, downloadQuotePdf } from "@/components/quotes/quote-action-dialogs"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useDuplicateQuote } from "@/hooks/use-duplicate-quote"

/**
 * Menu "⋯" de cada orçamento na lista (Sprint 19), com as ações que o status
 * permite — as mesmas da página do orçamento, com os mesmos diálogos:
 * rascunho → editar, enviar (e compartilhar em seguida), excluir;
 * enviado/visualizado → compartilhar, copiar link, cancelar; fora do rascunho
 * → abrir a página do cliente; com documento público → baixar o PDF;
 * qualquer status → ver e duplicar. Depois de enviar/cancelar/excluir, a
 * lista se atualiza sozinha (a Server Action revalida /quotes).
 * @param {{ quote: { id: string, public_id: string, quote_number: string, status: string, title: string,
 *     total_cents: number, valid_until: string },
 *   client: { name: string, phone?: string|null, email?: string|null },
 *   today: string, pdfAvailable?: boolean, triggerId: string }} props
 *   `triggerId`: id do botão "⋯" (o foco volta a ele quando um diálogo fecha);
 *   único na página, porque tabela e cartões existem ao mesmo tempo.
 */
export function QuoteRowActions({ quote, client, today, pdfAvailable = false, triggerId }) {
  const [dialog, setDialog] = useState(null)
  const { duplicate, pending: duplicating } = useDuplicateQuote()
  const isDraft = quote.status === "draft"
  const isOpen = quote.status === "sent" || quote.status === "viewed"
  const canDownloadPdf = pdfAvailable && !isDraft && quote.status !== "cancelled"

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button id={triggerId} variant="ghost" size="icon-sm" className="text-muted-foreground">
            <EllipsisIcon />
            <span className="sr-only">
              Ações do orçamento {quote.quote_number} ({quote.title})
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-60">
          <DropdownMenuItem asChild>
            <Link href={`/quotes/${quote.id}`}>
              <FileTextIcon />
              Ver orçamento
            </Link>
          </DropdownMenuItem>
          {isDraft && (
            <>
              <DropdownMenuItem asChild>
                <Link href={`/quotes/${quote.id}/edit`}>
                  <PencilLineIcon />
                  Editar
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setDialog("send")}>
                <SendIcon />
                Enviar ao cliente
              </DropdownMenuItem>
            </>
          )}
          {isOpen && (
            <>
              <DropdownMenuItem onSelect={() => setDialog("share")}>
                <Share2Icon />
                Compartilhar
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => copyQuoteLink(quote)}>
                <LinkIcon />
                Copiar link
              </DropdownMenuItem>
            </>
          )}
          {!isDraft && (
            <DropdownMenuItem asChild>
              <a href={`/quote/${quote.public_id}`} target="_blank" rel="noopener noreferrer">
                <ExternalLinkIcon />
                Abrir página do cliente
              </a>
            </DropdownMenuItem>
          )}
          {canDownloadPdf && (
            <DropdownMenuItem onSelect={() => downloadQuotePdf(quote)}>
              <DownloadIcon />
              Baixar PDF
            </DropdownMenuItem>
          )}
          <DropdownMenuItem disabled={duplicating} onSelect={() => duplicate(quote)}>
            <CopyIcon />
            Duplicar como novo rascunho
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

      <QuoteActionDialogs
        quote={quote}
        client={client}
        today={today}
        dialog={dialog}
        onDialogChange={setDialog}
        // Excluído, a linha (e o "⋯") some: o foco vai para o resumo da lista.
        returnFocus={{ default: triggerId, fallback: "quotes-summary" }}
      />
    </>
  )
}
