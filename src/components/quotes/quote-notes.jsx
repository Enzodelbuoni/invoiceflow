"use client"

import { TextareaField } from "@/components/shared/form-fields"
import { QUOTE_LIMITS } from "@/lib/validations/quote"

/** Observações e termos (QuoteNotes do plano). Os dois aparecem para o cliente. */
export function QuoteNotes({ form }) {
  return (
    <div className="grid gap-5">
      <TextareaField
        form={form}
        name="notes"
        label="Observações"
        rows={3}
        maxLength={QUOTE_LIMITS.notes}
        hint="Recado para o cliente no fim da proposta."
        placeholder="Ex.: Qualquer dúvida, é só me chamar no WhatsApp."
      />
      <TextareaField
        form={form}
        name="terms"
        label="Termos e condições"
        rows={4}
        maxLength={QUOTE_LIMITS.terms}
        hint="Forma de pagamento, prazos e o que não está incluído."
        placeholder="Ex.: 50% na aprovação e 50% na entrega. Prazo de 20 dias úteis após o envio do conteúdo."
      />
    </div>
  )
}
