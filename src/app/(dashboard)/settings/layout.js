import { PageHeader } from "@/components/layout/page-header"
import { SettingsNav } from "@/components/settings/settings-nav"

// Configurações (etapa 38): cabeçalho e abas ficam; cada aba é uma sub-rota
// (/settings/profile, /settings/business), com o próprio template de entrada.
export default function SettingsLayout({ children }) {
  return (
    <>
      <PageHeader
        title="Configurações"
        description="Seus dados e como o seu negócio aparece nas propostas que os clientes recebem."
      />
      <SettingsNav />
      {children}
    </>
  )
}
