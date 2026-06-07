import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

if (!isSupabaseConfigured) {
  console.error(
    "Supabase not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY",
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseKey!)
  : (new Proxy(
      {},
      {
        get(_, prop) {
          return () =>
            Promise.reject(
              new Error("Supabase is not configured — missing env vars"),
            );
        },
      },
    ) as ReturnType<typeof createClient>);
