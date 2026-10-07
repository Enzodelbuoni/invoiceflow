"use client"

import { Controller, useWatch } from "react-hook-form"

import { CurrencyInput } from "@/components/shared/currency-input"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { charLength } from "@/lib/validations/text"

// Peças dos formulários de cadastro (clientes, serviços…), todas ligadas ao
// React Hook Form pelo `form` (retorno do useForm). Cada campo liga o erro e a
// dica ao input por aria-describedby e marca aria-invalid.

/** Seção visual do formulário: título + descrição à esquerda, campos à direita. */
export function FormSection({ title, description, children }) {
  return (
    <section className="grid gap-6 border-t py-8 first:border-t-0 first:pt-0 md:grid-cols-[minmax(0,14rem)_1fr] md:gap-10">
      <div className="flex flex-col gap-1">
        <h2 className="font-medium">{title}</h2>
        <p className="text-sm text-pretty text-muted-foreground">{description}</p>
      </div>
      <div className="grid content-start gap-5 sm:grid-cols-2">{children}</div>
    </section>
  )
}

/** Estado de acessibilidade comum: erro do campo e ids da dica/erro. */
function useFieldState(form, name, hint) {
  const error = form.formState.errors[name]
  const describedBy = [hint && !error && `${name}-hint`, error && `${name}-error`].filter(Boolean).join(" ") || undefined
  return { error, describedBy }
}

function FieldShell({ name, label, hint, required, error, className, children, aside }) {
  return (
    <Field data-invalid={!!error} className={className}>
      <FieldLabel htmlFor={name}>
        {label}
        {required && (
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        )}
      </FieldLabel>
      {children}
      {aside ? (
        // Dica e contador na mesma linha (o FieldDescription perde o ajuste de
        // margem que o shadcn aplica pela posição entre os irmãos).
        <div className="flex items-start justify-between gap-3">
          {hint && !error ? (
            <FieldDescription id={`${name}-hint`} className="nth-last-2:mt-0">
              {hint}
            </FieldDescription>
          ) : (
            <span />
          )}
          {aside}
        </div>
      ) : (
        hint && !error && <FieldDescription id={`${name}-hint`}>{hint}</FieldDescription>
      )}
      <FieldError id={`${name}-error`} errors={[error]} />
    </Field>
  )
}

/** Campo de texto com máscara opcional (`mask(texto) → texto`). */
export function TextField({ form, name, label, hint, mask, className, required, ...inputProps }) {
  const { error, describedBy } = useFieldState(form, name, hint)
  const registration = form.register(name)
  // A máscara é aplicada no próprio evento, ANTES de o RHF ler o valor. (Usar
  // setValue dentro do onChange faz o RHF pular a revalidação daquele campo.)
  const onChange = mask
    ? (event) => {
        event.target.value = mask(event.target.value)
        return registration.onChange(event)
      }
    : registration.onChange

  return (
    <FieldShell name={name} label={label} hint={hint} required={required} error={error} className={className}>
      <Input
        id={name}
        className="h-10"
        aria-invalid={!!error}
        aria-required={required || undefined}
        aria-describedby={describedBy}
        {...inputProps}
        {...registration}
        onChange={onChange}
      />
    </FieldShell>
  )
}

/** Contador "120 / 1000" (conta como o Postgres); fica vermelho ao passar do limite. */
function CharacterCount({ control, name, max }) {
  const value = useWatch({ control, name }) ?? ""
  const count = charLength(value)
  const over = count > max
  return (
    <span aria-hidden="true" className={cn("shrink-0 text-xs tabular-nums text-muted-foreground", over && "text-destructive")}>
      {count.toLocaleString("pt-BR")} / {max.toLocaleString("pt-BR")}
    </span>
  )
}

/** Texto longo; com `maxLength`, mostra um contador (sem bloquear a digitação). */
export function TextareaField({ form, name, label, hint, maxLength, className, required, ...textareaProps }) {
  const { error, describedBy } = useFieldState(form, name, hint)
  return (
    <FieldShell
      name={name}
      label={label}
      hint={hint}
      required={required}
      error={error}
      className={className}
      aside={maxLength ? <CharacterCount control={form.control} name={name} max={maxLength} /> : null}
    >
      <Textarea
        id={name}
        aria-invalid={!!error}
        aria-required={required || undefined}
        aria-describedby={describedBy}
        {...textareaProps}
        {...form.register(name)}
      />
    </FieldShell>
  )
}

/** Seletor (Radix) com `options: [{ value, label }]`. */
export function SelectField({ form, name, label, hint, options, placeholder, className, required }) {
  const { error, describedBy } = useFieldState(form, name, hint)
  return (
    <FieldShell name={name} label={label} hint={hint} required={required} error={error} className={className}>
      <Controller
        control={form.control}
        name={name}
        render={({ field }) => (
          <Select name={field.name} value={field.value} onValueChange={field.onChange}>
            <SelectTrigger
              id={name}
              ref={field.ref}
              onBlur={field.onBlur}
              className="w-full data-[size=default]:h-10"
              aria-invalid={!!error}
              aria-required={required || undefined}
              aria-describedby={describedBy}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </FieldShell>
  )
}

/** Valor em reais (texto "1.500,00"; o schema converte para centavos). */
export function CurrencyField({ form, name, label, hint, maxIntegerDigits, className, required, ...inputProps }) {
  const { error, describedBy } = useFieldState(form, name, hint)
  return (
    <FieldShell name={name} label={label} hint={hint} required={required} error={error} className={className}>
      <CurrencyInput
        id={name}
        registration={form.register(name)}
        maxIntegerDigits={maxIntegerDigits}
        aria-invalid={!!error}
        aria-required={required || undefined}
        aria-describedby={describedBy}
        {...inputProps}
      />
    </FieldShell>
  )
}
