import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { StatusScreen } from "@/components/shared/status-screen"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth/server"

export const metadata = { title: "Página não encontrada" }

/** Logado ou não, sem deixar a página de 404 quebrar se o Supabase estiver fora. */
async function isLoggedIn() {
  try {
    return Boolean(await getCurrentUser())
  } catch {
    return false
  }
}

// 404 geral: endereço que não existe em lugar nenhum do app (os recursos —
// cliente, serviço, orçamento, proposta pública — têm o not-found.js deles).
export default async function NotFound() {
  const loggedIn = await isLoggedIn()

  return (
    <StatusScreen
      code="404"
      title="Página não encontrada"
      description="O endereço pode ter sido digitado errado, ou a página não existe mais."
    >
      {loggedIn ? (
        <Button asChild size="lg" className="h-10 px-4">
          <Link href="/dashboard">
            Ir para o painel
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </Button>
      ) : (
        <>
          <Button asChild size="lg" className="h-10 px-4">
            <Link href="/">Página inicial</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-10 px-4">
            <Link href="/login">Entrar</Link>
          </Button>
        </>
      )}
    </StatusScreen>
  )
}
