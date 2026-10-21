import { describe, expect, it } from "vitest"

import {
  ACCENT_PRESETS,
  accentInk,
  accentInkOnDark,
  accentPageCss,
  accentStyle,
  contrastRatio,
  normalizeAccent,
  relativeLuminance,
} from "./accent"

describe("normalizeAccent", () => {
  it.each([
    ["#0F766E", "#0f766e"],
    ["0f766e", "#0f766e"],
    ["  #abcdef ", "#abcdef"],
    ["#abc", null],
    ["red", null],
    ["", null],
    [null, null],
  ])("%j → %j", (value, expected) => {
    expect(normalizeAccent(value)).toBe(expected)
  })
})

describe("contraste (WCAG)", () => {
  it("valores de referência", () => {
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5)
    expect(relativeLuminance("#000000")).toBe(0)
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5)
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5)
    // Azul-700 do Tailwind sobre branco: 6,70:1 (calculadoras do WebAIM).
    expect(contrastRatio("#1d4ed8", "#ffffff")).toBeCloseTo(6.7, 1)
  })
})

describe("accentInk", () => {
  it("cor escura o bastante fica como está", () => {
    expect(accentInk("#1d4ed8")).toBe("#1d4ed8")
    expect(accentInk("#000000")).toBe("#000000")
  })

  it.each(["#facc15", "#22d3ee", "#ffffff", "#f472b6", "#a3e635", "#ff0000"])(
    "cor clara (%s) escurece até 4,5:1 contra o texto claro e o papel",
    (hex) => {
      const ink = accentInk(hex)
      expect(ink).toMatch(/^#[0-9a-f]{6}$/)
      expect(contrastRatio(ink, "#fafafa")).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(ink, "#ffffff")).toBeGreaterThanOrEqual(4.5)
      // Sem escurecer demais: perto do limite, não preto.
      expect(contrastRatio(ink, "#fafafa")).toBeLessThan(5)
    },
  )

  it("mantém o matiz (amarelo continua amarelado, não cinza)", () => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(accentInk("#facc15").slice(i, i + 2), 16))
    expect(r).toBeGreaterThan(b * 2)
    expect(g).toBeGreaterThan(b * 2)
  })

  it("toda a paleta pronta já passa de 4,5:1 sem ajuste", () => {
    for (const { value } of ACCENT_PRESETS) {
      expect(accentInk(value)).toBe(value)
      expect(contrastRatio(value, "#fafafa")).toBeGreaterThanOrEqual(4.5)
    }
    expect(new Set(ACCENT_PRESETS.map((preset) => preset.value)).size).toBe(ACCENT_PRESETS.length)
  })
})

describe("accentInkOnDark (texto no tema escuro)", () => {
  it.each(["#0f766e", "#1d4ed8", "#18181b", "#b91c1c", "#facc15"])("%s fica legível nas superfícies escuras", (hex) => {
    const ink = accentInkOnDark(hex)
    expect(contrastRatio(ink, "#30323a")).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(ink, "#22232a")).toBeGreaterThanOrEqual(4.5)
  })

  it("cor que já é clara fica como está", () => {
    expect(accentInkOnDark("#facc15")).toBe("#facc15")
  })
})

describe("accentPageCss (página do cliente)", () => {
  it("sem cor: null (fica o índigo)", () => {
    expect(accentPageCss(null)).toBeNull()
    expect(accentPageCss("</style><script>")).toBeNull()
  })

  it("botões no tom escuro (texto claro legível) e textos claros no tema escuro", () => {
    const css = accentPageCss("#FACC15")
    const ink = accentInk("#facc15")
    expect(css).toContain(`:root{--primary:${ink};--primary-ink:${ink};--ring:${ink}}`)
    expect(css).toContain(`:root.dark{--primary:${ink};--primary-ink:${accentInkOnDark(ink)};`)
    expect(contrastRatio(ink, "#fafafa")).toBeGreaterThanOrEqual(4.5)
    // Só cores hex no CSS (nada que feche a tag <style>).
    expect(css).toMatch(/^[:a-z.{}\-;#0-9]+$/)
  })
})

describe("accentStyle", () => {
  it("sem cor: undefined (fica o índigo do InvoiceFlow)", () => {
    expect(accentStyle(null)).toBeUndefined()
    expect(accentStyle("nada")).toBeUndefined()
  })

  it("com cor: a faixa usa a cor e o texto o tom legível", () => {
    expect(accentStyle("#0F766E")).toEqual({ "--primary": "#0f766e", "--primary-ink": "#0f766e" })
    const light = accentStyle("#facc15")
    expect(light["--primary"]).toBe("#facc15")
    expect(light["--primary-ink"]).not.toBe("#facc15")
  })
})
