import { redirect } from "next/navigation"

// O menu aponta para /settings; a primeira aba é o perfil.
export default function SettingsPage() {
  redirect("/settings/profile")
}
