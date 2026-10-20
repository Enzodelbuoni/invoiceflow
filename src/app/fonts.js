import { Geist_Mono, Inter, Instrument_Serif } from "next/font/google"

// Fontes do app, num módulo só: o layout raiz e o global-error.js (que
// substitui o layout raiz quando ele falha) usam as mesmas.

// Interface: Inter (variável, números tabulares para valores em R$).
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
})

// Títulos de destaque: Instrument Serif (só existe no peso 400; não usar com font-bold).
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
})

// Códigos e identificadores (ex.: nº do orçamento).
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

/** Classes que ligam as variáveis das fontes (vão no <html>). */
export const fontVariables = `${inter.variable} ${instrumentSerif.variable} ${geistMono.variable}`
