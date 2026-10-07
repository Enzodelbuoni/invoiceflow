import { cn } from "@/lib/utils"

// Tom (hue) estável a partir do nome: o mesmo cliente tem sempre a mesma cor.
function hueFromName(name) {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.codePointAt(0)) % 360
  return hash
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("")
}

const SIZES = {
  sm: "size-8 text-xs rounded-lg",
  default: "size-10 text-sm rounded-xl",
  lg: "size-14 text-lg rounded-2xl",
}

/** Iniciais do cliente sobre um fundo tingido (claro e escuro com contraste AA). */
export function ClientAvatar({ name, size = "default", className }) {
  return (
    <span
      aria-hidden="true"
      style={{ "--avatar-hue": hueFromName(name) }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-semibold",
        "bg-[oklch(0.94_0.04_var(--avatar-hue))] text-[oklch(0.42_0.12_var(--avatar-hue))]",
        "dark:bg-[oklch(0.3_0.06_var(--avatar-hue))] dark:text-[oklch(0.88_0.08_var(--avatar-hue))]",
        SIZES[size],
        className
      )}
    >
      {initials(name)}
    </span>
  )
}
