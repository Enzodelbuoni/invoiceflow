"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { FormAlert } from "@/components/auth/form-alert"
import { PasswordInput } from "@/components/auth/password-input"
import { SubmitButton } from "@/components/auth/submit-button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { getAuthErrorMessage, signIn } from "@/lib/auth/client"
import { loginSchema } from "@/lib/validations/auth"

/** @param {{ next: string, initialError?: string | null }} props `next` já vem validado. */
export function LoginForm({ next, initialError = null }) {
  const router = useRouter()
  const [formError, setFormError] = useState(initialError)
  const [navigating, startNavigation] = useTransition()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
    defaultValues: { email: "", password: "" },
  })

  async function onSubmit(values) {
    setFormError(null)
    try {
      await signIn(values)
      toast.success("Que bom te ver de novo!")
      startNavigation(() => router.push(next))
    } catch (error) {
      setFormError(getAuthErrorMessage(error))
    }
  }

  const busy = isSubmitting || navigating

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <FormAlert>{formError}</FormAlert>

      <FieldGroup className="gap-5">
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">E-mail</FieldLabel>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="voce@exemplo.com"
            className="h-10"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
          />
          <FieldError id="email-error" errors={[errors.email]} />
        </Field>

        <Field data-invalid={!!errors.password}>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="password">Senha</FieldLabel>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-primary-ink underline-offset-4 hover:underline"
            >
              Esqueceu a senha?
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
            {...register("password")}
          />
          <FieldError id="password-error" errors={[errors.password]} />
        </Field>
      </FieldGroup>

      <SubmitButton loading={busy} loadingText="Entrando…">
        Entrar
      </SubmitButton>
    </form>
  )
}
