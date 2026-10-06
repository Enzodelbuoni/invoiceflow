import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./env";

// Cliente Supabase para Server Components, Server Actions e Route Handlers.
// Deve ser criado a cada requisição — nunca reutilizar entre requisições.
export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseEnv();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Em Server Components os cookies são somente leitura.
          // A renovação da sessão fica a cargo do proxy (src/proxy.js).
        }
      },
    },
  });
}
