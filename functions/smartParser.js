/**
 * Node.js SMS Debit Parser for Firebase Cloud Functions
 */

const MONTH_MAP = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
};

function parseExpenseFromText(input, sender) {
  const text = (input || '').trim();
  const lower = text.toLowerCase();

  // 1. Check if Income
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

  const type = isIncome ? 'income' : 'expense';

  // 2. Extract Amount
  let amount = 0;
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

  if (amount === 0) {
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

  // 3. Extract Account Number
  let accountNumber = undefined;
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

  // 4. Payment Method
  let paymentMethod = 'Other';
  if (
    lower.includes('upi') || lower.includes('gpay') || lower.includes('phonepe') || lower.includes('paytm') || lower.includes('vpa') || /@(?:okhdfcbank|okaxis|okicici|oksbi|paytm|ybl|ibl|axl)/i.test(text)
  ) {
    paymentMethod = 'UPI';
  } else if (lower.includes('card') || lower.includes('visa') || lower.includes('mastercard') || lower.includes('pos ')) {
    paymentMethod = 'Card';
  } else if (lower.includes('cash') || lower.includes('atm')) {
    paymentMethod = 'Cash';
  } else if (lower.includes('netbanking') || lower.includes('neft') || lower.includes('imps')) {
    paymentMethod = 'NetBanking';
  }

  // 5. Category
  let category = 'other';
  if (isIncome) {
    category = 'salary';
  } else if (lower.includes('swiggy') || lower.includes('zomato') || lower.includes('starbucks') || lower.includes('mcdonald') || lower.includes('kfc') || lower.includes('restaurant') || lower.includes('cafe')) {
    category = 'food';
  } else if (lower.includes('blinkit') || lower.includes('zepto') || lower.includes('instamart') || lower.includes('dmart') || lower.includes('supermarket') || lower.includes('grocery')) {
    category = 'groceries';
  } else if (lower.includes('uber') || lower.includes('ola') || lower.includes('rapido') || lower.includes('metro') || lower.includes('petrol') || lower.includes('fuel')) {
    category = 'transport';
  } else if (lower.includes('amazon') || lower.includes('flipkart') || lower.includes('myntra') || lower.includes('zara') || lower.includes('shopping')) {
    category = 'shopping';
  } else if (lower.includes('netflix') || lower.includes('spotify') || lower.includes('prime') || lower.includes('hotstar') || lower.includes('bookmyshow') || lower.includes('cinema')) {
    category = 'entertainment';
  } else if (lower.includes('electricity') || lower.includes('bescom') || lower.includes('broadband') || lower.includes('wifi') || lower.includes('airtel') || lower.includes('jio')) {
    category = 'utilities';
  } else if (lower.includes('apollo') || lower.includes('pharmacy') || lower.includes('hospital') || lower.includes('practo') || lower.includes('medplus')) {
    category = 'health';
  }

  // 6. Title / Merchant
  let title = 'Debit Expense';
  const payeePatterns = [
    /(?:to|at|info\/|transfer to|vpa\s+to|paid to)\s+([A-Za-z0-9\s&._'-]{2,28}?)(?=\s+(?:on|via|ref|bal|avl|vpa|using|from|\.|$))/i,
    /(?:spent at|used at)\s+([A-Za-z0-9\s&._'-]{2,28}?)(?=\s+(?:on|via|ref|bal|avl|\.|$))/i,
  ];
  for (const pat of payeePatterns) {
    const match = text.match(pat);
    if (match && match[1]) {
      const candidate = match[1].trim().replace(/\s+/g, ' ');
      if (candidate.length > 1 && !/^(the|a|an|your|inr|rs|upi)$/i.test(candidate)) {
        title = candidate.split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');
        break;
      }
    }
  }

  if (title === 'Debit Expense') {
    if (category !== 'other') {
      title = category.charAt(0).toUpperCase() + category.slice(1);
    } else if (accountNumber) {
      title = `Debit (${accountNumber})`;
    }
  }

  const isDebitAlert =
    amount > 0 &&
    (lower.includes('debited') ||
     lower.includes('spent') ||
     lower.includes('paid') ||
     lower.includes('withdrawn') ||
     lower.includes('deducted') ||
     lower.includes('transferred') ||
     lower.includes('purchase of') ||
     lower.includes('txn'));

  return {
    title,
    amount,
    type,
    category,
    paymentMethod,
    date: new Date().toISOString().slice(0, 10),
    accountNumber,
    isDebitAlert,
    rawText: text,
    sender,
  };
}

module.exports = { parseExpenseFromText };
