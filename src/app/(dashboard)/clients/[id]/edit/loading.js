import { FormSkeleton, LoadingRegion, PageHeaderSkeleton } from "@/components/shared/page-skeletons"

// Esqueleto da edição do cliente: as mesmas seções do ClientForm.
export default function EditClientLoading() {
  return (
    <LoadingRegion label="Carregando o cliente">
      <PageHeaderSkeleton description={false} />
      <FormSkeleton sections={[["full", "half", "half"], ["half", "half", "full"], ["area"]]} />
    </LoadingRegion>
  )
}
