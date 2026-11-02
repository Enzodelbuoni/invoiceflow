import { BuilderSkeleton, LoadingRegion, PageHeaderSkeleton } from "@/components/shared/page-skeletons"

// Esqueleto da edição do modelo: o mesmo editor do "Novo modelo", com o botão Excluir.
export default function EditTemplateLoading() {
  return (
    <LoadingRegion label="Carregando o modelo">
      <PageHeaderSkeleton actions={["w-24"]} />
      <BuilderSkeleton sections={[1, 3, 2]} />
    </LoadingRegion>
  )
}
