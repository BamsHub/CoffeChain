import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yjdauinnnilqjfwhytis.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqZGF1aW5ubmlscWpmd2h5dGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MjczMTEsImV4cCI6MjA4OTMwMzMxMX0.YCN-_xyGDBJ3tl-udY5d8m-thDX8BI41C344G11jvB4';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqZGF1aW5ubmlscWpmd2h5dGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MjczMTEsImV4cCI6MjA4OTMwMzMxMX0.YCN-_xyGDBJ3tl-udY5d8m-thDX8BI41C344G11jvB4';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[Supabase] Missing environment variables!');
}

// Client-side (anon key — respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side admin client (service role key — bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
});
