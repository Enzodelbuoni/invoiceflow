import { Providers } from "@/components/providers";
import { fontVariables } from "./fonts";
import "./globals.css";

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
      className={`${fontVariables} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
