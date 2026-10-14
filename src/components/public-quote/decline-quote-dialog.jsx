"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CircleXIcon } from "lucide-react"
import { toast } from "sonner"

import { declineQuoteAction } from "@/actions/public-quotes"
import { FormAlert } from "@/components/auth/form-alert"
import { OFFLINE_MESSAGE, ResponseSummary } from "@/components/public-quote/response-summary"
import { TextareaField } from "@/components/shared/form-fields"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { EMPTY_DECLINE_FORM, QUOTE_RESPONSE_LIMITS, declineQuoteSchema } from "@/lib/validations/quote-response"

/** Formulário da recusa. Dentro do DialogContent: começa limpo a cada abertura. */
function DeclineForm({ publicId, quote, issuerName, onCancel, onBusyChange, onStale }) {
  const router = useRouter()
  const [navigating, startNavigation] = useTransition()
  const [formError, setFormError] = useState(null)
  const form = useForm({
    resolver: zodResolver(declineQuoteSchema),
    mode: "onTouched",
    defaultValues: EMPTY_DECLINE_FORM,
  })
  const { handleSubmit, setError, formState } = form
  const busy = formState.isSubmitting || navigating

  async function onSubmit() {
    setFormError(null)
    onBusyChange(true)
    let result
    try {
      result = await declineQuoteAction(publicId, form.getValues())
    } catch {
      result = { ok: false, message: OFFLINE_MESSAGE }
    }
    if (!result.ok) {
      onBusyChange(false)
      if (result.stale) {
        onStale(result.message)
        return
      }
      setFormError(result.message)
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        setError(field, { type: "server", message }, { shouldFocus: true })
      }
      return
    }
    startNavigation(() => router.push(`/quote/${publicId}/declined`))
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="grid gap-5">
      <ResponseSummary quote={quote} />
      <FormAlert>{formError}</FormAlert>
      <TextareaField
        form={form}
        name="reason"
        label="Motivo (opcional)"
        hint={`Ajuda ${issuerName} a entender a sua decisão.`}
        maxLength={QUOTE_RESPONSE_LIMITS.reason}
        rows={4}
        placeholder="Ex.: o prazo não atende, o valor ficou acima do previsto…"
      />
      <DialogFooter className="-mx-6 -mb-6 px-6">
        <Button type="button" variant="outline" className="h-10" onClick={onCancel} disabled={busy}>
          Voltar
        </Button>
        <Button type="submit" variant="destructive" className="h-10 px-4" disabled={busy} aria-busy={busy || undefined}>
          {busy ? <Spinner aria-hidden="true" /> : <CircleXIcon aria-hidden="true" />}
          {busy ? "Recusando…" : "Recusar proposta"}
        </Button>
      </DialogFooter>
    </form>
  )
}

/**
 * "Recusar" (Sprint 15): o botão (`children`, vira o DialogTrigger) e o
 * diálogo da recusa, com o motivo opcional. Mesmo comportamento da aprovação.
 * @param {{ publicId: string, quote: { quote_number: string, title: string, total_cents: number },
 *   issuerName: string, children: React.ReactNode }} props
 */
export function DeclineQuoteDialog({ publicId, quote, issuerName, children }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[calc(100svh-2rem)] gap-6 overflow-y-auto p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal">Recusar proposta</DialogTitle>
          <DialogDescription>
            A recusa é definitiva para esta proposta. Se quiser negociar, você também pode falar com {issuerName}{" "}
            antes de responder.
          </DialogDescription>
        </DialogHeader>
        <DeclineForm
          publicId={publicId}
          quote={quote}
          issuerName={issuerName}
          onCancel={() => setOpen(false)}
          onBusyChange={setBusy}
          onStale={(message) => {
            setOpen(false)
            toast.error(message)
            router.refresh()
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
