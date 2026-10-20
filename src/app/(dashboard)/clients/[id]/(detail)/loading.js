import { LoadingRegion } from "@/components/shared/page-skeletons"
import { Skeleton } from "@/components/ui/skeleton"

// Fica no grupo (detail) para valer só para a página do cliente: em [id]/
// ele envolveria também a edição, que tem o esqueleto dela.

/** Linha "ícone + rótulo + valor" do cartão de contato. */
function InfoItemSkeleton({ className }) {
  return (
    <div className={className}>
      <div className="flex items-start gap-3">
        <Skeleton className="size-8 shrink-0 rounded-lg" />
        <div className="flex flex-1 flex-col gap-2 pt-0.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-40 max-w-full" />
        </div>
      </div>
    </div>
  )
}

// Esqueleto da página do cliente: cabeçalho com avatar, contato, observações e orçamentos.
export default function ClientLoading() {
  return (
    <LoadingRegion label="Carregando o cliente">
      <div className="flex flex-col gap-6">
        <Skeleton className="h-4 w-20" />
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-5">
          <div className="flex min-w-0 flex-[1_1_20rem] items-center gap-4">
            <Skeleton className="size-14 shrink-0 rounded-2xl" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-9 w-72 max-w-full" />
              <Skeleton className="h-4 w-56 max-w-full" />
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 shadow-sm lg:col-span-2">
          <Skeleton className="mb-5 h-4 w-32" />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <InfoItemSkeleton />
            <InfoItemSkeleton />
            <InfoItemSkeleton />
            <InfoItemSkeleton />
            <InfoItemSkeleton className="sm:col-span-2" />
          </div>
        </div>
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-sm">
          <Skeleton className="mb-1 h-4 w-28" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-4/5" />
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-36" />
        </div>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="hidden h-4 w-24 sm:block" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  )
}
