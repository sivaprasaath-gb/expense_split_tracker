import { PendingTransaction, Transaction, Category, PaymentMethod } from '../types';

/**
 * Normalizes merchant title string for deduplication and matching
 */
export function normalizeMerchant(raw: string): string {
  if (!raw) return 'Debit Expense';
  return raw
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s&.-]/g, '')
    .slice(0, 60);
}

/**
 * Generates a deterministic fingerprint for deduplication
 */
export function generateTransactionFingerprint(date: string, amount: number, title: string): string {
  const normDate = (date || '').trim();
  const normAmount = Math.abs(Number(amount) || 0).toFixed(2);
  const normTitle = (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 30);
  return `sync_${normDate}_${normAmount}_${normTitle}`;
}

/**
 * Intelligent keyword taxonomy for auto-categorization
 */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  food: [
    'swiggy', 'zomato', 'starbucks', 'mcdonald', 'kfc', 'burger', 'pizza', 'domino', 
    'cafe', 'coffee', 'tea', 'chai', 'bakery', 'restaurant', 'dining', 'subko', 
    'blue tokai', 'dineout', 'barbeque', 'bistro', 'food', 'eats', 'biryani', 'kitchen'
  ],
  transport: [
    'uber', 'ola', 'rapido', 'metro', 'irctc', 'rail', 'train', 'petrol', 'fuel', 
    'shell', 'hpcl', 'bpcl', 'iocl', 'indian oil', 'toll', 'fastag', 'auto', 'cab', 
    'taxi', 'parking', 'flight', 'indigo', 'air india', 'spicejet', 'bus', 'redbus'
  ],
  groceries: [
    'blinkit', 'zepto', 'instamart', 'bigbasket', 'bb daily', 'dunzo', 'supermarket', 
    'dmart', 'nature basket', 'reliance fresh', 'grocery', 'milk', 'country delight', 
    'veggies', 'vegetables', 'fruits', 'kirana', 'mart', 'provision'
  ],
  shopping: [
    'amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'zara', 'h&m', 'uniqlo', 
    'clothing', 'apparel', 'shoes', 'footwear', 'decathlon', 'nike', 'adidas', 
    'nykaa', 'tata cliq', 'retail', 'mall', 'store', 'electronics', 'croma'
  ],
  entertainment: [
    'netflix', 'prime video', 'amazon prime', 'hotstar', 'disney', 'pvr', 'inox', 
    'bookmyshow', 'spotify', 'youtube', 'apple music', 'steam', 'playstation', 
    'cinema', 'movie', 'theatre', 'gaming', 'concert', 'event'
  ],
  bills: [
    'electricity', 'bescom', 'tneb', 'discom', 'water', 'wifi', 'broadband', 
    'airtel', 'jio', 'vodafone', 'vi ', 'recharge', 'dth', 'tata play', 'rent', 
    'maintenance', 'gas', 'lpg', 'indane', 'bharat gas', 'utility', 'insurance'
  ],
  health: [
    'cult', 'gym', 'cultfit', 'fitness', 'pharmacy', 'apollo', 'medplus', 
    'pharmeasy', '1mg', 'tata 1mg', 'hospital', 'clinic', 'doctor', 'dental', 
    'dentist', 'lab', 'diagnostic', 'medical', 'medicine', 'opticals'
  ],
  salary: [
    'salary', 'payroll', 'wages', 'dividend', 'stipend', 'bonus', 'interest', 'refund'
  ],
};

/**
 * Matches a merchant name or note to best suited category ID
 */
export function matchCategoryForMerchant(merchantName: string, availableCategories: Category[]): string {
  const text = (merchantName || '').toLowerCase();

  // 1. Direct keyword match
  for (const [catKey, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const matched = keywords.some(kw => text.includes(kw));
    if (matched) {
      // Find category in user's categories list that matches key
      const cat = availableCategories.find(c => 
        c.id.toLowerCase() === catKey || 
        c.name.toLowerCase().includes(catKey)
      );
      if (cat) return cat.id;
    }
  }

  // 2. Check if merchant contains name of any category directly
  for (const cat of availableCategories) {
    const cleanCat = cat.name.toLowerCase();
    if (cleanCat.length > 2 && text.includes(cleanCat)) {
      return cat.id;
    }
  }

  // 3. Fallback to 'other' or first non-salary category
  const otherCat = availableCategories.find(c => c.id === 'other');
  if (otherCat) return otherCat.id;
  return availableCategories[0]?.id || 'other';
}

/**
 * Parses varied date formats into YYYY-MM-DD
 */
export function normalizeDate(raw: string): string {
  if (!raw) return new Date().toISOString().slice(0, 10);
  const clean = raw.trim().replace(/^["']|["']$/g, '');

  // 1. Standard ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    return clean.slice(0, 10);
  }

  // 2. DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    let y = dmyMatch[3];
    if (y.length === 2) y = `20${y}`;
    return `${y}-${m}-${d}`;
  }

  // 3. Textual dates: 14 Oct 2026 or October 14, 2026
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return new Date().toISOString().slice(0, 10);
}

/**
 * Extracts and cleans monetary amount
 */
export function parseAmount(raw: string | number): number {
  if (typeof raw === 'number') return Math.abs(raw);
  if (!raw) return 0;

  // Remove currency symbols, commas, spaces
  const clean = String(raw)
    .replace(/[₹$€£\s,INRRs.]/gi, (match) => (match === '.' ? '.' : ''))
    .replace(/[^\d.-]/g, '');

  const val = parseFloat(clean);
  return isNaN(val) ? 0 : Math.abs(val);
}

/**
 * Parse CSV text into array of rows respecting quotes and commas
 */
export function parseCSVToRows(csvContent: string): string[][] {
  const rows: string[][] = [];
  const lines = csvContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  for (const line of lines) {
    if (!line.trim()) continue;
    const row: string[] = [];
    let insideQuotes = false;
    let currentCell = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          currentCell += '"';
          i++; // Skip escaped quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        row.push(currentCell.trim());
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    row.push(currentCell.trim());
    if (row.some(cell => cell.length > 0)) {
      rows.push(row);
    }
  }

  return rows;
}

export interface ParseSyncResult {
  newTransactions: PendingTransaction[];
  duplicateCount: number;
  errorCount: number;
  totalParsed: number;
}

/**
 * Main parser that parses a CSV / Apple Numbers exported file or raw text
 * and deduplicates against existing and pending expenses.
 */
export function parseSpreadsheetTransactions(
  csvContent: string,
  categories: Category[],
  existingTransactions: Transaction[],
  existingPending: PendingTransaction[] = []
): ParseSyncResult {
  const rows = parseCSVToRows(csvContent);
  if (rows.length === 0) {
    // Try raw SMS / notification text parser
    return parseRawDebitNotes(csvContent, categories, existingTransactions, existingPending);
  }

  // Pre-index existing fingerprints for fast O(1) deduplication lookup
  const existingFingerprints = new Set<string>();
  existingTransactions.forEach(t => {
    existingFingerprints.add(generateTransactionFingerprint(t.date, t.amount, t.title));
  });
  existingPending.forEach(p => {
    existingFingerprints.add(generateTransactionFingerprint(p.date, p.amount, p.title));
    existingFingerprints.add(p.id);
  });

  // Header detection
  const firstRow = rows[0].map(c => c.toLowerCase().trim());
  let dateIdx = -1;
  let amountIdx = -1;
  let merchantIdx = -1;
  let noteIdx = -1;
  let categoryIdx = -1;
  let methodIdx = -1;
  let typeIdx = -1;

  firstRow.forEach((col, idx) => {
    if (col.includes('date') || col.includes('time') || col === 'when' || col === 'dt') {
      if (dateIdx === -1) dateIdx = idx;
    } else if (col.includes('amount') || col.includes('debit') || col.includes('spent') || col.includes('cost') || col.includes('price')) {
      if (amountIdx === -1) amountIdx = idx;
    } else if (col.includes('merchant') || col.includes('title') || col.includes('desc') || col.includes('vendor') || col.includes('payee') || col.includes('to') || col.includes('particulars')) {
      if (merchantIdx === -1) merchantIdx = idx;
    } else if (col.includes('note') || col.includes('ref') || col.includes('upi') || col.includes('comment')) {
      if (noteIdx === -1) noteIdx = idx;
    } else if (col.includes('cat') || col.includes('tag')) {
      if (categoryIdx === -1) categoryIdx = idx;
    } else if (col.includes('mode') || col.includes('method') || col.includes('account') || col.includes('card')) {
      if (methodIdx === -1) methodIdx = idx;
    } else if (col.includes('type') || col === 'cr/dr' || col === 'dr/cr') {
      if (typeIdx === -1) typeIdx = idx;
    }
  });

  let dataRows = rows;
  const hasRecognizedHeaders = dateIdx !== -1 || amountIdx !== -1 || merchantIdx !== -1;

  if (hasRecognizedHeaders) {
    // Drop header row
    dataRows = rows.slice(1);
  } else {
    // Positional fallback: e.g. Col 0 = Date, Col 1 = Amount, Col 2 = Merchant
    dateIdx = 0;
    amountIdx = 1;
    merchantIdx = 2;
    noteIdx = 3;
  }

  const newTransactions: PendingTransaction[] = [];
  let duplicateCount = 0;
  let errorCount = 0;
  let totalParsed = 0;

  for (const row of dataRows) {
    totalParsed++;
    const rawDate = row[dateIdx] || '';
    const rawAmount = row[amountIdx] || '';
    const rawMerchant = row[merchantIdx] || row[noteIdx] || 'Debit Payment';
    const rawNote = noteIdx !== -1 ? (row[noteIdx] || '') : '';
    const rawType = typeIdx !== -1 ? (row[typeIdx] || '').toLowerCase() : 'expense';

    // Skip credit rows if explicitly identified as credit / refund / deposit unless desired
    if (rawType.includes('credit') || rawType === 'cr') {
      // You can ignore or process as income, but user requested debit tracker
      continue;
    }

    const amount = parseAmount(rawAmount);
    if (!amount || isNaN(amount) || amount <= 0) {
      errorCount++;
      continue;
    }

    const date = normalizeDate(rawDate);
    const title = normalizeMerchant(rawMerchant) || 'Debit Expense';
    const fingerprint = generateTransactionFingerprint(date, amount, title);

    if (existingFingerprints.has(fingerprint)) {
      duplicateCount++;
      continue;
    }

    // Match payment method
    let paymentMethod: PaymentMethod = 'UPI';
    const rawMethod = methodIdx !== -1 ? (row[methodIdx] || '').toLowerCase() : '';
    if (rawMethod.includes('card')) paymentMethod = 'Card';
    else if (rawMethod.includes('cash')) paymentMethod = 'Cash';
    else if (rawMethod.includes('net') || rawMethod.includes('bank')) paymentMethod = 'NetBanking';
    else if (rawMethod.includes('upi')) paymentMethod = 'UPI';

    // Auto-categorize
    let selectedCategory = 'other';
    if (categoryIdx !== -1 && row[categoryIdx]) {
      const explicitCat = row[categoryIdx].trim();
      const matched = categories.find(c => 
        c.id.toLowerCase() === explicitCat.toLowerCase() || 
        c.name.toLowerCase() === explicitCat.toLowerCase()
      );
      if (matched) selectedCategory = matched.id;
      else selectedCategory = matchCategoryForMerchant(explicitCat + ' ' + title, categories);
    } else {
      selectedCategory = matchCategoryForMerchant(title + ' ' + rawNote, categories);
    }

    const pendingItem: PendingTransaction = {
      id: fingerprint,
      title,
      amount,
      type: 'expense',
      category: selectedCategory,
      date,
      note: rawNote ? rawNote.slice(0, 150) : 'Synced from iPhone sheet',
      paymentMethod,
      source: 'iphone_shortcut',
      createdAt: Date.now(),
      isSplit: false,
    };

    existingFingerprints.add(fingerprint);
    newTransactions.push(pendingItem);
  }

  return {
    newTransactions,
    duplicateCount,
    errorCount,
    totalParsed,
  };
}

/**
 * Fallback parser for raw SMS or debit notification messages
 */
function parseRawDebitNotes(
  rawText: string,
  categories: Category[],
  existingTransactions: Transaction[],
  existingPending: PendingTransaction[]
): ParseSyncResult {
  const lines = rawText.split(/\n+/).map(l => l.trim()).filter(Boolean);
  const newTransactions: PendingTransaction[] = [];
  let duplicateCount = 0;
  let errorCount = 0;

  const existingFingerprints = new Set<string>();
  existingTransactions.forEach(t => existingFingerprints.add(generateTransactionFingerprint(t.date, t.amount, t.title)));
  existingPending.forEach(p => existingFingerprints.add(p.id));

  for (const line of lines) {
    // Check for amount pattern: Rs. 450, INR 450, 450.00
    const amtMatch = line.match(/(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i) || line.match(/(\d+(?:\.\d{1,2})?)\s*(?:debited|spent|paid)/i);
    if (!amtMatch) {
      errorCount++;
      continue;
    }

    const amount = parseAmount(amtMatch[1]);
    if (!amount) {
      errorCount++;
      continue;
    }

    // Check for merchant: "at SWIGGY", "to Zomato", "for Uber", "towards BESCOM"
    const merchantMatch = line.match(/(?:at|to|for|towards|info:?)\s+([A-Za-z0-9\s&.-]+?)(?=\s+(?:on|via|using|from|ref|upi|avl|bal|\.|\n|$))/i);
    const title = merchantMatch ? normalizeMerchant(merchantMatch[1]) : 'Debit Transaction';

    // Check for date
    const dateMatch = line.match(/\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+[A-Za-z]{3}\s+\d{2,4})\b/);
    const date = dateMatch ? normalizeDate(dateMatch[1]) : new Date().toISOString().slice(0, 10);

    const fingerprint = generateTransactionFingerprint(date, amount, title);
    if (existingFingerprints.has(fingerprint)) {
      duplicateCount++;
      continue;
    }

    const category = matchCategoryForMerchant(title + ' ' + line, categories);

    newTransactions.push({
      id: fingerprint,
      title,
      amount,
      type: 'expense',
      category,
      date,
      note: line.slice(0, 150),
      paymentMethod: 'UPI',
      source: 'iphone_shortcut',
      createdAt: Date.now(),
      isSplit: false,
    });
    existingFingerprints.add(fingerprint);
  }

  return {
    newTransactions,
    duplicateCount,
    errorCount,
    totalParsed: lines.length,
  };
}

/**
 * Creates a sample CSV template for download or copying
 */
export function generateSampleTransactionsCSV(): string {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  return [
    'Date,Amount,Merchant,Category,PaymentMethod,Notes',
    `${today},340.00,Swiggy,Food,UPI,Lunch order`,
    `${today},180.00,Uber,Transport,UPI,Ride to office`,
    `${yesterday},1250.00,Blinkit,Groceries,UPI,Weekly groceries`,
    `${yesterday},499.00,Amazon,Shopping,Card,Phone case`,
  ].join('\n');
}
