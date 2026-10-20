import { LoadingRegion } from "@/components/shared/page-skeletons"
import { Skeleton } from "@/components/ui/skeleton"

// Esqueleto da lista de serviços enquanto o servidor busca os dados.
export default function ServicesLoading() {
  return (
    <LoadingRegion label="Carregando serviços">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="hidden h-10 w-36 sm:block" />
      </div>
      <Skeleton className="h-10 w-full sm:max-w-sm" />
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <div className="flex flex-col items-end gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-14" />
            </div>
          </div>
        ))}
      </div>
    </LoadingRegion>
  )
}
