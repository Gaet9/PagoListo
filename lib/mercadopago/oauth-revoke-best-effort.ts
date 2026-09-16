/** Best-effort MP app deauthorization (optional; unlink always clears DB). */
export async function revokeMercadoPagoAuthorizationBestEffort(input: {
  accessToken: string;
  mpUserId: number | null;
  clientId: string;
}): Promise<boolean> {
  if (!input.clientId.trim()) return false;
  if (input.mpUserId === null || !Number.isFinite(input.mpUserId)) {
    return false;
  }

  const url = `https://api.mercadopago.com/users/${input.mpUserId}/applications/${encodeURIComponent(input.clientId.trim())}`;
  try {
    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        Accept: "application/json",
      },
    });
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}
