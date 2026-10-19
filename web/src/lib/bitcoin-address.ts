import { createHash } from "node:crypto";

function decodeBase58(value: string): number[] | null {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let decoded = BigInt(0);
  for (const char of value) {
    const digit = alphabet.indexOf(char);
    if (digit < 0) return null;
    decoded = decoded * BigInt(58) + BigInt(digit);
  }

  const bytes: number[] = [];
  while (decoded > BigInt(0)) {
    bytes.unshift(Number(decoded & BigInt(255)));
    decoded >>= BigInt(8);
  }
  for (const char of value) {
    if (char !== "1") break;
    bytes.unshift(0);
  }
  return bytes;
}

function isValidBase58BitcoinAddress(address: string): boolean {
  if (address.length < 26 || address.length > 35) return false;
  const decoded = decodeBase58(address);
  if (!decoded || decoded.length !== 25 || (decoded[0] !== 0 && decoded[0] !== 5)) return false;

  const payload = Buffer.from(decoded.slice(0, 21));
  const checksum = createHash("sha256").update(createHash("sha256").update(payload).digest()).digest();
  return checksum.subarray(0, 4).equals(Buffer.from(decoded.slice(21)));
}

function bech32Polymod(values: number[]): number {
  const generators = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let checksum = 1;
  for (const value of values) {
    const top = checksum >>> 25;
    checksum = ((checksum & 0x1ffffff) << 5) ^ value;
    for (let index = 0; index < generators.length; index += 1) {
      if ((top >>> index) & 1) checksum ^= generators[index];
    }
  }
  return checksum >>> 0;
}

function isValidSegwitBitcoinAddress(address: string): boolean {
  if (address.length < 14 || address.length > 90) return false;
  const normalized = address.toLowerCase();
  if (address !== normalized && address !== address.toUpperCase()) return false;
  const separator = normalized.lastIndexOf("1");
  if (separator < 1 || separator + 7 > normalized.length || normalized.slice(0, separator) !== "bc") return false;

  const alphabet = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
  const values: number[] = [];
  for (const char of normalized.slice(separator + 1)) {
    const value = alphabet.indexOf(char);
    if (value < 0) return false;
    values.push(value);
  }
  if (values.length < 7) return false;

  const version = values[0];
  // FinTrack supports SegWit v0 and Taproot v1 destinations. Future witness
  // versions need explicit protocol and wallet support before we accept them.
  if (version > 1) return false;
  const checksum = bech32Polymod([
    ...Array.from(normalized.slice(0, separator), (char) => char.charCodeAt(0) >> 5),
    0,
    ...Array.from(normalized.slice(0, separator), (char) => char.charCodeAt(0) & 31),
    ...values,
  ]);
  const expectedChecksum = version === 0 ? 1 : 0x2bc830a3;
  if (checksum !== expectedChecksum) return false;

  const payload = values.slice(1, -6);
  if (payload.length < 1) return false;
  const bitValues = payload.flatMap((value) => Array.from({ length: 5 }, (_, index) => (value >>> (4 - index)) & 1));
  const byteLength = Math.floor(bitValues.length / 8);
  if (bitValues.length % 8 >= 5) return false;
  if (bitValues.slice(byteLength * 8).some((bit) => bit !== 0)) return false;
  if (byteLength < 2 || byteLength > 40) return false;
  if (version === 0 && byteLength !== 20 && byteLength !== 32) return false;
  if (version === 1 && byteLength !== 32) return false;
  return true;
}

export function isValidBitcoinMainnetAddress(address: string): boolean {
  const value = address.trim();
  return value.length <= 100 && (isValidBase58BitcoinAddress(value) || isValidSegwitBitcoinAddress(value));
}
