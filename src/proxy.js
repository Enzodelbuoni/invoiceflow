import { updateSession } from "@/lib/supabase/proxy"

// Proxy do Next.js 16 (antigo middleware): sessão do Supabase + proteção de rotas.
// A autorização também é conferida nas páginas e ações do servidor; o proxy é
// só a primeira barreira.
export async function proxy(request) {
  return updateSession(request)
}

export const config = {
  matcher: [
    // Tudo, menos arquivos estáticos e imagens.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
}
