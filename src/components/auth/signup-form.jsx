"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { FormAlert } from "@/components/auth/form-alert"
import { PasswordInput } from "@/components/auth/password-input"
import { PasswordStrength } from "@/components/auth/password-strength"
import { SubmitButton } from "@/components/auth/submit-button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { getAuthErrorMessage, signUp } from "@/lib/auth/client"
import { signupSchema } from "@/lib/validations/auth"

export function SignupForm() {
  const router = useRouter()
  const [formError, setFormError] = useState(null)
  const [navigating, startNavigation] = useTransition()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(signupSchema),
    mode: "onTouched",
    defaultValues: { name: "", email: "", password: "" },
  })
  const password = useWatch({ control, name: "password" })

  async function onSubmit(values) {
    setFormError(null)
    try {
      await signUp(values)
      toast.success("Conta criada!", { description: "Bem-vindo ao InvoiceFlow." })
      startNavigation(() => router.push("/dashboard"))
    } catch (error) {
      setFormError(getAuthErrorMessage(error))
    }
  }

  const busy = isSubmitting || navigating

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <FormAlert>{formError}</FormAlert>

      <FieldGroup className="gap-5">
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="name">Nome</FieldLabel>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Como você quer ser chamado"
            className="h-10"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "name-error" : undefined}
            {...register("name")}
          />
          <FieldError id="name-error" errors={[errors.name]} />
        </Field>

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
          <FieldLabel htmlFor="password">Senha</FieldLabel>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            aria-describedby={["password-strength", errors.password && "password-error"].filter(Boolean).join(" ")}
            {...register("password")}
          />
          <FieldError id="password-error" errors={[errors.password]} />
          <PasswordStrength id="password-strength" value={password} />
        </Field>
      </FieldGroup>

      <SubmitButton loading={busy} loadingText="Criando conta…">
        Criar conta grátis
      </SubmitButton>
    </form>
  )
}
