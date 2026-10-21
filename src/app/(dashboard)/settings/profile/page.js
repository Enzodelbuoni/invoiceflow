import { ProfileForm } from "@/components/settings/profile-form"
import { getProfile } from "@/lib/data/profiles"

export const metadata = { title: "Perfil · Configurações" }

export default async function ProfileSettingsPage() {
  const profile = await getProfile()
  return <ProfileForm profile={profile} />
}
