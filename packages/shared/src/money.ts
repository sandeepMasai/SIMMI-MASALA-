/** All monetary amounts in the platform are integer paise (1 INR = 100 paise). */

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export function formatINR(paise: number, locale = 'en-IN'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(paiseToRupees(paise));
}

export function applyPercentageDiscount(amountPaise: number, percent: number): number {
  if (percent <= 0) return 0;
  return Math.min(amountPaise, Math.round((amountPaise * percent) / 100));
}

export function clampDiscount(discountPaise: number, maxPaise?: number | null): number {
  if (maxPaise == null) return Math.max(0, discountPaise);
  return Math.max(0, Math.min(discountPaise, maxPaise));
}
