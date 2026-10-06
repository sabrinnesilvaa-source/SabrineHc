import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseKey, supabaseUrl } from "./config";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Chamado a partir de um Server Component: os cookies são
          // renovados pelo proxy.ts, então pode ser ignorado aqui.
        }
      },
    },
  });
}
