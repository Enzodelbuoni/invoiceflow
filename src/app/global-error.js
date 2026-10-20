"use client"

import { useEffect } from "react"
import { CloudAlertIcon } from "lucide-react"

import { ErrorDigest, RetryButton, useReportError } from "@/components/shared/error-fallback"
import { StatusScreen } from "@/components/shared/status-screen"
import { fontVariables } from "./fonts"
import "./globals.css"

/**
 * Tema salvo pelo next-themes ("theme" no localStorage: light, dark ou system)
 * ou, sem ele, o do sistema. Aqui não há o ThemeProvider (o layout raiz falhou).
 */
function useSavedTheme() {
  useEffect(() => {
    let saved = null
    try {
      saved = localStorage.getItem("theme")
    } catch {
      // modo privado / armazenamento bloqueado: segue o sistema
    }
    const dark = saved === "dark" || (saved !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches)
    document.documentElement.classList.toggle("dark", dark)
    document.documentElement.style.colorScheme = dark ? "dark" : "light"
  }, [])
}

// Último recurso: erro no layout raiz. Substitui o documento inteiro, então
// traz o próprio <html>/<body>, o CSS global e as fontes (sem metadata: usa <title>).
export default function GlobalError({ error, retry }) {
  useReportError(error)
  useSavedTheme()

  return (
    <html lang="pt-BR" className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <title>Algo deu errado · InvoiceFlow</title>
        <StatusScreen
          standalone
          icon={CloudAlertIcon}
          tone="danger"
          title="Algo deu errado"
          description="O InvoiceFlow não conseguiu abrir agora. Pode ser uma instabilidade momentânea: tente de novo em alguns segundos."
          footer={<ErrorDigest error={error} />}
        >
          <RetryButton retry={retry} size="lg" />
        </StatusScreen>
      </body>
    </html>
  )
}
