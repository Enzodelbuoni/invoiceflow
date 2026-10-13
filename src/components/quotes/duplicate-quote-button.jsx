"use client"

import { CopyIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useDuplicateQuote } from "@/hooks/use-duplicate-quote"

/** "Duplicar como novo rascunho" fora do menu (ex.: no aviso de que o orçamento não pode mais ser editado). */
export function DuplicateQuoteButton({ quote, ...props }) {
  const { duplicate, pending } = useDuplicateQuote()
  return (
    <Button {...props} disabled={pending} aria-busy={pending || undefined} onClick={() => duplicate(quote)}>
      {pending ? <Spinner data-icon="inline-start" aria-hidden="true" /> : <CopyIcon data-icon="inline-start" />}
      Duplicar como novo rascunho
    </Button>
  )
}
