import { createClient } from "@supabase/supabase-js";

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL     as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[KooraPlays] Supabase env vars are not set. " +
    "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable live stream config. " +
    "See .env.example for reference."
  );
}

export const supabase = createClient(
  supabaseUrl  ?? "https://placeholder.supabase.co",
  supabaseAnonKey ?? "placeholder-anon-key",
);

export interface StreamConfig {
  id: number;
  stream_url: string;
  title: string;
  channel_name: string | null;
  channel_logo: string | null;
  language: string | null;
  updated_at: string;
}
