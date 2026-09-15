export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
}

export const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
];

export function formatCurrency(
  amount: number, 
  currencyCode: string = 'INR', 
  maximumFractionDigits?: number
): string {
  // If amount has decimal parts (e.g. 184.5 or 0.25), show 2 decimals accurately!
  const hasDecimals = Math.abs(amount % 1) > 0.001;
  const maxDigits = maximumFractionDigits !== undefined 
    ? maximumFractionDigits 
    : (hasDecimals ? 2 : 0);
  const minDigits = maximumFractionDigits !== undefined
    ? maximumFractionDigits
    : (hasDecimals ? 2 : 0);

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: maxDigits,
      minimumFractionDigits: minDigits,
    }).format(amount);
  } catch {
    const symbol = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode)?.symbol || currencyCode;
    return `${symbol} ${hasDecimals ? amount.toFixed(2) : amount.toLocaleString()}`;
  }
}

export function getCurrencySymbol(currencyCode: string): string {
  return SUPPORTED_CURRENCIES.find(c => c.code === currencyCode)?.symbol || currencyCode;
}
