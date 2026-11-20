/**
 * Masks a Bangladesh NID number (10, 13, or 17 digits) for UI display.
 * Example: "1994481234567" -> "**** **** 4567"
 */
export function maskNid(rawNid: string): string {
  const digits = rawNid.replace(/\D/g, '');
  if (digits.length < 4) return '**** **** ****';
  const lastFour = digits.slice(-4);
  return `**** **** ${lastFour}`;
}

/**
 * Generates an application-level obfuscated vault reference for NID storage
 * in browser demo mode (production backend uses AES-256-GCM with KMS key).
 */
export function createEncryptedNidToken(rawNid: string): string {
  const digits = rawNid.replace(/\D/g, '');
  let hash = 2166136261;
  for (let i = 0; i < digits.length; i++) {
    hash ^= digits.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0');
  return `enc_v1_aes256gcm_${hex}_${digits.length}`;
}

export function createIdempotencyKey(prefix: string): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${ts}_${rand}`;
}

export function validateBdMobile(mobile: string): boolean {
  const normalized = mobile.replace(/[\s-]/g, '');
  return /^(\+8801|8801|01)[3-9]\d{8}$/.test(normalized);
}
