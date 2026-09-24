import "server-only";

import { cookies } from "next/headers";

import {
  ACTIVE_NEGOCIO_COOKIE_NAME,
  readActiveNegocioIdFromCookieValue,
} from "@/lib/negocio/active-negocio-context";

export async function readActiveNegocioIdFromRequestCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return readActiveNegocioIdFromCookieValue(cookieStore.get(ACTIVE_NEGOCIO_COOKIE_NAME)?.value);
}
