import { LoadingRegion, PageHeaderSkeleton } from "@/components/shared/page-skeletons"
import { Skeleton } from "@/components/ui/skeleton"

// Esqueleto da lista de modelos (cartões em grade, como a página).
export default function TemplatesLoading() {
  return (
    <LoadingRegion label="Carregando modelos">
      <PageHeaderSkeleton eyebrow={false} />
      <Skeleton className="h-4 w-72 max-w-full" />
      <div className="@container">
        <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2 @6xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
              <div className="flex items-start gap-3">
                <Skeleton className="size-10 rounded-xl" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-3.5 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-24 w-full rounded-xl" />
              <div className="flex gap-1.5">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <div className="flex items-end justify-between border-t pt-4">
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-6 w-28" />
                </div>
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </LoadingRegion>
  )
}
