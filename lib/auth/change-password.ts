import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Comprueba la contraseña actual reautenticando con email + password (Supabase Auth).
 * No escribe en `public.usuarios`: el hash vive solo en `auth.users`.
 */
export async function verifyCurrentPassword(
  client: SupabaseClient,
  email: string,
  currentPassword: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password: currentPassword,
  });
  if (error) {
    const raw = error.message.toLowerCase();
    if (raw.includes("invalid") && (raw.includes("credential") || raw.includes("login"))) {
      return { ok: false, message: "La contraseña actual no es correcta." };
    }
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

/** Actualiza la contraseña de la sesión actual (tras verificar la anterior). */
export async function updateSessionPassword(
  client: SupabaseClient,
  newPassword: string,
): Promise<{ error: { message: string } | null }> {
  const { error } = await client.auth.updateUser({ password: newPassword });
  return { error: error ? { message: error.message } : null };
}
