"use client"

import { useSyncExternalStore } from "react"
import { useTheme } from "next-themes"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

// Botões interativos da vitrine: disparar toasts e alternar o tema.
export function ToastDemo() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => toast.success("Orçamento salvo como rascunho.")}>
        Sucesso
      </Button>
      <Button variant="outline" onClick={() => toast.error("Não foi possível salvar. Tente novamente.")}>
        Erro
      </Button>
      <Button variant="outline" onClick={() => toast.warning("Este orçamento vence amanhã.")}>
        Aviso
      </Button>
      <Button variant="outline" onClick={() => toast.info("Link copiado para a área de transferência.")}>
        Info
      </Button>
    </div>
  )
}

const THEMES = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
  { value: "system", label: "Sistema" },
]

// `false` no servidor e na hidratação, `true` depois: o tema salvo só existe no cliente.
const noopSubscribe = () => () => {}

export function ThemeDemo() {
  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false)

  return (
    <div className="flex flex-wrap gap-2">
      {THEMES.map((t) => (
        <Button
          key={t.value}
          variant={mounted && theme === t.value ? "default" : "outline"}
          onClick={() => setTheme(t.value)}
        >
          {t.label}
        </Button>
      ))}
    </div>
  )
}
