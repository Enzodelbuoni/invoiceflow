"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  BanIcon,
  CopyIcon,
  DownloadIcon,
  EllipsisIcon,
  ExternalLinkIcon,
  LinkIcon,
  PencilLineIcon,
  PrinterIcon,
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
 * Ações da página do orçamento, conforme o status (máquina de estados do
 * Sprint 12): rascunho → editar, enviar, excluir; enviado/visualizado →
 * compartilhar (Sprint 17: link, WhatsApp, e-mail; abre sozinho depois do
 * envio), copiar link e cancelar; fora do rascunho → abrir a página do cliente;
 * qualquer status → duplicar como novo rascunho (Sprint 13) e imprimir; com
 * documento público (nem rascunho nem cancelada) → baixar o PDF (Sprint 16).
 * Cada mudança de status passa por uma confirmação e por uma função do banco
 * que confere o status de novo. Os diálogos são os mesmos da lista
 * (QuoteActionDialogs).
 * @param {{ quote: { id: string, public_id: string, quote_number: string, status: string, title: string,
 *     total_cents: number, valid_until: string },
 *   client: { name: string, phone?: string|null, email?: string|null } | null,
 *   today: string, pdfAvailable?: boolean }} props
 *   `client`: nome e contatos (o compartilhar manda para o telefone/e-mail dele);
 *   `pdfAvailable`: o servidor gera PDF (senão, só a impressão do navegador).
 */
export function QuoteActions({ quote, client, today, pdfAvailable = false }) {
  const router = useRouter()
  const [dialog, setDialog] = useState(null) // "send" | "share" | "share-sent" | "cancel" | "delete" | null
  const { duplicate, pending: duplicating } = useDuplicateQuote()
  const isDraft = quote.status === "draft"
  const isOpen = quote.status === "sent" || quote.status === "viewed"
  // O PDF sai da página pública: rascunho e cancelada não têm uma.
  const canDownloadPdf = pdfAvailable && !isDraft && quote.status !== "cancelled"

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
        <Button id="quote-share-trigger" className="h-10 shadow-sm" onClick={() => setDialog("share")}>
          <Share2Icon data-icon="inline-start" />
          Compartilhar
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
          {isOpen && (
            <DropdownMenuItem onSelect={() => copyQuoteLink(quote)}>
              <LinkIcon />
              Copiar link
            </DropdownMenuItem>
          )}
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
          {canDownloadPdf && (
            <DropdownMenuItem onSelect={() => downloadQuotePdf(quote)}>
              <DownloadIcon />
              Baixar PDF
            </DropdownMenuItem>
          )}
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

      <QuoteActionDialogs
        quote={quote}
        client={client}
        today={today}
        dialog={dialog}
        onDialogChange={setDialog}
        onDeleted={() => router.push("/quotes")}
        // O "Compartilhar" também abre sem gatilho (depois do envio): o foco volta ao botão dele.
        returnFocus={{ share: "quote-share-trigger" }}
      />
    </>
  )
}
