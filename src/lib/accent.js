// Cor de destaque do negócio (etapa 39). No documento ela vira a faixa do topo
// (`--primary`) e, para o que precisa ser lido (rótulos em versalete, iniciais
// em branco sobre a cor), um tom com contraste mínimo de 4,5:1 (`--primary-ink`,
// WCAG AA para texto pequeno). Se a cor escolhida é clara demais, o tom do
// texto é a mesma cor escurecida: os canais lineares são multiplicados pelo
// mesmo fator, o que mantém o matiz e só baixa a luminância.

/** Paleta pronta: todas já passam de 4,5:1 sem ajuste (conferido nos testes). */
export const ACCENT_PRESETS = Object.freeze([
  { value: "#1d4ed8", label: "Azul" },
  { value: "#0e7490", label: "Petróleo" },
  { value: "#0f766e", label: "Verde-azulado" },
  { value: "#15803d", label: "Verde" },
  { value: "#c2410c", label: "Laranja" },
  { value: "#b91c1c", label: "Vermelho" },
  { value: "#be185d", label: "Rosa" },
  { value: "#7e22ce", label: "Roxo" },
  { value: "#334155", label: "Grafite" },
  { value: "#18181b", label: "Preto" },
])

const HEX = /^#([0-9a-f]{6})$/i
const MIN_CONTRAST = 4.5
// Texto claro sobre a cor (iniciais): o `--primary-foreground` do papel,
// oklch(0.985 0 0) ≈ #fafafa — um pouco mais escuro que o branco, então é ele
// que limita o contraste.
const LIGHT_TEXT = "#fafafa"

/** "#0F766E" / "0f766e" → "#0f766e"; vazio ou inválido → null. */
export function normalizeAccent(value) {
  const text = String(value ?? "").trim()
  const match = HEX.exec(text.startsWith("#") ? text : `#${text}`)
  return match ? `#${match[1].toLowerCase()}` : null
}

const toLinear = (channel) => {
  const c = channel / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

const toChannel = (linear) => {
  const c = linear <= 0.0031308 ? linear * 12.92 : 1.055 * linear ** (1 / 2.4) - 0.055
  return Math.round(Math.min(1, Math.max(0, c)) * 255)
}

const channels = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))

const toHex = (rgb) => `#${rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`

/** Luminância relativa (WCAG 2.x) de "#rrggbb". */
export function relativeLuminance(hex) {
  const [r, g, b] = channels(hex).map(toLinear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Contraste WCAG entre duas cores "#rrggbb" (1 a 21). */
export function contrastRatio(a, b) {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

/**
 * Tom da cor para texto e para fundo de texto claro: a própria cor quando ela
 * já tem 4,5:1 contra o texto claro (e, portanto, contra o papel branco); senão
 * a cor escurecida até chegar lá.
 */
export function accentInk(hex) {
  if (contrastRatio(hex, LIGHT_TEXT) >= MIN_CONTRAST) return hex
  const linear = channels(hex).map(toLinear)
  const target = (relativeLuminance(LIGHT_TEXT) + 0.05) / MIN_CONTRAST - 0.05
  let factor = target / relativeLuminance(hex)
  // O arredondamento para 8 bits pode subir um pouco a luminância: desce aos poucos.
  for (;;) {
    const candidate = toHex(linear.map((c) => toChannel(c * factor)))
    if (contrastRatio(candidate, LIGHT_TEXT) >= MIN_CONTRAST) return candidate
    factor *= 0.98
  }
}

// Superfície mais clara do tema escuro onde aparece texto na cor (--muted,
// oklch(0.25 0.01 268) ≈ #22232a), com folga para os fundos tingidos (bg-primary/15).
const DARK_SURFACE = "#30323a"

/**
 * Tom da cor para texto no tema escuro: a própria cor quando já tem 4,5:1
 * contra as superfícies escuras; senão a cor clareada (misturada com branco
 * nos canais lineares) até chegar lá.
 */
export function accentInkOnDark(hex) {
  if (contrastRatio(hex, DARK_SURFACE) >= MIN_CONTRAST) return hex
  const linear = channels(hex).map(toLinear)
  for (let mix = 0.02; mix <= 1; mix += 0.02) {
    const candidate = toHex(linear.map((c) => toChannel(c + (1 - c) * mix)))
    if (contrastRatio(candidate, DARK_SURFACE) >= MIN_CONTRAST) return candidate
  }
  return "#ffffff"
}

/**
 * CSS da página do cliente (/quote/…) com a cor do negócio no lugar do índigo
 * do InvoiceFlow: botões (fundo com texto claro → tom escuro), textos e foco
 * (no tema escuro, o tom clareado). Vai num <style> da página porque os
 * diálogos (aprovar/recusar) abrem em portal, fora da moldura. O papel
 * (.theme-paper) tem as próprias variáveis e não é afetado.
 * `null` sem cor (fica o índigo).
 */
export function accentPageCss(accentColor) {
  const hex = normalizeAccent(accentColor)
  if (!hex) return null
  const ink = accentInk(hex)
  const inkDark = accentInkOnDark(ink)
  return (
    `:root{--primary:${ink};--primary-ink:${ink};--ring:${ink}}` +
    `:root.dark{--primary:${ink};--primary-ink:${inkDark};--ring:${inkDark}}`
  )
}

/**
 * Variáveis CSS do documento com a cor do negócio (ou `undefined`, para ficar
 * com o índigo do InvoiceFlow). Vão no `style` do papel (.theme-paper).
 */
export function accentStyle(accentColor) {
  const hex = normalizeAccent(accentColor)
  if (!hex) return undefined
  return { "--primary": hex, "--primary-ink": accentInk(hex) }
}
