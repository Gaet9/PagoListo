import type { NegocioListItem } from "@/lib/types/negocio";

/** Slug URL-safe a partir del nombre (sin garantía de unicidad). */
export function slugifyNombre(nombre: string): string {
  const base = nombre
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "tienda";
}

/**
 * Slug único por lista de negocios del usuario: si hay colisión de nombre
 * slugificado, se añade un sufijo corto del id.
 */
export function buildNegocioSlug(
  negocio: NegocioListItem,
  todos: NegocioListItem[],
): string {
  const base = slugifyNombre(negocio.nombre);
  const sameBase = todos.filter(
    (n) => slugifyNombre(n.nombre) === slugifyNombre(negocio.nombre),
  );
  if (sameBase.length > 1) {
    return `${base}-${negocio.id.slice(0, 8)}`;
  }
  return base;
}

export function resolveNegocioFromSlug(
  slug: string,
  todos: NegocioListItem[],
): NegocioListItem | null {
  for (const n of todos) {
    if (buildNegocioSlug(n, todos) === slug) return n;
  }
  return null;
}
