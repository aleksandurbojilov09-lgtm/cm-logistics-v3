import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
    import.meta.env.VITE_SUPABASE_URL;

const supabasePublishableKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
    throw new Error(
        "K3 Logistics: VITE_SUPABASE_URL is missing."
    );
}

if (!supabasePublishableKey) {
    throw new Error(
        "K3 Logistics: VITE_SUPABASE_PUBLISHABLE_KEY is missing."
    );
}

export const supabase = createClient(
    supabaseUrl,
    supabasePublishableKey,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    }
);
