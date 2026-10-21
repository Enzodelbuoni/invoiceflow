import { FormSkeleton, LoadingRegion } from "@/components/shared/page-skeletons"

// Esqueleto da aba Perfil (o cabeçalho e as abas ficam no layout).
export default function ProfileSettingsLoading() {
  return (
    <LoadingRegion label="Carregando o perfil">
      <FormSkeleton sections={[["full", "half"], ["full"]]} />
    </LoadingRegion>
  )
}
