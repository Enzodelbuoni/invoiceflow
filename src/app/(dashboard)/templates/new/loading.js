import { BuilderSkeleton, LoadingRegion, PageHeaderSkeleton } from "@/components/shared/page-skeletons"

// Esqueleto do editor de modelos (as mesmas seções do construtor de orçamentos).
export default function NewTemplateLoading() {
  return (
    <LoadingRegion label="Carregando o editor de modelos">
      <PageHeaderSkeleton />
      <BuilderSkeleton sections={[1, 3, 1]} />
    </LoadingRegion>
  )
}
