import {
  BanIcon,
  CircleCheckIcon,
  CircleXIcon,
  EyeIcon,
  PencilLineIcon,
  SendIcon,
  TimerOffIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { QUOTE_STATUS_LABELS } from "@/lib/constants/quote-status"

// Classes escritas por extenso para o Tailwind conseguir detectá-las.
const STATUS_STYLES = {
  draft: {
    icon: PencilLineIcon,
    className: "bg-status-draft/10 text-status-draft ring-status-draft/20 dark:bg-status-draft/15",
  },
  sent: {
    icon: SendIcon,
    className: "bg-status-sent/10 text-status-sent ring-status-sent/20 dark:bg-status-sent/15",
  },
  viewed: {
    icon: EyeIcon,
    className: "bg-status-viewed/10 text-status-viewed ring-status-viewed/20 dark:bg-status-viewed/15",
  },
  approved: {
    icon: CircleCheckIcon,
    className: "bg-status-approved/10 text-status-approved ring-status-approved/20 dark:bg-status-approved/15",
  },
  declined: {
    icon: CircleXIcon,
    className: "bg-status-declined/10 text-status-declined ring-status-declined/20 dark:bg-status-declined/15",
  },
  expired: {
    icon: TimerOffIcon,
    className: "bg-status-expired/10 text-status-expired ring-status-expired/20 dark:bg-status-expired/15",
  },
  cancelled: {
    icon: BanIcon,
    className: "bg-status-cancelled/10 text-status-cancelled ring-status-cancelled/20 dark:bg-status-cancelled/15",
  },
}

const SIZES = {
  sm: "h-5 gap-1 px-2 text-[11px] [&>svg]:size-3",
  default: "h-6 gap-1.5 px-2.5 text-xs [&>svg]:size-3.5",
}

/**
 * Selo de status do orçamento: cor + ícone + texto.
 * @param {{ status: string, size?: "sm" | "default", className?: string }} props
 */
export function StatusBadge({ status, size = "default", className }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.draft
  const label = QUOTE_STATUS_LABELS[status] ?? status
  const Icon = style.icon

  return (
    <span
      data-slot="status-badge"
      data-status={status}
      className={cn(
        "inline-flex w-fit shrink-0 items-center rounded-full font-medium whitespace-nowrap ring-1 ring-inset",
        SIZES[size],
        style.className,
        className
      )}
    >
      <Icon aria-hidden="true" />
      {label}
    </span>
  )
}
