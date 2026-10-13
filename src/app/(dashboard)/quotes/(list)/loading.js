import { Skeleton } from "@/components/ui/skeleton"

// Esqueleto da lista de orçamentos enquanto o servidor busca os dados.
export default function QuotesLoading() {
  return (
    <div aria-busy="true" aria-label="Carregando orçamentos" className="flex flex-col gap-8">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="hidden h-10 w-44 sm:block" />
      </div>
      <Skeleton className="h-4 w-28" />
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="hidden h-4 w-32 md:block" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}
