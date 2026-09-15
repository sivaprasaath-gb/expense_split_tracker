import { TransactionType, PaymentMethod } from '../types';

export interface ParsedExpenseResult {
  title: string;
  amount: number;
  type: TransactionType;
  category: string;
  paymentMethod: PaymentMethod;
  date: string;
  note?: string;
}

export function parseExpenseFromText(input: string): ParsedExpenseResult {
  const text = input.trim();
  const lower = text.toLowerCase();

  // 1. Detect Type
  const isIncome =
    lower.includes('credit') ||
    lower.includes('received') ||
    lower.includes('salary') ||
    lower.includes('refund') ||
    lower.includes('cashback') ||
    lower.includes('got');

  const type: TransactionType = isIncome ? 'income' : 'expense';

  // 2. Extract Amount
  // Matches: ₹1234, Rs. 1234, INR 1234, $1234, 1234.50, "for 500", "paid 400"
  let amount = 0;
  const amountMatch =
    text.match(/(?:rs\.?|inr|₹|\$|€|£)?\s*(\d+(?:,\d+)*(?:\.\d{1,2})?)/i) ||
    text.match(/(\d+(?:\.\d{1,2})?)/);

  if (amountMatch) {
    const rawVal = amountMatch[1].replace(/,/g, '');
    const parsed = parseFloat(rawVal);
    if (!isNaN(parsed) && parsed > 0) {
      amount = parsed;
    }
  }

  // 3. Detect Payment Method
  let paymentMethod: PaymentMethod = 'Other';
  if (lower.includes('upi') || lower.includes('gpay') || lower.includes('phonepe') || lower.includes('paytm')) {
    paymentMethod = 'UPI';
  } else if (lower.includes('card') || lower.includes('visa') || lower.includes('mastercard') || lower.includes('credit')) {
    paymentMethod = 'Card';
  } else if (lower.includes('cash')) {
    paymentMethod = 'Cash';
  } else if (lower.includes('netbanking') || lower.includes('neft') || lower.includes('imps') || lower.includes('bank')) {
    paymentMethod = 'NetBanking';
  }

  // 4. Detect Category
  let category = 'other';
  if (isIncome || lower.includes('salary') || lower.includes('freelance') || lower.includes('dividend')) {
    category = 'salary';
  } else if (
    lower.includes('swiggy') ||
    lower.includes('zomato') ||
    lower.includes('restaurant') ||
    lower.includes('dinner') ||
    lower.includes('lunch') ||
    lower.includes('coffee') ||
    lower.includes('cafe') ||
    lower.includes('food') ||
    lower.includes('burger') ||
    lower.includes('pizza') ||
    lower.includes('starbucks')
  ) {
    category = 'food';
  } else if (
    lower.includes('grocery') ||
    lower.includes('groceries') ||
    lower.includes('blinkit') ||
    lower.includes('zepto') ||
    lower.includes('instamart') ||
    lower.includes('supermarket') ||
    lower.includes('vegetables') ||
    lower.includes('milk')
  ) {
    category = 'groceries';
  } else if (
    lower.includes('uber') ||
    lower.includes('ola') ||
    lower.includes('rapido') ||
    lower.includes('fuel') ||
    lower.includes('petrol') ||
    lower.includes('diesel') ||
    lower.includes('cab') ||
    lower.includes('metro') ||
    lower.includes('flight') ||
    lower.includes('train') ||
    lower.includes('toll')
  ) {
    category = 'transport';
  } else if (
    lower.includes('amazon') ||
    lower.includes('flipkart') ||
    lower.includes('myntra') ||
    lower.includes('shoes') ||
    lower.includes('clothes') ||
    lower.includes('shopping') ||
    lower.includes('mall') ||
    lower.includes('zara') ||
    lower.includes('nike')
  ) {
    category = 'shopping';
  } else if (
    lower.includes('electricity') ||
    lower.includes('power') ||
    lower.includes('water bill') ||
    lower.includes('wifi') ||
    lower.includes('broadband') ||
    lower.includes('recharge') ||
    lower.includes('airtel') ||
    lower.includes('jio') ||
    lower.includes('rent') ||
    lower.includes('maintenance')
  ) {
    category = 'bills';
  } else if (
    lower.includes('netflix') ||
    lower.includes('spotify') ||
    lower.includes('prime') ||
    lower.includes('movie') ||
    lower.includes('cinema') ||
    lower.includes('game') ||
    lower.includes('steam') ||
    lower.includes('concert')
  ) {
    category = 'entertainment';
  } else if (
    lower.includes('medicine') ||
    lower.includes('pharmacy') ||
    lower.includes('doctor') ||
    lower.includes('hospital') ||
    lower.includes('gym') ||
    lower.includes('fitness') ||
    lower.includes('clinic')
  ) {
    category = 'health';
  }

  // 5. Detect Title / Merchant
  // Clean text from common SMS fillers
  let title = text;
  const merchantPatterns = [
    /(?:at|to|for|from|paid to|sent to|vpa)\s+([A-Za-z0-9\s&'-]{3,30}?)(?:\s+(?:via|using|on|ref|txn|for|dated|\.|\,)|$)/i,
    /(?:debited by|spent|credit of)\s+[^;]+\s+(?:at|to|by)\s+([A-Za-z0-9\s&'-]{3,30})/i,
  ];

  for (const pat of merchantPatterns) {
    const match = text.match(pat);
    if (match && match[1]) {
      title = match[1].trim();
      break;
    }
  }

  // Fallback title formatting if still too long or unchanged
  if (title.length > 32 || title === text) {
    // If we have category
    if (category !== 'other') {
      title = category.charAt(0).toUpperCase() + category.slice(1) + (isIncome ? ' Credit' : ' Expense');
    } else {
      title = text.slice(0, 24);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return {
    title,
    amount,
    type,
    category,
    paymentMethod,
    date: today,
    note: text.length > 20 ? text : undefined,
  };
}
