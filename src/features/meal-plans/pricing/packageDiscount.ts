const cents = (amount: number) => Math.round(amount * 100);
const isMoney = (amount: number) => Number.isFinite(amount) && amount >= 0 && amount <= 9999999999.99
  && Math.abs(amount * 100 - cents(amount)) < 0.0001;

export function discountError(regular: number, discounted?: number | null): string | undefined {
  if (!isMoney(regular) || regular <= 0) return 'Regular price must be positive, with at most two decimal places.';
  if (discounted == null) return undefined;
  if (!isMoney(discounted)) return 'Discounted price must be non-negative, with at most two decimal places.';
  if (cents(discounted) >= cents(regular)) return 'Discounted price must be lower than regular price.';
  return undefined;
}

export function discountPreview(regular: number, discounted?: number | null) {
  if (discounted == null || discountError(regular, discounted)) return undefined;
  const savings = cents(regular) - cents(discounted);
  return { savings: savings / 100, percentage: Math.round(savings / cents(regular) * 100) };
}
