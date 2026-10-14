"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CircleCheckIcon, ShieldCheckIcon } from "lucide-react"
import { toast } from "sonner"

import { approveQuoteAction } from "@/actions/public-quotes"
import { FormAlert } from "@/components/auth/form-alert"
import { OFFLINE_MESSAGE, ResponseSummary } from "@/components/public-quote/response-summary"
import { TextField } from "@/components/shared/form-fields"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { approveQuoteSchema, emptyApproveForm } from "@/lib/validations/quote-response"

/** Prévia da "assinatura": o nome digitado sobre a linha (decorativa; o campo já diz o nome). */
function SignaturePreview({ control }) {
  const name = useWatch({ control, name: "signer_name" })?.trim()
  return (
    <div aria-hidden="true" className="rounded-lg border border-dashed bg-muted/30 px-4 pt-4 pb-3">
      <p
        className={cn(
          "min-h-10 truncate font-display text-[1.75rem] leading-10 italic transition-colors",
          !name && "text-muted-foreground/45",
        )}
      >
        {name || "Seu nome"}
      </p>
      <span className="block h-px bg-foreground/25" />
      <p className="mt-1.5 text-[0.6875rem] font-medium tracking-[0.14em] text-muted-foreground uppercase">
        Assinatura eletrônica
      </p>
    </div>
  )
}

/** Caixa "Li e aceito" (Radix Checkbox ligado ao RHF por Controller). */
function AcceptTermsField({ control, hasTerms }) {
  return (
    <Controller
      control={control}
      name="accept_terms"
      render={({ field, fieldState }) => (
        <Field orientation="horizontal" data-invalid={!!fieldState.error}>
          <Checkbox
            id="accept_terms"
            ref={field.ref}
            name={field.name}
            checked={field.value}
            onCheckedChange={(checked) => field.onChange(checked === true)}
            onBlur={field.onBlur}
            aria-invalid={!!fieldState.error}
            aria-describedby={fieldState.error ? "accept_terms-error" : undefined}
            className="mt-0.5"
          />
          <FieldContent>
            <FieldLabel htmlFor="accept_terms" className="leading-snug font-normal">
              Li a proposta e aceito os itens, os valores e {hasTerms ? "os termos e condições" : "as condições"}{" "}
              descritos nela.
            </FieldLabel>
            <FieldError id="accept_terms-error" errors={[fieldState.error]} />
          </FieldContent>
        </Field>
      )}
    />
  )
}

/**
 * Formulário do aceite. Fica dentro do DialogContent, então começa limpo a
 * cada abertura.
 */
function ApproveForm({ publicId, quote, clientEmail, onCancel, onBusyChange, onStale }) {
  const router = useRouter()
  const [navigating, startNavigation] = useTransition()
  const [formError, setFormError] = useState(null)
  const form = useForm({
    resolver: zodResolver(approveQuoteSchema),
    mode: "onTouched",
    defaultValues: emptyApproveForm({ email: clientEmail }),
  })
  const { handleSubmit, setError, formState } = form
  const busy = formState.isSubmitting || navigating

  async function onSubmit() {
    setFormError(null)
    onBusyChange(true)
    let result
    try {
      // A action revalida com o mesmo schema; mandamos os valores crus do formulário.
      result = await approveQuoteAction(publicId, form.getValues())
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
    // O botão continua "Aprovando…" até a página de confirmação abrir.
    startNavigation(() => router.push(`/quote/${publicId}/approved`))
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="grid gap-5">
      <ResponseSummary quote={quote} />
      <FormAlert>{formError}</FormAlert>

      <div className="grid gap-4">
        <TextField
          form={form}
          name="signer_name"
          label="Nome completo"
          required
          autoComplete="name"
          placeholder="Como no seu documento"
          hint="Vale como a sua assinatura neste aceite."
        />
        <SignaturePreview control={form.control} />
        <TextField
          form={form}
          name="signer_email"
          label="E-mail"
          required
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="nome@empresa.com"
        />
        <AcceptTermsField control={form.control} hasTerms={quote.has_terms} />
      </div>

      <p className="flex items-start gap-2 text-xs text-pretty text-muted-foreground">
        <ShieldCheckIcon aria-hidden="true" className="mt-px size-3.5 shrink-0" />
        Ao aprovar, registramos seu nome, e-mail, a data e a hora, o endereço IP e o navegador como comprovante deste
        aceite eletrônico.
      </p>

      <DialogFooter className="-mx-6 -mb-6 px-6">
        <Button type="button" variant="outline" className="h-10" onClick={onCancel} disabled={busy}>
          Voltar
        </Button>
        <Button type="submit" className="h-10 px-4 shadow-sm" disabled={busy} aria-busy={busy || undefined}>
          {busy ? <Spinner aria-hidden="true" /> : <CircleCheckIcon aria-hidden="true" />}
          {busy ? "Aprovando…" : "Aprovar proposta"}
        </Button>
      </DialogFooter>
    </form>
  )
}

/**
 * "Aprovar proposta" (Sprint 15): o botão (`children`, vira o DialogTrigger) e
 * o diálogo do aceite eletrônico. Sucesso → página de confirmação; proposta já
 * respondida/vencida enquanto a página estava aberta → aviso e a página se
 * atualiza.
 * @param {{ publicId: string, quote: { quote_number: string, title: string, total_cents: number,
 *   has_terms: boolean }, clientEmail?: string|null, children: React.ReactNode }} props
 */
export function ApproveQuoteDialog({ publicId, quote, clientEmail, children }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[calc(100svh-2rem)] gap-6 overflow-y-auto p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal">Aprovar proposta</DialogTitle>
          <DialogDescription>
            Confirme seus dados para registrar o aceite. Depois de aprovada, a proposta não pode ser alterada.
          </DialogDescription>
        </DialogHeader>
        <ApproveForm
          publicId={publicId}
          quote={quote}
          clientEmail={clientEmail}
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
