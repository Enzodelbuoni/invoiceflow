import { cookies } from "next/headers"

import { AppHeader } from "@/components/layout/app-header"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { requireUser } from "@/lib/auth/server"

export default async function DashboardLayout({ children }) {
  // O proxy já barra quem não está logado; conferir aqui de novo é a segunda barreira.
  const user = await requireUser()

  // A sidebar salva aberta/recolhida no cookie "sidebar_state"; lendo aqui,
  // o servidor já renderiza no estado certo e não há "pulo" na hidratação.
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false"

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Pular para o conteúdo
      </a>
      <AppSidebar user={{ name: user.name, email: user.email }} />
      {/* overflow-clip (e não hidden): corta o que transborda sem virar contêiner de
          rolagem; com hidden, o cabeçalho e a barra do construtor (sticky) não
          grudavam no celular, onde quem rola é a página. */}
      <SidebarInset className="overflow-clip md:peer-data-[variant=inset]:h-[calc(100svh-1rem)] md:peer-data-[variant=inset]:shadow-md md:peer-data-[variant=inset]:ring-1 md:peer-data-[variant=inset]:ring-sidebar-border">
        {/* No desktop o painel rola por dentro (cabeçalho fixo no topo do painel);
            no mobile quem rola é a página. scroll-pt: o que o navegador ou o Next
            rolam até a vista (página nova, campo focado) para abaixo do cabeçalho. */}
        <div className="relative flex flex-1 flex-col md:scroll-pt-16 md:overflow-y-auto md:has-[[data-quote-bar]]:scroll-pb-24">
          {/* Brilho sutil da marca no topo do painel. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-72 print:hidden bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_oklch,var(--primary)_9%,transparent),transparent)]"
          />
          <AppHeader />
          <main id="conteudo" tabIndex={-1} className="relative w-full flex-1 outline-none">
            <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-10 print:max-w-none print:p-0!">{children}</div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
