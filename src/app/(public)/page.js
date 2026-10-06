import { isSupabaseConfigured } from "@/lib/supabase/env";

// Página inicial provisória (Sprint 1). A landing page completa vem em uma etapa posterior.
export default function Home() {
  const supabaseReady = isSupabaseConfigured();

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="flex max-w-xl flex-col items-center gap-6 text-center">
        <span className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
          Em construção · Fase 1
        </span>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          InvoiceFlow
        </h1>
        <p className="text-lg text-muted-foreground">
          Propostas comerciais e orçamentos profissionais para freelancers —
          com cálculo automático, link público e aprovação online.
        </p>
        {process.env.NODE_ENV === "development" && (
          <p className="text-sm text-muted-foreground">
            Supabase:{" "}
            <span
              className={
                supabaseReady ? "font-medium text-success" : "font-medium text-warning"
              }
            >
              {supabaseReady ? "configurado" : "não configurado (.env.local)"}
            </span>
          </p>
        )}
      </div>
    </main>
  );
}
