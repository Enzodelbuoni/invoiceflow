"use client"

import { CheckIcon } from "lucide-react"

import { PASSWORD_REQUIREMENTS, getPasswordStrength } from "@/lib/validations/auth"
import { cn } from "@/lib/utils"

const LEVELS = [
  { label: "Muito fraca", bar: "bg-destructive", text: "text-destructive" },
  { label: "Fraca", bar: "bg-destructive", text: "text-destructive" },
  { label: "Razoável", bar: "bg-warning", text: "text-warning" },
  { label: "Boa", bar: "bg-primary", text: "text-primary-ink" },
  { label: "Forte", bar: "bg-success", text: "text-success" },
]

/** Medidor de força + checklist dos requisitos da senha nova. */
export function PasswordStrength({ value = "", id }) {
  const score = getPasswordStrength(value)
  const level = LEVELS[score]

  return (
    <div id={id} className="flex flex-col gap-2.5">
      <div className="flex items-center gap-3">
        <div aria-hidden="true" className="grid flex-1 grid-cols-4 gap-1.5">
          {[1, 2, 3, 4].map((step) => (
            <span key={step} className="h-1 overflow-hidden rounded-full bg-muted">
              <span
                className={cn(
                  "block h-full origin-left rounded-full transition-[scale,background-color] duration-500 ease-out-expo",
                  score >= step ? cn("scale-x-100", level.bar) : "scale-x-0 bg-transparent"
                )}
              />
            </span>
          ))}
        </div>
        <span aria-live="polite" className={cn("w-20 text-right text-xs font-medium", value ? level.text : "text-muted-foreground")}>
          {value ? level.label : "—"}
        </span>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
        {PASSWORD_REQUIREMENTS.map((requirement) => {
          const met = requirement.test(value)
          return (
            <li
              key={requirement.id}
              className={cn(
                "flex items-center gap-1.5 text-xs transition-colors duration-300",
                met ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-3.5 items-center justify-center rounded-full ring-1 transition-all duration-300 ease-spring",
                  met ? "scale-100 bg-success text-white ring-success" : "scale-90 ring-border"
                )}
              >
                <CheckIcon strokeWidth={3} className={cn("size-2.5 transition-opacity", met ? "opacity-100" : "opacity-0")} />
              </span>
              {requirement.label}
              <span className="sr-only">{met ? "(atendido)" : "(pendente)"}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
