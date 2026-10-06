"use client"

import { useState } from "react"
import { EyeIcon, EyeOffIcon } from "lucide-react"

import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { cn } from "@/lib/utils"

/** Campo de senha com botão para mostrar/ocultar. Aceita as props do `register` do RHF. */
export function PasswordInput({ className, ...props }) {
  const [visible, setVisible] = useState(false)
  const Icon = visible ? EyeOffIcon : EyeIcon

  return (
    <InputGroup className={cn("h-10", className)}>
      <InputGroupInput type={visible ? "text" : "password"} className="h-full" {...props} />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-sm"
          aria-label="Mostrar senha"
          aria-pressed={visible}
          className="text-muted-foreground hover:text-foreground"
          onClick={() => setVisible((value) => !value)}
        >
          {/* `key` faz o ícone remontar e animar a troca. */}
          <Icon key={visible ? "off" : "on"} className="animate-in duration-200 fade-in zoom-in-75" />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}
