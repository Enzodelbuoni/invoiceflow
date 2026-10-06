import { CircleAlertIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/** Erro geral do formulário (ex.: credenciais inválidas), exibido acima dos campos. */
export function FormAlert({ children, className }) {
  if (!children) return null

  return (
    <div
      role="alert"
      className={cn(
        "flex animate-in items-start gap-2.5 rounded-lg border border-destructive/25 bg-destructive/8 px-3 py-2.5 text-sm text-destructive duration-300 fade-in slide-in-from-top-1",
        className
      )}
    >
      <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <p>{children}</p>
    </div>
  )
}
