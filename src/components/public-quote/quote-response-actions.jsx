"use client"

import { CircleCheckIcon } from "lucide-react"

import { ApproveQuoteDialog } from "@/components/public-quote/approve-quote-dialog"
import { DeclineQuoteDialog } from "@/components/public-quote/decline-quote-dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Botões "Aprovar proposta" e "Recusar" da página pública (Sprint 15), cada um
 * com o seu diálogo. Aparecem no aviso do topo e no fim do documento.
 * `disabled`: o dono está vendo o próprio link (só o cliente responde).
 * @param {{ publicId: string, quote: { quote_number: string, title: string, total_cents: number,
 *   has_terms: boolean }, clientEmail?: string|null, issuerName: string, disabled?: boolean,
 *   className?: string }} props
 *   `quote`: só o resumo que os diálogos mostram (não a proposta inteira).
 */
export function QuoteResponseActions({ publicId, quote, clientEmail, issuerName, disabled = false, className }) {
  const approveButton = (
    <Button className="h-10 flex-1 px-4 shadow-sm sm:flex-none" disabled={disabled}>
      <CircleCheckIcon data-icon="inline-start" />
      Aprovar proposta
    </Button>
  )
  const declineButton = (
    <Button variant="outline" className="h-10 flex-1 px-4 sm:flex-none" disabled={disabled}>
      Recusar
    </Button>
  )

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {disabled ? (
        <>
          {approveButton}
          {declineButton}
        </>
      ) : (
        <>
          <ApproveQuoteDialog publicId={publicId} quote={quote} clientEmail={clientEmail}>
            {approveButton}
          </ApproveQuoteDialog>
          <DeclineQuoteDialog publicId={publicId} quote={quote} issuerName={issuerName}>
            {declineButton}
          </DeclineQuoteDialog>
        </>
      )}
    </div>
  )
}
