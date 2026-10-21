import { IssuerIdentity } from "@/components/quotes/quote-preview"
import { accentStyle } from "@/lib/accent"

/**
 * Prévia "Como aparece na proposta" das Configurações: o topo do documento num
 * papel sempre claro, com a cor de destaque e o logo do emitente.
 * @param {{ issuer: object, children?: React.ReactNode, footnote: React.ReactNode }} props
 *   `children`: o que vem abaixo do emitente no papel (ex.: título de exemplo).
 */
export function PaperPreview({ issuer, children, footnote }) {
  return (
    <aside aria-labelledby="paper-preview-title" className="flex flex-col gap-3 @4xl:sticky @4xl:top-20">
      <h2 id="paper-preview-title" className="text-sm font-medium">
        Como aparece na proposta
      </h2>
      <div style={accentStyle(issuer.accent_color)} className="theme-paper overflow-hidden rounded-md shadow-lg ring-1 ring-black/5">
        <div aria-hidden="true" className="h-1.5 bg-primary" />
        <div className="flex flex-col gap-5 p-5">
          <IssuerIdentity issuer={issuer} />
          {children}
        </div>
      </div>
      <p className="text-xs text-pretty text-muted-foreground">{footnote}</p>
    </aside>
  )
}
