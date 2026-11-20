import type { Coupon, Locale, Role, SiteSettings } from '../types/domain';

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function toLocaleDigits(input: string, locale: Locale): string {
  if (locale !== 'bn') return input;
  return input.replace(/\d/g, (d) => BENGALI_DIGITS[Number(d)] ?? d);
}

/**
 * Formats an integer paisa value into Bangladesh Taka (৳).
 * Never uses floating-point arithmetic for currency storage.
 */
export function formatBDT(paisa: number, locale: Locale = 'bn'): string {
  const safePaisa = Math.trunc(paisa);
  const sign = safePaisa < 0 ? '-' : '';
  const absPaisa = Math.abs(safePaisa);
  const taka = Math.floor(absPaisa / 100);
  const remPaisa = absPaisa % 100;

  const formattedTaka = new Intl.NumberFormat('en-IN').format(taka);
  const decimalPart = remPaisa > 0 ? `.${String(remPaisa).padStart(2, '0')}` : '';
  const raw = `${sign}৳${formattedTaka}${decimalPart}`;
  return toLocaleDigits(raw, locale);
}

export function formatNumber(value: number, locale: Locale = 'bn'): string {
  const formatted = new Intl.NumberFormat('en-IN').format(Math.trunc(value));
  return toLocaleDigits(formatted, locale);
}

export function formatPV(pv: number, locale: Locale = 'bn'): string {
  return `${formatNumber(pv, locale)} PV`;
}

export function isMemberPricingEligible(role: Role, kycApproved: boolean): boolean {
  if (role === 'DEALER' || role === 'ADMIN' || role === 'SUPER_ADMIN') return true;
  if (role === 'MEMBER') return kycApproved;
  return false;
}

export function calculateDeliveryChargePaisa(
  district: string,
  subtotalAfterDiscountPaisa: number,
  settings: SiteSettings
): number {
  if (subtotalAfterDiscountPaisa >= settings.freeDeliveryThresholdPaisa) {
    return 0;
  }
  const normalized = district.trim().toLowerCase();
  if (normalized === 'dhaka') return settings.deliveryInsideDhakaPaisa;
  if (normalized === 'kishoreganj') return settings.deliveryKishoreganjPaisa;
  return settings.deliveryOutsideDhakaPaisa;
}

export function calculateCouponDiscountPaisa(
  subtotalPaisa: number,
  coupon: Coupon | null
): number {
  if (!coupon || !coupon.active) return 0;
  if (subtotalPaisa < coupon.minOrderPaisa) return 0;
  if (coupon.type === 'FLAT') {
    return Math.min(subtotalPaisa, Math.trunc(coupon.value));
  }
  // Integer-safe percentage calculation (rounded down to integer paisa)
  return Math.floor((subtotalPaisa * Math.trunc(coupon.value)) / 100);
}

export function calculatePercentagePaisa(amountPaisa: number, percent: number): number {
  return Math.floor((Math.trunc(amountPaisa) * Math.trunc(percent)) / 100);
}

export function deriveWalletBalancePaisa(entries: Array<{ amountPaisa: number }>): number {
  return entries.reduce((sum, entry) => sum + Math.trunc(entry.amountPaisa), 0);
}
