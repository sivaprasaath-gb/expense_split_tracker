import { TransactionType, PaymentMethod } from '../types';

export interface ParsedExpenseResult {
  title: string;
  amount: number;
  type: TransactionType;
  category: string;
  paymentMethod: PaymentMethod;
  date: string; // YYYY-MM-DD
  accountNumber?: string;
  note?: string;
  rawText?: string;
  isDebitAlert: boolean;
  sender?: string;
}

/**
 * Months abbreviation mapping for date parsing
 */
const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
};

/**
 * Enhanced parser for bank debit alerts, UPI payment messages, and expense texts
 */
export function parseExpenseFromText(input: string, sender?: string): ParsedExpenseResult {
  const text = (input || '').trim();
  const lower = text.toLowerCase();

  // 1. Filter out OTPs, security codes, and promotional messages
  const isOtpOrSpam =
    (lower.includes('otp') || lower.includes('one time password') || lower.includes('verification code') || lower.includes('secret code')) &&
    !lower.includes('debited') &&
    !lower.includes('spent') &&
    !lower.includes('paid');

  // 2. Detect Transaction Type
  const isIncome =
    (lower.includes('credited') ||
     lower.includes('credit of') ||
     lower.includes('received rs') ||
     lower.includes('received inr') ||
     lower.includes('received ₹') ||
     lower.includes('salary') ||
     lower.includes('cashback received') ||
     lower.includes('refund received')) &&
    !lower.includes('debited');

  const type: TransactionType = isIncome ? 'income' : 'expense';

  // 3. Extract Amount (Avoiding available balance!)
  // Priority 1: Patterns explicitly bound to debit / spend / payment keywords
  let amount = 0;

  // Debit/spend specific patterns (e.g. "debited by INR 450.00", "spent Rs 1,299", "paid ₹240")
  const debitAmountPatterns = [
    /(?:debited\s*(?:by|with|for)?|spent|paid|payment of|charge of|withdrawn)\s*(?:rs\.?|inr|₹|\$|€|£)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:rs\.?|inr|₹|\$|€|£)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:has been debited|debited|spent|paid|withdrawn|deducted)/i,
    /(?:transfer of|sent)\s*(?:rs\.?|inr|₹|\$|€|£)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:credited\s*(?:with|by)?|received)\s*(?:rs\.?|inr|₹|\$|€|£)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:rs\.?|inr|₹|\$|€|£)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:credited|deposited)/i,
  ];

  for (const pat of debitAmountPatterns) {
    const match = text.match(pat);
    if (match && match[1]) {
      const val = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(val) && val > 0) {
        amount = val;
        break;
      }
    }
  }

  // Priority 2: Fallback to currency pattern occurring BEFORE any "bal" or "balance" word
  if (amount === 0) {
    // Cut off text at balance mention to avoid capturing remaining balance
    const textBeforeBalance = text.split(/(?:avl\.?\s*bal|avail(?:able)?\s*bal|bal:|bal\s+inr|balance)/i)[0];
    const currencyMatch = textBeforeBalance.match(/(?:rs\.?|inr|₹|\$|€|£)\s*([\d,]+(?:\.\d{1,2})?)/i) ||
                          text.match(/(?:rs\.?|inr|₹|\$|€|£)\s*([\d,]+(?:\.\d{1,2})?)/i);

    if (currencyMatch && currencyMatch[1]) {
      const val = parseFloat(currencyMatch[1].replace(/,/g, ''));
      if (!isNaN(val) && val > 0) {
        amount = val;
      }
    }
  }

  // Priority 3: Generic numeric fallback
  if (amount === 0) {
    const numMatch = text.match(/(\d+(?:\.\d{1,2})?)/);
    if (numMatch && numMatch[1]) {
      const val = parseFloat(numMatch[1]);
      if (!isNaN(val) && val > 0 && val < 5000000) {
        amount = val;
      }
    }
  }

  // 4. Extract Account / Card digits
  let accountNumber: string | undefined;
  const acctPatterns = [
    /(?:a\/c(?:\s*no\.?)?|account|acct)\s*(?:ending\s*)?(?:[x*]+)?(\d{3,5})/i,
    /(?:card ending(?: with)?|ending with)\s*(?:[x*]+)?(\d{4})/i,
    /(?:credit card|debit card)\s*(?:[x*]+)?(\d{4})/i,
  ];

  for (const pat of acctPatterns) {
    const match = text.match(pat);
    if (match && match[1]) {
      accountNumber = `XX${match[1]}`;
      break;
    }
  }

  // 5. Detect Payment Method
  let paymentMethod: PaymentMethod = 'Other';
  if (
    lower.includes('upi') ||
    lower.includes('gpay') ||
    lower.includes('phonepe') ||
    lower.includes('paytm') ||
    lower.includes('bhim') ||
    lower.includes('vpa') ||
    /@(?:okhdfcbank|okaxis|okicici|oksbi|paytm|ybl|ibl|axl)/i.test(text)
  ) {
    paymentMethod = 'UPI';
  } else if (
    lower.includes('card') ||
    lower.includes('visa') ||
    lower.includes('mastercard') ||
    lower.includes('pos ') ||
    lower.includes('credit card') ||
    lower.includes('debit card')
  ) {
    paymentMethod = 'Card';
  } else if (lower.includes('cash') || lower.includes('atm withdrawal')) {
    paymentMethod = 'Cash';
  } else if (
    lower.includes('netbanking') ||
    lower.includes('neft') ||
    lower.includes('imps') ||
    lower.includes('rtgs') ||
    lower.includes('billdesk')
  ) {
    paymentMethod = 'NetBanking';
  }

  // 6. Detect Category
  let category = 'other';
  if (isIncome || lower.includes('salary') || lower.includes('payroll') || lower.includes('dividend') || lower.includes('interest')) {
    category = 'salary';
  } else if (
    lower.includes('swiggy') ||
    lower.includes('zomato') ||
    lower.includes('starbucks') ||
    lower.includes('mcdonald') ||
    lower.includes('kfc') ||
    lower.includes('burger king') ||
    lower.includes('pizza') ||
    lower.includes('domino') ||
    lower.includes('subway') ||
    lower.includes('chai') ||
    lower.includes('cafe') ||
    lower.includes('coffee') ||
    lower.includes('barista') ||
    lower.includes('third wave') ||
    lower.includes('restaurant') ||
    lower.includes('dine') ||
    lower.includes('biryani') ||
    lower.includes('food')
  ) {
    category = 'food';
  } else if (
    lower.includes('blinkit') ||
    lower.includes('zepto') ||
    lower.includes('instamart') ||
    lower.includes('bigbasket') ||
    lower.includes('groceries') ||
    lower.includes('grocery') ||
    lower.includes('supermarket') ||
    lower.includes('dmart') ||
    lower.includes('spencer') ||
    lower.includes('provision') ||
    lower.includes('vegetables') ||
    lower.includes('fruits') ||
    lower.includes('milk')
  ) {
    category = 'groceries';
  } else if (
    lower.includes('uber') ||
    lower.includes('ola') ||
    lower.includes('rapido') ||
    lower.includes('metro') ||
    lower.includes('petrol') ||
    lower.includes('fuel') ||
    lower.includes('diesel') ||
    lower.includes('indian oil') ||
    lower.includes('iocl') ||
    lower.includes('bpcl') ||
    lower.includes('hpcl') ||
    lower.includes('shell') ||
    lower.includes('fastag') ||
    lower.includes('toll') ||
    lower.includes('flight') ||
    lower.includes('indigo') ||
    lower.includes('air india') ||
    lower.includes('irctc') ||
    lower.includes('train') ||
    lower.includes('railway')
  ) {
    category = 'transport';
  } else if (
    lower.includes('amazon') ||
    lower.includes('flipkart') ||
    lower.includes('myntra') ||
    lower.includes('ajio') ||
    lower.includes('meesho') ||
    lower.includes('zara') ||
    lower.includes('h&m') ||
    lower.includes('nike') ||
    lower.includes('decathlon') ||
    lower.includes('adidas') ||
    lower.includes('uniqlo') ||
    lower.includes('nykaa') ||
    lower.includes('shopping') ||
    lower.includes('croma') ||
    lower.includes('retail') ||
    lower.includes('mall')
  ) {
    category = 'shopping';
  } else if (
    lower.includes('electricity') ||
    lower.includes('power') ||
    lower.includes('bescom') ||
    lower.includes('tneb') ||
    lower.includes('mseb') ||
    lower.includes('discom') ||
    lower.includes('airtel') ||
    lower.includes('jio') ||
    lower.includes('vodafone') ||
    lower.includes('vi ') ||
    lower.includes('bsnl') ||
    lower.includes('wifi') ||
    lower.includes('broadband') ||
    lower.includes('act fibernet') ||
    lower.includes('recharge') ||
    lower.includes('water bill') ||
    lower.includes('gas') ||
    lower.includes('igl') ||
    lower.includes('indane') ||
    lower.includes('rent') ||
    lower.includes('maintenance') ||
    lower.includes('dth') ||
    lower.includes('tata play')
  ) {
    category = 'bills';
  } else if (
    lower.includes('netflix') ||
    lower.includes('spotify') ||
    lower.includes('prime') ||
    lower.includes('hotstar') ||
    lower.includes('youtube') ||
    lower.includes('bookmyshow') ||
    lower.includes('pvr') ||
    lower.includes('inox') ||
    lower.includes('cinema') ||
    lower.includes('movie') ||
    lower.includes('steam') ||
    lower.includes('sony') ||
    lower.includes('gaming') ||
    lower.includes('discord')
  ) {
    category = 'entertainment';
  } else if (
    lower.includes('apollo') ||
    lower.includes('pharmeasy') ||
    lower.includes('1mg') ||
    lower.includes('netmeds') ||
    lower.includes('medplus') ||
    lower.includes('pharmacy') ||
    lower.includes('medicine') ||
    lower.includes('hospital') ||
    lower.includes('doctor') ||
    lower.includes('clinic') ||
    lower.includes('cult.fit') ||
    lower.includes('cult') ||
    lower.includes('gym') ||
    lower.includes('fitness') ||
    lower.includes('diagnostic') ||
    lower.includes('pathlab')
  ) {
    category = 'health';
  }

  // 7. Extract Merchant / Payee Title
  let title = '';

  // VPA Handle extraction first (e.g. VPA swiggy@icici or to starbucks@hdfc)
  const vpaMatch = text.match(/(?:vpa|to)\s+([A-Za-z0-9_.-]+)@([A-Za-z0-9]+)/i);
  if (vpaMatch && vpaMatch[1]) {
    const rawVpa = vpaMatch[1].replace(/[._-]/g, ' ').trim();
    // Capitalize words
    title = rawVpa.split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  // Info header extraction (e.g. Info: BIL*NETFLIX or Info: UBER RIDES)
  if (!title) {
    const infoMatch = text.match(/info:\s*([A-Za-z0-9*&'.-]{2,30})/i);
    if (infoMatch && infoMatch[1]) {
      title = infoMatch[1].replace(/^BIL\*/i, '').trim();
    }
  }

  // Common Bank SMS merchant patterns
  if (!title) {
    const merchantPatterns = [
      /(?:transfer to|paid to|sent to)\s+([A-Za-z0-9\s&'.-]{2,32}?)(?:\s+(?:via|using|on|ref|txn|for|dated|avl|bal|\.|\,)|$)/i,
      /(?:at|to|for)\s+([A-Za-z0-9\s&'.-]{2,32}?)(?:\s+(?:via|using|on|ref|txn|dated|avl|bal|upi|vpa|\.|\,)|$)/i,
      /(?:debited by|spent|credit of)\s+[^;]+\s+(?:at|to|by)\s+([A-Za-z0-9\s&'.-]{2,32})/i,
    ];

    for (const pat of merchantPatterns) {
      const match = text.match(pat);
      if (match && match[1]) {
        let clean = match[1].trim();
        // Remove trailing stop words
        clean = clean.replace(/\s+(?:via|using|on|ref|txn|upi|avl|bal|ltd|limited|pvt|vpa)$/i, '').trim();
        if (clean.length >= 2 && !/^(?:the|an|your|rs|inr|account|acct)$/i.test(clean)) {
          title = clean;
          break;
        }
      }
    }
  }

  // Fallback to Category / Known Brand format
  if (!title || title.length > 32 || /^\d+$/.test(title)) {
    if (category !== 'other') {
      const catCapitalized = category.charAt(0).toUpperCase() + category.slice(1);
      title = isIncome ? `${catCapitalized} Credit` : `${catCapitalized} Payment`;
    } else {
      title = isIncome ? 'Income Credit' : 'Debit Expense';
    }
  }

  // Clean title capitalization
  if (title.toUpperCase() === title && title.length > 3) {
    // Convert ALL CAPS (e.g. STARBUCKS) to Title Case (Starbucks)
    title = title.split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  // 8. Extract Date from SMS if present
  let txDate = new Date().toISOString().slice(0, 10); // default today
  // Date format: 14-Oct-26, 14Oct26, 14-10-2026, 14/10/26
  const dateMatchAlpha = text.match(/(\d{1,2})[-/\s]?([A-Za-z]{3})[-/\s]?(\d{2,4})/i);
  if (dateMatchAlpha) {
    const day = dateMatchAlpha[1].padStart(2, '0');
    const monthKey = dateMatchAlpha[2].toLowerCase();
    const month = MONTH_MAP[monthKey];
    let year = dateMatchAlpha[3];
    if (year.length === 2) {
      year = `20${year}`;
    }
    if (month) {
      txDate = `${year}-${month}-${day}`;
    }
  } else {
    const dateMatchNum = text.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
    if (dateMatchNum) {
      const day = dateMatchNum[1].padStart(2, '0');
      const month = dateMatchNum[2].padStart(2, '0');
      let year = dateMatchNum[3];
      if (year.length === 2) {
        year = `20${year}`;
      }
      txDate = `${year}-${month}-${day}`;
    }
  }

  const isDebitAlert = !isOtpOrSpam && amount > 0;

  return {
    title,
    amount,
    type,
    category,
    paymentMethod,
    date: txDate,
    accountNumber,
    note: text.length > 20 ? text : undefined,
    rawText: text,
    isDebitAlert,
    sender,
  };
}
