"use client"

import { useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"
import { ArrowLeftIcon, MailCheckIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { FormAlert } from "@/components/auth/form-alert"
import { SubmitButton } from "@/components/auth/submit-button"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { getAuthErrorMessage, requestPasswordReset } from "@/lib/auth/client"
import { forgotPasswordSchema } from "@/lib/validations/auth"

const SWAP = {
  initial: { opacity: 0, y: 12, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -8, filter: "blur(4px)" },
  transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
}

export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState(null)
  const [formError, setFormError] = useState(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onTouched",
    defaultValues: { email: "" },
  })

  async function onSubmit(values) {
    setFormError(null)
    try {
      await requestPasswordReset(values)
      setSentTo(values.email)
    } catch (error) {
      setFormError(getAuthErrorMessage(error))
    }
  }

  function handleUseAnotherEmail() {
    reset()
    setSentTo(null)
  }

  // O <div> isola a troca animada (motion) da animação de entrada do template.js.
  return (
    <div>
      <AnimatePresence mode="wait" initial={false}>
        {sentTo ? (
          <motion.div key="sent" {...SWAP} className="flex flex-col items-center gap-5 text-center">
            <span className="relative flex size-14 items-center justify-center rounded-2xl border bg-card text-success shadow-md">
              <span
                aria-hidden="true"
                className="absolute inset-0 animate-ping rounded-2xl bg-success/15"
                style={{ animationIterationCount: 2 }}
              />
              <MailCheckIcon aria-hidden="true" className="relative size-6" />
            </span>
            <div role="status" className="flex flex-col gap-2">
              <h2 className="font-display text-2xl">Verifique seu e-mail</h2>
              <p className="text-sm text-pretty text-muted-foreground">
                Se existir uma conta para <span className="font-medium text-foreground">{sentTo}</span>, você vai
                receber um link para criar uma nova senha em alguns minutos. Confira também a caixa de spam.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2">
              <Button asChild className="h-10">
                <Link href="/login">
                  <ArrowLeftIcon data-icon="inline-start" />
                  Voltar para o login
                </Link>
              </Button>
              <Button variant="ghost" className="h-10" onClick={handleUseAnotherEmail}>
                Usar outro e-mail
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            {...SWAP}
            noValidate
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-6"
          >
            <FormAlert>{formError}</FormAlert>

            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="email">E-mail da conta</FieldLabel>
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

            <SubmitButton loading={isSubmitting} loadingText="Enviando…">
              Enviar link de recuperação
            </SubmitButton>

            {/* Fica aqui (e não na página) para sumir no estado de sucesso, que já tem esse botão. */}
            <p className="text-center text-sm text-muted-foreground">
              Lembrou a senha?{" "}
              <Link href="/login" className="font-medium text-primary-ink underline-offset-4 hover:underline">
                Voltar para o login
              </Link>
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}
