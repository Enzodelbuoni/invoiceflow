"use client"

import { MotionConfig } from "motion/react"
import { ThemeProvider } from "next-themes"

import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"

// Providers globais de cliente. Ficam isolados aqui para o layout raiz
// continuar sendo Server Component.
export function Providers({ children }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {/* reducedMotion="user": animações do motion respeitam prefers-reduced-motion. */}
      <MotionConfig reducedMotion="user">
        <TooltipProvider>
          {children}
          <Toaster richColors closeButton position="top-right" />
        </TooltipProvider>
      </MotionConfig>
    </ThemeProvider>
  )
}
