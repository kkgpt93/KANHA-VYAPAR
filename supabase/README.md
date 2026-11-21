# Supabase Setup Guide (VyaparPOS)

1. Set the environment variables in `.env` (see `.env.example`):
   - `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY` (client auth & session)
   - `SUPABASE_URL` & `SUPABASE_ANON_KEY` (server-side JWT verification & RLS requests)
   - Optional: `SUPABASE_SERVICE_ROLE_KEY` (server-only, never prefix with `VITE_`)

2. Apply the schema & Row-Level Security (RLS) migration:
   - Option A (Supabase Dashboard): Paste `supabase/migrations/20261121000000_vyaparpos_rls_schema.sql` into **SQL Editor** and run.
   - Option B (Supabase CLI): Run `supabase db push` from the working directory.

3. Authentication Providers:
   - Email/Password works immediately out of the box.
   - To enable Google Sign-In, activate the Google provider inside **Supabase Dashboard -> Authentication -> Providers**.
