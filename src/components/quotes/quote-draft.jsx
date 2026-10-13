"use client"

import { motion } from "motion/react"
import { HistoryIcon, RotateCcwIcon, ShieldCheckIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { formatMomentRelative } from "@/lib/dates"
import { useQuoteDraftStore } from "@/store/quote-draft-store"

const plural = (count) => `${count} ${count === 1 ? "item" : "itens"}`

/**
 * Aviso no topo do construtor quando há um orçamento (ou, na edição, alterações)
 * não salvo guardado neste navegador (a aba fechou, a página recarregou, a
 * pessoa saiu da página…). Mostra o que dá para reconhecer (título, cliente,
 * itens, quando) e deixa a pessoa escolher entre recuperar e descartar.
 * `draft.outdated`: na edição, o orçamento foi salvo de novo depois que estas
 * alterações começaram (recuperar substitui o que foi salvo).
 * @param {{ draft: { values: object, savedAt: string, outdated?: boolean }, editing?: boolean,
 *   clients: Array<{ id: string, name: string }>, onRestore: () => void, onDiscard: () => void }} props
 */
export function QuoteDraftBanner({ draft, editing = false, clients, onRestore, onDiscard }) {
  const { values, savedAt, outdated } = draft
  const title = values?.title?.trim()
  const client = clients.find((option) => option.id === values?.client_id)
  const itemCount = Array.isArray(values?.items) ? values.items.length : 0
  const details = [
    client && `para ${client.name}`,
    itemCount > 0 && plural(itemCount),
    `guardado neste navegador ${formatMomentRelative(savedAt)}`,
  ].filter(Boolean)

  return (
    <motion.section
      aria-labelledby="quote-draft-title"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="mb-6 overflow-hidden rounded-2xl border border-primary/25 bg-primary/5 shadow-sm dark:bg-primary/10"
    >
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary-ink ring-1 ring-primary/20 dark:bg-primary/15"
        >
          <HistoryIcon className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 id="quote-draft-title" className="font-medium">
            {editing ? "Você tem alterações não salvas neste orçamento" : "Você tem um orçamento não salvo"}
          </h2>
          <p className="text-sm text-pretty text-muted-foreground">
            <span className="font-medium text-foreground">{title ? `“${title}”` : "Orçamento sem título"}</span>
            {details.map((detail) => (
              <span key={detail}> · {detail}</span>
            ))}
          </p>
          {outdated && (
            <p className="text-sm text-pretty text-warning">
              O orçamento foi salvo de novo depois disso. Recuperar substitui a versão salva por estas alterações.
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="button" className="h-9 shadow-sm" onClick={onRestore}>
            <RotateCcwIcon data-icon="inline-start" />
            Recuperar
          </Button>
          <Button type="button" variant="ghost" className="h-9" onClick={onDiscard}>
            Descartar
          </Button>
        </div>
      </div>
    </motion.section>
  )
}

/**
 * "Cópia de segurança neste navegador · hoje às 14:32", embaixo das ações do
 * resumo. Deixa claro que o trabalho não se perde e que ainda NÃO foi salvo na
 * conta (isso é o "Salvar rascunho"). Assina só o horário do rascunho, para os
 * salvamentos automáticos não re-renderizarem o formulário.
 */
export function QuoteDraftStatus({ draftKey, active }) {
  const savedAt = useQuoteDraftStore((state) => state.drafts[draftKey]?.savedAt)
  if (!active || !savedAt) return null
  return (
    <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
      <ShieldCheckIcon aria-hidden="true" className="size-3.5 shrink-0" />
      Cópia de segurança neste navegador · {formatMomentRelative(savedAt)}
    </p>
  )
}
