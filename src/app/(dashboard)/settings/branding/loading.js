import { FormSkeleton, LoadingRegion } from "@/components/shared/page-skeletons"

// Esqueleto da aba Identidade visual (o cabeçalho e as abas ficam no layout).
export default function BrandingSettingsLoading() {
  return (
    <LoadingRegion label="Carregando a identidade visual">
      <FormSkeleton sections={[["box"], ["full"]]} />
    </LoadingRegion>
  )
}
