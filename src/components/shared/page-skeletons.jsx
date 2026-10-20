import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

// Peças dos esqueletos de carregamento (loading.js). Cada esqueleto imita o
// desenho da página que vai chegar (mesmos cartões e espaçamentos), para o
// conteúdo entrar no lugar sem "pulo".

/**
 * Região do esqueleto: `aria-busy` + aviso "Carregando…" para leitores de tela
 * (os blocos cinza não dizem nada a quem não vê).
 */
export function LoadingRegion({ label, className, children }) {
  return (
    <div aria-busy="true" className={cn("flex flex-col gap-8", className)}>
      <span role="status" className="sr-only">
        {label}…
      </span>
      {children}
    </div>
  )
}

/** Imita o PageHeader: sobrelinha, título serif, descrição e botões à direita. */
export function PageHeaderSkeleton({ eyebrow = true, description = true, actions = [] }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-5">
      <div className="flex min-w-0 flex-[1_1_22rem] flex-col gap-3">
        {eyebrow && <Skeleton className="h-3 w-24" />}
        <Skeleton className="h-10 w-64 max-w-full sm:h-11" />
        {description && <Skeleton className="h-4 w-96 max-w-full" />}
      </div>
      {actions.length > 0 && (
        <div className="flex shrink-0 items-center gap-2">
          {actions.map((className, index) => (
            <Skeleton key={index} className={cn("h-9", className)} />
          ))}
        </div>
      )}
    </div>
  )
}

const FIELD_SPANS = { half: "", full: "sm:col-span-2", area: "sm:col-span-2", box: "sm:col-span-2" }

/**
 * Imita um formulário em seções (FormSection): título e descrição à esquerda,
 * campos à direita. `sections`: uma lista de campos por seção —
 * "half" (meia linha), "full" (linha inteira), "area" (caixa de texto) ou
 * "box" (bloco sem rótulo, como a prévia do item no formulário de serviço).
 */
export function FormSkeleton({ sections }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-8">
      {sections.map((fields, index) => (
        <div
          key={index}
          className="grid gap-6 border-t py-8 first:border-t-0 first:pt-0 md:grid-cols-[minmax(0,14rem)_1fr] md:gap-10"
        >
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-40 max-w-full" />
          </div>
          <div className="grid content-start gap-5 sm:grid-cols-2">
            {fields.map((field, fieldIndex) =>
              field === "box" ? (
                <Skeleton key={fieldIndex} className={cn("h-20 rounded-xl", FIELD_SPANS[field])} />
              ) : (
                <div key={fieldIndex} className={cn("flex flex-col gap-2", FIELD_SPANS[field])}>
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className={field === "area" ? "h-20" : "h-10"} />
                </div>
              ),
            )}
          </div>
        </div>
      ))}
      {/* Como o rodapé do formulário: botões empilhados no celular, à direita no resto. */}
      <div className="flex flex-col-reverse gap-2 border-t pt-6 sm:flex-row sm:justify-end">
        <Skeleton className="h-10 sm:w-24" />
        <Skeleton className="h-10 sm:w-40" />
      </div>
    </div>
  )
}
