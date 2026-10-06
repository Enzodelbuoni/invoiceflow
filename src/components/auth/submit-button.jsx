import { ArrowRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

/** Botão principal dos formulários de autenticação, com estado de carregamento. */
export function SubmitButton({ loading, loadingText, children, className, ...props }) {
  return (
    <Button
      type="submit"
      disabled={loading}
      aria-busy={loading || undefined}
      className={cn("group/submit h-10 w-full text-sm shadow-sm", className)}
      {...props}
    >
      {loading ? (
        <>
          <Spinner aria-hidden="true" />
          {loadingText}
        </>
      ) : (
        <>
          {children}
          <ArrowRightIcon
            aria-hidden="true"
            className="transition-transform duration-300 ease-out-expo group-hover/submit:translate-x-0.5"
          />
        </>
      )}
    </Button>
  )
}
