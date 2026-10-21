import { FormSkeleton, LoadingRegion } from "@/components/shared/page-skeletons"

// Esqueleto da aba Negócio (o cabeçalho e as abas ficam no layout).
export default function BusinessSettingsLoading() {
  return (
    <LoadingRegion label="Carregando os dados do negócio">
      <FormSkeleton sections={[["full", "half", "half", "full"], ["half", "half", "full"]]} />
    </LoadingRegion>
  )
}
