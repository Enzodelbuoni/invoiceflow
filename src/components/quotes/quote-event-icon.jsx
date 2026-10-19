import {
  BanIcon,
  CircleCheckIcon,
  CircleXIcon,
  DownloadIcon,
  EyeIcon,
  FilePlusIcon,
  PencilLineIcon,
  SendIcon,
  TimerOffIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

// Ícone e cor de cada evento (classes por extenso para o Tailwind gerá-las).
const EVENT_STYLES = {
  created: { icon: FilePlusIcon, className: "bg-muted text-muted-foreground" },
  updated: { icon: PencilLineIcon, className: "bg-muted text-muted-foreground" },
  sent: { icon: SendIcon, className: "bg-status-sent/10 text-status-sent dark:bg-status-sent/15" },
  viewed: { icon: EyeIcon, className: "bg-status-viewed/10 text-status-viewed dark:bg-status-viewed/15" },
  approved: { icon: CircleCheckIcon, className: "bg-status-approved/10 text-status-approved dark:bg-status-approved/15" },
  declined: { icon: CircleXIcon, className: "bg-status-declined/10 text-status-declined dark:bg-status-declined/15" },
  expired: { icon: TimerOffIcon, className: "bg-status-expired/10 text-status-expired dark:bg-status-expired/15" },
  cancelled: { icon: BanIcon, className: "bg-status-cancelled/10 text-status-cancelled dark:bg-status-cancelled/15" },
  downloaded: { icon: DownloadIcon, className: "bg-muted text-muted-foreground" },
}

/**
 * Selo redondo de um evento da proposta (histórico do orçamento e atividade
 * recente do painel). Decorativo: o rótulo do evento vai em texto ao lado.
 * @param {{ type: string, className?: string }} props
 */
export function QuoteEventIcon({ type, className }) {
  const style = EVENT_STYLES[type] ?? EVENT_STYLES.updated
  const Icon = style.icon
  return (
    <span
      aria-hidden="true"
      className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", style.className, className)}
    >
      <Icon className="size-4" />
    </span>
  )
}
