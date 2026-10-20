import { LoadingRegion, PageHeaderSkeleton } from "@/components/shared/page-skeletons"
import { Skeleton } from "@/components/ui/skeleton"

// Alturas fixas das colunas do gráfico (em %): o esqueleto não muda a cada carregamento.
const BAR_HEIGHTS = [38, 62, 45, 80, 55, 70, 42, 90, 66, 50, 74, 32, 58]

function KpiTileSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="size-8 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-28 max-w-full" />
      <Skeleton className="h-3 w-32 max-w-full" />
    </div>
  )
}

/** Cartão com título e linhas (propostas por situação / atividade recente). */
function ListCardSkeleton({ rows, leading }) {
  return (
    <div className="flex flex-col gap-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <Skeleton className="h-4 w-44" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          {leading}
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="h-3.5 w-14" />
        </div>
      ))}
    </div>
  )
}

// Esqueleto do painel enquanto o banco calcula os números, a série do gráfico e a atividade.
export default function DashboardLoading() {
  return (
    <LoadingRegion label="Carregando o painel">
      <PageHeaderSkeleton actions={["h-10 w-40"]} />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-9 w-80 max-w-full rounded-lg" />
        <Skeleton className="h-3 w-64 max-w-full" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <div className="flex flex-col gap-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-16 w-40" />
          <Skeleton className="h-2.5 w-full rounded-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <KpiTileSkeleton />
          <KpiTileSkeleton />
          <KpiTileSkeleton />
          <KpiTileSkeleton />
        </div>
      </div>

      <div className="flex flex-col gap-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-64 max-w-full" />
          </div>
          <Skeleton className="h-8 w-36 rounded-lg" />
        </div>
        <div className="flex h-44 items-end gap-2 border-b sm:h-56 sm:gap-3">
          {BAR_HEIGHTS.map((height, i) => (
            <div key={i} className="flex h-full flex-1 items-end justify-center">
              <Skeleton className="w-3/5 max-w-6 rounded-t-[4px] rounded-b-none" style={{ height: `${height}%` }} />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
        <ListCardSkeleton rows={7} leading={<Skeleton className="h-6 w-24 rounded-full" />} />
        <ListCardSkeleton rows={6} leading={<Skeleton className="size-7 shrink-0 rounded-full" />} />
      </div>
    </LoadingRegion>
  )
}
