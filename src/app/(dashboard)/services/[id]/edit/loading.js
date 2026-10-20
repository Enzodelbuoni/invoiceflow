import { FormSkeleton, LoadingRegion, PageHeaderSkeleton } from "@/components/shared/page-skeletons"

// Esqueleto da edição do serviço: as mesmas seções do ServiceForm (com a prévia do item).
export default function EditServiceLoading() {
  return (
    <LoadingRegion label="Carregando o serviço">
      <PageHeaderSkeleton actions={["w-24"]} />
      <FormSkeleton sections={[["full", "area"], ["half", "half", "box"]]} />
    </LoadingRegion>
  )
}
