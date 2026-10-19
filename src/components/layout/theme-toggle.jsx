"use client"

import { useRef } from "react"
import { LaptopIcon, MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useMounted } from "@/hooks/use-mounted"

export const THEME_OPTIONS = [
  { value: "light", label: "Claro", icon: SunIcon },
  { value: "dark", label: "Escuro", icon: MoonIcon },
  { value: "system", label: "Sistema", icon: LaptopIcon },
]

function resolveTheme(theme) {
  if (theme !== "system") return theme
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

/**
 * Troca o tema com uma revelação circular a partir de `origin` (View Transitions API).
 * Sem suporte do navegador ou com movimento reduzido, troca na hora.
 */
function useThemeTransition() {
  const { setTheme } = useTheme()

  return (nextTheme, origin) => {
    const root = document.documentElement
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const resolved = resolveTheme(nextTheme)

    if (!document.startViewTransition || reduceMotion || !origin) {
      setTheme(nextTheme)
      return
    }

    const transition = document.startViewTransition(() => {
      // Aplica a classe na hora para o "depois" da transição já sair no tema novo;
      // o next-themes reaplica a mesma classe logo em seguida (idempotente).
      root.classList.toggle("dark", resolved === "dark")
      root.style.colorScheme = resolved
      setTheme(nextTheme)
    })

    transition.ready.then(() => {
      const { x, y } = origin
      const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        {
          duration: 550,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          pseudoElement: "::view-transition-new(root)",
        }
      )
    })
  }
}

export function ThemeToggle() {
  const { theme } = useTheme()
  const mounted = useMounted()
  const switchTheme = useThemeTransition()
  const triggerRef = useRef(null)

  function handleChange(value) {
    const rect = triggerRef.current?.getBoundingClientRect()
    const origin = rect && { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    switchTheme(value, origin)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button ref={triggerRef} variant="ghost" size="icon-sm" className="relative overflow-hidden max-md:size-10">
          <SunIcon className="rotate-0 scale-100 transition-all duration-500 ease-out-expo dark:-rotate-90 dark:scale-0" />
          <MoonIcon className="absolute rotate-90 scale-0 transition-all duration-500 ease-out-expo dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Alterar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Tema</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={mounted ? theme : undefined} onValueChange={handleChange}>
          {THEME_OPTIONS.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              <option.icon />
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
