import { createClient } from '@supabase/supabase-js';

// Lazy singletons — dibuat saat pertama kali diakses, bukan saat build
let _supabase = null;
let _supabaseAdmin = null;

function getSupabaseUrl() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is not set');
    return url;
}

function getAnonKey() {
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!key) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is not set');
    return key;
}

// Client-side (anon key — respects RLS)
export function getSupabase() {
    if (!_supabase) _supabase = createClient(getSupabaseUrl(), getAnonKey());
    return _supabase;
}

// Server-side admin client (service role key — bypasses RLS)
export function getSupabaseAdmin() {
    if (!_supabaseAdmin) {
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
        _supabaseAdmin = createClient(getSupabaseUrl(), serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });
    }
    return _supabaseAdmin;
}

// Named exports untuk backward compatibility
export const supabase = new Proxy({}, { get: (_, prop) => getSupabase()[prop] });
export const supabaseAdmin = new Proxy({}, { get: (_, prop) => getSupabaseAdmin()[prop] });
