export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const supabaseConfigurado = Boolean(supabaseUrl && supabaseKey);

// Sem as chaves do Supabase, o site usa o banco local (pasta local/).
// Vale só no computador de desenvolvimento, nunca no site publicado.
export const modoLocal =
  !supabaseConfigurado && process.env.NODE_ENV !== "production";
