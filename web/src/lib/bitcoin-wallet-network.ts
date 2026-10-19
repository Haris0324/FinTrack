export function isBitcoinMainnetChain(value: unknown): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const chain = value as Record<string, unknown>;
  const hasEnum = chain.enum !== undefined;
  const hasNetwork = chain.network !== undefined;
  if (hasEnum && chain.enum !== "BITCOIN_MAINNET") return false;
  if (hasNetwork && chain.network !== "livenet") return false;
  return chain.enum === "BITCOIN_MAINNET" || chain.network === "livenet";
}
