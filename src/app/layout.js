import { Geist_Mono, Inter, Instrument_Serif } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

// Interface: Inter (variável, números tabulares para valores em R$).
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

// Títulos de destaque: Instrument Serif (só existe no peso 400; não usar com font-bold).
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

// Códigos e identificadores (ex.: nº do orçamento).
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    default: "InvoiceFlow — Propostas e orçamentos profissionais",
    template: "%s · InvoiceFlow",
  },
  description:
    "Crie propostas comerciais e orçamentos profissionais, envie por link e acompanhe aprovações.",
};

export default function RootLayout({ children }) {
  return (
    // suppressHydrationWarning: o next-themes adiciona a classe do tema no <html>
    // antes da hidratação, então o atributo difere do HTML do servidor.
    <html
      lang="pt-BR"
      className={`${inter.variable} ${instrumentSerif.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
