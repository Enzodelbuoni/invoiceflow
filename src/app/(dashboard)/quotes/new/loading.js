import { Skeleton } from "@/components/ui/skeleton"

function SectionSkeleton({ lines = 2 }) {
  return (
    <div className="rounded-2xl border bg-card">
      <div className="flex items-center gap-3.5 border-b px-5 py-4 sm:px-6">
        <Skeleton className="size-6 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-56 max-w-full" />
        </div>
      </div>
      <div className="flex flex-col gap-3 p-5 sm:p-6">
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  )
}

// Esqueleto do construtor enquanto o servidor carrega os clientes.
export default function NewQuoteLoading() {
  return (
    <div aria-busy="true" aria-label="Carregando o construtor de orçamentos" className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      {/* Mesma grade do QuoteForm (container query). */}
      <div className="@container">
        <div className="grid grid-cols-1 items-start gap-6 @4xl:grid-cols-[minmax(0,1fr)_20rem] @6xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex flex-col gap-6">
            <SectionSkeleton lines={1} />
            <SectionSkeleton lines={3} />
            <SectionSkeleton lines={1} />
          </div>
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    </div>
  )
}
