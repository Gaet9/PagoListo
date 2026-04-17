import type { SupabaseClient } from "@supabase/supabase-js";

export type UsuarioPerfil = {
  id: string;
  email: string;
  nombre: string;
  apellido: string | null;
};

export async function getUsuarioPerfil(client: SupabaseClient, userId: string) {
  return client
    .from("usuarios")
    .select("id, email, nombre, apellido")
    .eq("id", userId)
    .single<UsuarioPerfil>();
}

export type UpdateUsuarioPerfilInput = {
  id: string;
  nombre: string;
  apellido: string | null;
};

export async function updateUsuarioPerfil(
  client: SupabaseClient,
  input: UpdateUsuarioPerfilInput,
) {
  return client
    .from("usuarios")
    .update({
      nombre: input.nombre.trim(),
      apellido: input.apellido?.trim() || null,
    })
    .eq("id", input.id)
    .select("id, email, nombre, apellido")
    .single<UsuarioPerfil>();
}

