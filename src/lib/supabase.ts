import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function hasConfiguredUrl(value?: string): boolean {
  if (!value?.trim()) return false;
  return value.trim() !== "https://your-project.supabase.co";
}

function hasConfiguredKey(value?: string): boolean {
  if (!value?.trim()) return false;
  return value.trim() !== "your_publishable_key";
}

export const isSupabaseConfigured = hasConfiguredUrl(supabaseUrl) && hasConfiguredKey(supabaseKey);

if (!isSupabaseConfigured) {
  console.error(
    "Supabase not configured: set real VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY values",
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
