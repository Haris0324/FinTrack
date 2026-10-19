/** Normalize only Bitcoin's case-insensitive Bech32 addresses. Base58 is case-sensitive. */
export function normalizeBitcoinMainnetAddress(address: string): string {
  const trimmed = address.trim();
  return trimmed.slice(0, 3).toLowerCase() === "bc1" ? trimmed.toLowerCase() : trimmed;
}
