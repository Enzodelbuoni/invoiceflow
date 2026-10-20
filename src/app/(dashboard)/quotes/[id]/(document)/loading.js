import { LoadingRegion, PageHeaderSkeleton } from "@/components/shared/page-skeletons"
import { Skeleton } from "@/components/ui/skeleton"

// Fica no grupo (document) para valer só para a página do orçamento: em [id]/
// ele envolveria também a edição, que tem o esqueleto do construtor.

/** O papel do documento (sempre claro, como o QuotePreview), com as linhas no lugar do texto. */
function PaperSkeleton() {
  return (
    <div className="theme-paper mx-auto w-full max-w-[52rem] overflow-hidden rounded-md shadow-xl ring-1 ring-black/5">
      <div className="h-1.5 bg-primary/60" />
      <div className="flex flex-col gap-9 px-5 py-7 sm:px-12 sm:py-12">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-center gap-3">
            <Skeleton className="size-11 rounded-xl" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-full max-w-prose" />
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex items-center justify-between gap-6 border-b pb-4">
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
          <div className="flex flex-col items-end gap-2 pt-1">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-7 w-56" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Esqueleto da página do orçamento: cabeçalho com status e ações, o documento na "mesa" e o histórico.
export default function QuoteLoading() {
  return (
    <LoadingRegion label="Carregando o orçamento">
      <PageHeaderSkeleton actions={["w-24 rounded-full", "w-32", "w-9"]} />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="rounded-2xl border bg-muted/50 px-2 py-4 sm:p-8 dark:bg-muted/30">
          <PaperSkeleton />
        </div>
        <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm">
          <Skeleton className="mb-1 h-4 w-24" />
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="size-7 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-2 pt-0.5">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </LoadingRegion>
  )
}
