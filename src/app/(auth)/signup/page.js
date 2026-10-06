import Link from "next/link"

import { AuthHeading } from "@/components/auth/auth-heading"
import { SignupForm } from "@/components/auth/signup-form"

export const metadata = { title: "Criar conta" }

export default function SignupPage() {
  return (
    <>
      <AuthHeading
        title="Crie sua conta"
        description="Comece a enviar propostas profissionais em poucos minutos."
      />
      <SignupForm />
      <p className="text-center text-sm text-muted-foreground">
        Já tem uma conta?{" "}
        <Link href="/login" className="font-medium text-primary-ink underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </>
  )
}
