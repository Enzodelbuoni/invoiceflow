import { BuilderSkeleton, LoadingRegion, PageHeaderSkeleton } from "@/components/shared/page-skeletons"

// Esqueleto do construtor enquanto o servidor carrega os clientes.
export default function NewQuoteLoading() {
  return (
    <LoadingRegion label="Carregando o construtor de orçamentos">
      <PageHeaderSkeleton />
      <BuilderSkeleton sections={[1, 3, 1]} />
    </LoadingRegion>
  )
}
