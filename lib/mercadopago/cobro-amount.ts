export function roundMoneyArs(n: number): number {
  return Math.round(n * 100) / 100;
}

function toCentavos(n: number): number {
  return Math.round(roundMoneyArs(n) * 100);
}

export function mercadoPagoAmountsMatch(expectedArs: number, paidAmount: number, toleranceCentavos = 1): boolean {
  if (!Number.isFinite(expectedArs) || !Number.isFinite(paidAmount)) return false;
  return Math.abs(toCentavos(expectedArs) - toCentavos(paidAmount)) <= toleranceCentavos;
}
