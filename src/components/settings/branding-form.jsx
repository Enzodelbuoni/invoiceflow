"use client"

import { useRef, useState } from "react"
import { CheckIcon, ImageIcon, ImageUpIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { removeLogoAction, saveAccentAction, uploadLogoAction } from "@/actions/settings"
import { SubmitButton } from "@/components/auth/submit-button"
import { Eyebrow } from "@/components/quotes/quote-preview"
import { PaperPreview } from "@/components/settings/paper-preview"
import { FormSection } from "@/components/shared/form-fields"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ACCENT_PRESETS, accentInk, normalizeAccent, relativeLuminance } from "@/lib/accent"
import { runAction } from "@/lib/action-client"
import { LOGO_TYPES, checkLogoFile } from "@/lib/branding"
import { cn } from "@/lib/utils"

// O índigo do InvoiceFlow no papel (--primary do .theme-paper).
const DEFAULT_SWATCH = "oklch(0.511 0.23 268)"
const CUSTOM = "custom"
const RAINBOW = "conic-gradient(from 180deg, #ef4444, #f59e0b, #22c55e, #06b6d4, #6366f1, #d946ef, #ef4444)"

function InlineError({ children }) {
  if (!children) return null
  return (
    <p role="alert" className="text-sm text-destructive">
      {children}
    </p>
  )
}

/**
 * Logo: enviar (botão ou arrastar e soltar), trocar e remover. Cada ação vale
 * na hora (a imagem é regravada no servidor e as propostas já mostram).
 */
function LogoSection({ logoUrl, onLogoChange }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const [dragging, setDragging] = useState(false)

  async function send(file) {
    setError(null)
    const problem = checkLogoFile(file)
    if (problem) {
      setError(problem)
      return
    }
    const formData = new FormData()
    formData.append("logo", file)
    setBusy("upload")
    const result = await runAction(() => uploadLogoAction(formData))
    setBusy(null)
    if (!result.ok) {
      setError(result.message)
      return
    }
    onLogoChange(result.logoUrl)
    toast.success(logoUrl ? "Logo trocado" : "Logo adicionado", { description: "As propostas já mostram o logo novo." })
  }

  async function remove() {
    setError(null)
    setBusy("remove")
    const result = await runAction(() => removeLogoAction())
    setBusy(null)
    if (!result.ok) {
      setError(result.message)
      return
    }
    onLogoChange(null)
    toast.success("Logo removido", { description: "As propostas voltam a mostrar as iniciais." })
  }

  function onDrop(event) {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file && !busy) send(file)
  }

  return (
    <FormSection title="Logo" description="Aparece no topo das propostas, na página do cliente e no PDF.">
      <div className="flex flex-col gap-4 sm:col-span-2">
        {/* Área de soltar (o botão abaixo faz o mesmo pelo teclado). */}
        <div
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "relative flex h-32 items-center justify-center overflow-hidden rounded-xl border transition-colors",
            logoUrl ? "theme-paper bg-background" : "border-dashed bg-muted/40",
            dragging && "border-primary bg-primary/5 ring-3 ring-primary/20",
          )}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Logo atual" className="max-h-20 max-w-[70%] object-contain" />
          ) : (
            <p className="flex flex-col items-center gap-2 px-4 text-center text-sm text-muted-foreground">
              <ImageIcon aria-hidden="true" className="size-6" />
              {dragging ? "Solte a imagem aqui" : "Arraste uma imagem para cá ou use o botão abaixo"}
            </p>
          )}
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-background/80 text-sm font-medium backdrop-blur-[2px]">
              <Spinner aria-hidden="true" />
              {busy === "upload" ? "Enviando o logo…" : "Removendo…"}
            </div>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={LOGO_TYPES.join(",")}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = "" // escolher o mesmo arquivo de novo também dispara
            if (file) send(file)
          }}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" className="h-10" disabled={Boolean(busy)} onClick={() => inputRef.current?.click()}>
            <ImageUpIcon aria-hidden="true" />
            {logoUrl ? "Trocar logo" : "Enviar logo"}
          </Button>
          {logoUrl && (
            <Button type="button" variant="ghost" className="h-10 text-muted-foreground" disabled={Boolean(busy)} onClick={remove}>
              <Trash2Icon aria-hidden="true" />
              Remover
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          PNG, JPG ou WebP, até 2 MB. Fundo transparente fica melhor. Ajustamos o tamanho para a proposta.
        </p>
        <InlineError>{error}</InlineError>
      </div>
    </FormSection>
  )
}

/** Uma bolinha da paleta: rádio nativo (setas do teclado) escondido no rótulo. */
function Swatch({ value, label, background, checked, onSelect, darkCheck = false }) {
  return (
    <label
      title={label}
      style={{ background }}
      className={cn(
        // Borda sutil: sem ela, o preto some no cartão escuro (e o branco no claro).
        "relative flex size-9 cursor-pointer items-center justify-center rounded-full ring-1 ring-black/10 ring-inset transition-shadow dark:ring-white/25",
        "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring/60",
        checked && "shadow-[0_0_0_2px_var(--card),0_0_0_4px_var(--foreground)]",
      )}
    >
      <input type="radio" name="accent" value={value} checked={checked} onChange={onSelect} className="sr-only" />
      <span className="sr-only">{label}</span>
      {checked && <CheckIcon aria-hidden="true" className={cn("size-4", darkCheck ? "text-black" : "text-white")} />}
    </label>
  )
}

/** Cor de destaque: paleta pronta, o índigo do InvoiceFlow ou uma cor qualquer. */
function AccentSection({ choice, custom, onChoiceChange, onCustomChange, savedColor, onSaved }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const selected = choice === CUSTOM ? custom : choice || null
  const ink = selected ? accentInk(selected) : null
  const presetLabel = ACCENT_PRESETS.find((preset) => preset.value === choice)?.label

  async function onSubmit(event) {
    event.preventDefault()
    setError(null)
    setSaving(true)
    const result = await runAction(() => saveAccentAction({ accent_color: selected ?? "" }))
    setSaving(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    onSaved(selected)
    toast.success(
      "Cor salva",
      { description: selected ? "As propostas já usam a cor nova." : "As propostas voltam ao índigo do InvoiceFlow." },
    )
  }

  return (
    <form noValidate onSubmit={onSubmit} className="rounded-2xl border bg-card p-5 shadow-sm sm:p-8">
      <FormSection title="Cor de destaque" description="Faixa do topo, rótulos e iniciais do documento.">
        <fieldset className="flex flex-col gap-4 sm:col-span-2">
          <legend className="sr-only">Cor de destaque</legend>
          <div className="flex flex-wrap gap-3">
            <Swatch
              value=""
              label="Índigo do InvoiceFlow (padrão)"
              background={DEFAULT_SWATCH}
              checked={choice === ""}
              onSelect={() => onChoiceChange("")}
            />
            {ACCENT_PRESETS.map((preset) => (
              <Swatch
                key={preset.value}
                value={preset.value}
                label={preset.label}
                background={preset.value}
                checked={choice === preset.value}
                onSelect={() => onChoiceChange(preset.value)}
              />
            ))}
            <Swatch
              value={CUSTOM}
              label="Personalizada"
              background={choice === CUSTOM ? custom : RAINBOW}
              checked={choice === CUSTOM}
              darkCheck={choice === CUSTOM && relativeLuminance(custom) > 0.45}
              onSelect={() => onChoiceChange(CUSTOM)}
            />
          </div>

          <p className="text-sm">
            {choice === "" && "Índigo do InvoiceFlow (padrão)"}
            {presetLabel && `${presetLabel} · ${choice}`}
            {choice === CUSTOM && "Personalizada"}
          </p>

          {choice === CUSTOM && (
            <label className="flex w-fit items-center gap-3 text-sm">
              <input
                type="color"
                value={custom}
                onChange={(event) => onCustomChange(normalizeAccent(event.target.value) ?? custom)}
                className="h-10 w-14 cursor-pointer rounded-md border bg-background p-1"
              />
              <span className="flex flex-col">
                <span className="font-medium">Escolher a cor</span>
                <span className="font-mono text-xs text-muted-foreground">{custom}</span>
              </span>
            </label>
          )}

          {ink && ink !== selected && (
            <p className="flex items-start gap-2 text-sm text-pretty text-muted-foreground">
              <span aria-hidden="true" style={{ background: ink }} className="mt-0.5 size-4 shrink-0 rounded-full ring-1 ring-black/10" />
              Cor clara: nos textos e nas iniciais usamos este tom mais escuro dela, para que tudo fique legível.
            </p>
          )}
          <InlineError>{error}</InlineError>
        </fieldset>
      </FormSection>

      <div className="flex flex-col-reverse gap-2 border-t pt-6 sm:flex-row sm:items-center sm:justify-end">
        {selected !== savedColor && <p className="text-sm text-muted-foreground sm:mr-auto">Alteração ainda não salva.</p>}
        <SubmitButton loading={saving} loadingText="Salvando…" className="sm:w-auto sm:px-5">
          Salvar cor
        </SubmitButton>
      </div>
    </form>
  )
}

const initialChoice = (color) => (!color ? "" : ACCENT_PRESETS.some((preset) => preset.value === color) ? color : CUSTOM)

/**
 * Configurações → Identidade visual (etapa 39): logo e cor de destaque, com a
 * prévia do topo da proposta ao lado.
 * @param {{ issuer: object }} props o emitente atual (toIssuer), com logo_url e accent_color.
 */
export function BrandingForm({ issuer }) {
  const [logoUrl, setLogoUrl] = useState(issuer.logo_url)
  const [savedColor, setSavedColor] = useState(issuer.accent_color)
  const [choice, setChoice] = useState(initialChoice(issuer.accent_color))
  const [custom, setCustom] = useState(initialChoice(issuer.accent_color) === CUSTOM ? issuer.accent_color : "#0f766e")
  const selected = choice === CUSTOM ? custom : choice || null

  return (
    <div className="@container">
      <div className="grid items-start gap-8 @4xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-8">
            <LogoSection logoUrl={logoUrl} onLogoChange={setLogoUrl} />
          </div>
          <AccentSection
            choice={choice}
            custom={custom}
            onChoiceChange={setChoice}
            onCustomChange={setCustom}
            savedColor={savedColor}
            onSaved={setSavedColor}
          />
        </div>

        <PaperPreview
          issuer={{ ...issuer, logo_url: logoUrl, accent_color: selected }}
          footnote="O logo vale na hora; a cor, depois de salvar. Inclusive nas propostas já enviadas."
        >
          <div className="flex flex-col gap-1">
            <Eyebrow>Proposta comercial · Nº 2026-001</Eyebrow>
            <p className="font-display text-2xl leading-tight">Sua próxima proposta</p>
          </div>
          <div className="flex items-baseline justify-between border-t pt-3 text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-display text-xl tabular-nums">R$ 2.500,00</span>
          </div>
        </PaperPreview>
      </div>
    </div>
  )
}
