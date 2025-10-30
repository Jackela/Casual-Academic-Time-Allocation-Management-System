export function hasAtMostDecimalPlaces(value: number | string, maxDecimals: number): boolean {
  if (!Number.isFinite(Number(value))) {
    return false;
  }

  const normalized = typeof value === 'number' ? value.toString() : value;
  const [, fraction] = normalized.split('.');
  if (!fraction) {
    return true;
  }

  return fraction.length <= maxDecimals;
}
