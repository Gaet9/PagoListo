/** Ligero: lo importa `lib/supabase/proxy` (bundle del proxy); no acoplar a `lib/utils` (tailwind-merge). */
export const hasEnvVars = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
