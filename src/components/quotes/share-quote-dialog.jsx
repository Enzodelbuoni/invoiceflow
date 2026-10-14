"use client"

import { useId, useRef, useState } from "react"
import { CheckIcon, ChevronRightIcon, CopyIcon, MailIcon, MessageCircleIcon, Share2Icon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatPhone } from "@/lib/br"
import { mailtoUrl, publicQuoteUrl, shareMessage, whatsappUrl } from "@/lib/share"
import { cn } from "@/lib/utils"

const COPIED_MS = 2500

/** Copia um texto; devolve se deu certo (o navegador pode negar a área de transferência). */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** Um destino de compartilhamento (WhatsApp, e-mail…): ícone, título e para quem vai. */
function ShareTarget({ href, onClick, icon: Icon, title, detail, tone, external }) {
  const className =
    "group/target flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors outline-none hover:bg-accent focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
  const content = (
    <>
      <span aria-hidden="true" className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", tone)}>
        <Icon className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium">{title}</span>
        <span className="truncate text-xs text-muted-foreground">{detail}</span>
      </span>
      <ChevronRightIcon
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover/target:translate-x-0.5"
      />
    </>
  )
  if (href) {
    return (
      <a
        href={href}
        className={className}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {content}
      </a>
    )
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  )
}

/**
 * Conteúdo do diálogo. Fica dentro do DialogContent: a mensagem começa pronta
 * a cada abertura (e a pessoa pode editar antes de mandar).
 */
function ShareQuoteContent({ quote, client, justSent, onDone }) {
  const ids = useId()
  const linkRef = useRef(null)
  const url = publicQuoteUrl(quote.public_id, window.location.origin)
  const [message, setMessage] = useState(() =>
    shareMessage({
      clientName: client?.name,
      quoteNumber: quote.quote_number,
      title: quote.title,
      totalCents: quote.total_cents,
      validUntil: quote.valid_until,
      url,
    }),
  )
  const [copied, setCopied] = useState(null) // "link" | "message" | null
  const copiedTimer = useRef(null)
  // A Web Share API (folha de compartilhar do celular/sistema) nem sempre existe.
  const canShare = typeof navigator.share === "function"

  async function copy(kind, text) {
    if (await copyText(text)) {
      setCopied(kind)
      clearTimeout(copiedTimer.current)
      copiedTimer.current = setTimeout(() => setCopied(null), COPIED_MS)
      return
    }
    if (kind === "link") linkRef.current?.select()
    toast.info("Não deu para copiar automaticamente", { description: "Selecione o texto e use Ctrl+C." })
  }

  async function nativeShare() {
    try {
      await navigator.share({ title: `Proposta Nº ${quote.quote_number}`, text: message })
    } catch (error) {
      if (error?.name !== "AbortError") toast.error("Não foi possível abrir o compartilhamento do aparelho.")
    }
  }

  const subject = `Proposta Nº ${quote.quote_number} — ${quote.title}`

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display text-2xl font-normal">
          {justSent ? "Proposta enviada! Agora é só mandar o link." : "Compartilhar proposta"}
        </DialogTitle>
        <DialogDescription>
          {justSent
            ? `O orçamento ${quote.quote_number} está travado e pronto para o cliente. Ele abre a proposta sem precisar de conta.`
            : `O cliente abre a proposta Nº ${quote.quote_number} pelo link, sem precisar de conta.`}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-2">
        <Label htmlFor={`${ids}-link`}>Link da proposta</Label>
        <div className="flex gap-2">
          <Input
            ref={linkRef}
            id={`${ids}-link`}
            readOnly
            value={url}
            onFocus={(event) => event.target.select()}
            className="h-10 font-mono text-[0.8125rem]"
          />
          <Button
            type="button"
            variant={copied === "link" ? "secondary" : "default"}
            className="h-10 w-28 shrink-0"
            onClick={() => copy("link", url)}
          >
            {copied === "link" ? <CheckIcon data-icon="inline-start" /> : <CopyIcon data-icon="inline-start" />}
            {copied === "link" ? "Copiado" : "Copiar"}
          </Button>
        </div>
      </div>

      <div className="grid gap-2">
        <div className="flex items-end justify-between gap-3">
          <Label htmlFor={`${ids}-message`}>Mensagem</Label>
          <button
            type="button"
            onClick={() => copy("message", message)}
            className="flex items-center gap-1 text-xs font-medium text-primary-ink underline-offset-4 hover:underline"
          >
            {copied === "message" ? <CheckIcon aria-hidden="true" className="size-3.5" /> : null}
            {copied === "message" ? "Mensagem copiada" : "Copiar mensagem"}
          </button>
        </div>
        <Textarea
          id={`${ids}-message`}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={6}
          aria-describedby={`${ids}-message-hint`}
          className="max-h-56 text-sm"
        />
        <p id={`${ids}-message-hint`} className="text-xs text-muted-foreground">
          Você pode editar antes de mandar. O WhatsApp e o e-mail abrem com este texto.
        </p>
      </div>

      <div className="grid gap-2">
        <ShareTarget
          href={whatsappUrl(client?.phone, message)}
          external
          icon={MessageCircleIcon}
          title="Enviar pelo WhatsApp"
          detail={client?.phone ? `Para ${client.name} · ${formatPhone(client.phone)}` : "Você escolhe o contato"}
          tone="bg-success/10 text-success dark:bg-success/15"
        />
        <ShareTarget
          href={mailtoUrl({ email: client?.email, subject, body: message })}
          icon={MailIcon}
          title="Enviar por e-mail"
          detail={client?.email ? `Para ${client.email}` : "Você escolhe o destinatário"}
          tone="bg-primary/10 text-primary-ink dark:bg-primary/15"
        />
        {canShare && (
          <ShareTarget
            onClick={nativeShare}
            icon={Share2Icon}
            title="Mais opções"
            detail="Outros apps do aparelho"
            tone="bg-muted text-muted-foreground"
          />
        )}
      </div>

      {/* Anuncia a cópia para quem usa leitor de tela. */}
      <p aria-live="polite" className="sr-only">
        {copied === "link" ? "Link copiado." : copied === "message" ? "Mensagem copiada." : ""}
      </p>

      <DialogFooter className="-mx-6 -mb-6 px-6">
        <Button type="button" variant="outline" className="h-10" onClick={onDone}>
          {justSent ? "Concluir" : "Fechar"}
        </Button>
      </DialogFooter>
    </>
  )
}

/**
 * "Compartilhar proposta" (Sprint 17): link com "Copiar", mensagem pronta e
 * editável, WhatsApp (direto para o telefone do cliente, se houver), e-mail e
 * a folha de compartilhar do aparelho. Abre sozinho depois do envio
 * (`justSent`). Controlado por `open`/`onOpenChange`.
 * @param {{ open: boolean, onOpenChange: (open: boolean) => void,
 *   quote: { public_id: string, quote_number: string, title: string, total_cents: number, valid_until: string },
 *   client: { name: string, phone?: string|null, email?: string|null } | null,
 *   justSent?: boolean, onCloseAutoFocus?: (event: Event) => void }} props
 */
export function ShareQuoteDialog({ open, onOpenChange, quote, client, justSent = false, onCloseAutoFocus }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[calc(100svh-2rem)] gap-5 overflow-y-auto p-6 sm:max-w-lg"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <ShareQuoteContent quote={quote} client={client} justSent={justSent} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
