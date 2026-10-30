import { AppState, Category, Transaction, Subscription, Friend, SplitExpense, SplitGroup } from '../types';

export const STORAGE_KEY = 'varavu_selavu_state_v1';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food', name: 'Food & Dining', icon: '🍔', color: '#f97316', budget: 0 },
  { id: 'shopping', name: 'Shopping', icon: '🛍️', color: '#ec4899', budget: 0 },
  { id: 'transport', name: 'Transport & Fuel', icon: '🚗', color: '#0ea5e9', budget: 0 },
  { id: 'petrol', name: 'Petrol', icon: '⛽', color: '#0284c7', budget: 0 },
  { id: 'entertainment', name: 'Entertainment', icon: '🎮', color: '#8b5cf6', budget: 0 },
  { id: 'bills', name: 'Bills & Utilities', icon: '🧾', color: '#14b8a6', budget: 0 },
  { id: 'groceries', name: 'Groceries', icon: '🥦', color: '#22c55e', budget: 0 },
  { id: 'health', name: 'Health & Fitness', icon: '💊', color: '#ef4444', budget: 0 },
  { id: 'salary', name: 'Salary & Income', icon: '💼', color: '#10b981', budget: 0 },
  { id: 'other', name: 'Other', icon: '🏷️', color: '#64748b', budget: 0 },
];

// Clean empty seeds for fresh deployment
export const SEED_TRANSACTIONS: Transaction[] = [];
export const SEED_SUBSCRIPTIONS: Subscription[] = [];
export const SEED_FRIENDS: Friend[] = [];
export const SEED_SPLIT_EXPENSES: SplitExpense[] = [];
export const SEED_SPLIT_GROUPS: SplitGroup[] = [];

// Optional sample templates if user explicitly requests demo data
export const DEMO_SAMPLE_TRANSACTIONS: Transaction[] = [
  {
    id: 'sample-1',
    title: 'Monthly Salary',
    amount: 65000,
    type: 'income',
    category: 'salary',
    date: '2026-09-01',
    note: 'September payroll direct deposit',
    paymentMethod: 'NetBanking',
    createdAt: Date.now() - 14 * 86400000,
  },
  {
    id: 'sample-2',
    title: 'Supermarket Groceries',
    amount: 3450,
    type: 'expense',
    category: 'groceries',
    date: '2026-09-03',
    note: 'Weekly essentials and fresh produce',
    paymentMethod: 'UPI',
    createdAt: Date.now() - 12 * 86400000,
  },
];

export function generateWebhookKey(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let rand = '';
  for (let i = 0; i < 10; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `wbk_${rand}`;
}

export function getInitialState(): AppState {
  // Clear any legacy test data from prior revisions
  try {
    if (localStorage.getItem('spender_app_state_v2')) {
      localStorage.removeItem('spender_app_state_v2');
    }
    if (localStorage.getItem('spender_app_state_v1')) {
      localStorage.removeItem('spender_app_state_v1');
    }
    if (localStorage.getItem('varu_selavu_state_v1')) {
      localStorage.removeItem('varu_selavu_state_v1');
    }
  } catch {
    // Ignore storage permission errors
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return normalizeState(parsed);
    } catch {
      // Fall through to default
    }
  }

  const defaultState: AppState = {
    appName: 'VARAVU&SELAVU',
    currency: 'INR',
    budgetLimit: 0,
    theme: 'dark',
    activeTab: 'dashboard',
    transactions: [],
    categories: DEFAULT_CATEGORIES,
    subscriptions: [],
    friends: [],
    splitExpenses: [],
    splitGroups: [],
    pendingTransactions: [],
    smsWebhookKey: generateWebhookKey(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
  return defaultState;
}

export function normalizeState(raw: any): AppState {
  const parseRawList = (list: any[]): Transaction[] => {
    const cleanList: Transaction[] = [];
    const seenIds = new Set<string>();
    list.forEach((t: any, idx: number) => {
      let txId = String(t.id || '').trim();
      if (!txId || seenIds.has(txId)) {
        txId = `tx-${t.date ? String(t.date).replace(/[^0-9]/g, '') : 'item'}-${Date.now()}-${idx + 1}-${Math.random().toString(36).slice(2, 6)}`;
      }
      seenIds.add(txId);
      cleanList.push({
        id: txId,
        title: t.title || t['Title / Merchant'] || 'Untitled',
        amount: Number(t.amount) || 0,
        type: t.type === 'income' ? 'income' : 'expense',
        category: t.category || 'other',
        date: t.date || new Date().toISOString().slice(0, 10),
        note: t.note || '',
        paymentMethod: t.paymentMethod || 'Other',
        createdAt: Number(t.createdAt) || (Date.now() - idx * 1000),
      });
    });
    return cleanList;
  };

  // If user passed a bare array of transactions directly [ { ... } ]
  if (Array.isArray(raw)) {
    const cleanTransactions = parseRawList(raw);

    return {
      appName: 'VARAVU&SELAVU',
      currency: 'INR',
      budgetLimit: 0,
      theme: 'dark',
      activeTab: 'dashboard',
      transactions: cleanTransactions,
      categories: DEFAULT_CATEGORIES,
      subscriptions: [],
      friends: [],
      splitExpenses: [],
      splitGroups: [],
      pendingTransactions: [],
      smsWebhookKey: generateWebhookKey(),
    };
  }

  const rawName = raw?.appName?.trim();
  const cleanName = (!rawName || rawName === 'Spendr' || rawName === 'VARU&SELAVU') 
    ? 'VARAVU&SELAVU' 
    : rawName;

  const rawTxList = Array.isArray(raw?.transactions) ? raw.transactions : [];
  const cleanTransactions = parseRawList(rawTxList);

  // Merge default categories with any existing or imported custom categories
  const catList: Category[] = Array.isArray(raw?.categories) && raw.categories.length > 0
    ? [...raw.categories]
    : [...DEFAULT_CATEGORIES];

  const catMap = new Map(catList.map((c) => [c.id, c]));
  for (const defCat of DEFAULT_CATEGORIES) {
    if (!catMap.has(defCat.id)) {
      catList.push(defCat);
    }
  }

  return {
    appName: cleanName,
    currency: raw?.currency || 'INR',
    budgetLimit: typeof raw?.budgetLimit === 'number' ? raw.budgetLimit : 0,
    theme: raw?.theme === 'light' ? 'light' : 'dark',
    activeTab: raw?.activeTab || 'dashboard',
    transactions: cleanTransactions,
    categories: catList,
    subscriptions: Array.isArray(raw?.subscriptions) ? raw.subscriptions : [],
    friends: Array.isArray(raw?.friends) ? raw.friends : [],
    splitExpenses: Array.isArray(raw?.splitExpenses) ? raw.splitExpenses : [],
    splitGroups: Array.isArray(raw?.splitGroups) ? raw.splitGroups : [],
    pendingTransactions: Array.isArray(raw?.pendingTransactions) ? raw.pendingTransactions : [],
    smsWebhookKey: raw?.smsWebhookKey || generateWebhookKey(),
  };
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save state to localStorage:', err);
  }
}

export function getMonthKey(date: Date | string): string {
  if (typeof date === 'string') {
    const match = date.match(/^(\d{4})-(\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}`;
    }
    const d = new Date(date);
    if (isNaN(d.getTime())) {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  if (isNaN(date.getTime())) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function getMonthLabel(monthKey: string): string {
  const parts = monthKey.split('-');
  if (parts.length < 2) return monthKey;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const d = new Date(year, month, 1);
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function formatDisplayDate(
  dateStr: string,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d).toLocaleDateString(undefined, options);
  }
  return new Date(dateStr.replace(/-/g, '/')).toLocaleDateString(undefined, options);
}

export function getAdjacentMonthKey(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function getAvailableMonths(transactions: Transaction[], selectedMonth?: string): string[] {
  const set = new Set<string>();
  const now = new Date();
  const currentMonth = getMonthKey(now);
  set.add(currentMonth);

  if (selectedMonth) {
    set.add(selectedMonth);
  }

  // Pre-populate past 12 months and upcoming 3 months so month navigation and dropdown selection work seamlessly
  for (let i = -12; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    set.add(getMonthKey(d));
  }

  transactions.forEach(t => {
    if (t.date && t.date.length >= 7) {
      set.add(t.date.slice(0, 7));
    }
  });

  return Array.from(set).sort().reverse();
}

export function exportToJsonFile(state: AppState): void {
  const dataStr = JSON.stringify(state, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeName = (state.appName || 'varavu-selavu').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  link.download = `${safeName}-backup-${new Date().toLocaleDateString('en-CA')}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportTransactionsToCsv(transactions: Transaction[], categories: Category[], appName: string): void {
  const catMap = new Map(categories.map(c => [c.id, c.name]));
  const headers = ['Date', 'Title / Merchant', 'Type', 'Category', 'Amount', 'Payment Method', 'Note'];
  
  const rows = transactions.map(t => [
    t.date,
    `"${(t.title || '').replace(/"/g, '""')}"`,
    t.type,
    `"${catMap.get(t.category) || t.category}"`,
    t.amount,
    t.paymentMethod || 'Other',
    `"${(t.note || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeName = (appName || 'varavu-selavu').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  link.download = `${safeName}-transactions-${new Date().toLocaleDateString('en-CA')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function parseCsvTransactions(csvText: string): Transaction[] {
  const lines = csvText.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length <= 1) return [];

  function parseLine(text: string): string[] {
    const re = /(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^",]*))/g;
    const row: string[] = [];
    let match;
    while ((match = re.exec(text)) !== null) {
      const val = match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2];
      row.push(val ? val.trim() : '');
      if (match.index === re.lastIndex) re.lastIndex++;
    }
    return row;
  }

  const categoryMap: Record<string, string> = {
    'Food & Dining': 'food',
    'Bills & Utilities': 'bills',
    'Groceries': 'groceries',
    'Transport & Fuel': 'transport',
    'Petrol': 'petrol',
    'Entertainment': 'entertainment',
    'Shopping': 'shopping',
    'Health & Fitness': 'health',
    'Salary & Income': 'salary',
    'Other': 'other',
  };

  // Inspect headers to support dynamic column indices
  const headerCols = parseLine(lines[0]).map(h => h.toLowerCase().trim());
  let dateIdx = headerCols.findIndex(h => h.includes('date'));
  let titleIdx = headerCols.findIndex(h => h.includes('title') || h.includes('merchant') || h.includes('desc') || h.includes('name'));
  let typeIdx = headerCols.findIndex(h => h.includes('type'));
  let catIdx = headerCols.findIndex(h => h.includes('category') || h.includes('cat'));
  let amountIdx = headerCols.findIndex(h => h.includes('amount') || h.includes('price') || h.includes('cost') || h.includes('value'));
  let pmIdx = headerCols.findIndex(h => h.includes('payment') || h.includes('method') || h.includes('mode'));
  let noteIdx = headerCols.findIndex(h => h.includes('note') || h.includes('remark') || h.includes('comment'));

  // Default fallback indices if header is standard Date,Title,Type,Category,Amount,Payment Method,Note
  if (dateIdx === -1) dateIdx = 0;
  if (titleIdx === -1) titleIdx = 1;
  if (typeIdx === -1) typeIdx = 2;
  if (catIdx === -1) catIdx = 3;
  if (amountIdx === -1) amountIdx = 4;
  if (pmIdx === -1) pmIdx = 5;
  if (noteIdx === -1) noteIdx = 6;

  const transactions: Transaction[] = [];
  const now = Date.now();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    if (cols.length < 2) continue;

    const rawDate = cols[dateIdx] || '';
    const title = cols[titleIdx] || 'Untitled';
    const rawType = (cols[typeIdx] || '').toLowerCase();
    const categoryName = cols[catIdx] || 'other';
    const amountStr = cols[amountIdx] || '0';
    const paymentMethod = cols[pmIdx] || 'UPI';
    const note = cols[noteIdx] || '';

    // Standardize ISO date (YYYY-MM-DD)
    let cleanDate = rawDate;
    if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
      cleanDate = rawDate.slice(0, 10);
    } else if (rawDate.includes('/')) {
      const parts = rawDate.split('/');
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          cleanDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
    }
    if (!cleanDate) {
      cleanDate = new Date().toISOString().slice(0, 10);
    }

    const cleanAmount = parseFloat(amountStr.replace(/[^0-9.-]/g, '')) || 0;
    const catId = categoryMap[categoryName] || categoryName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const isIncome = rawType.includes('income') || rawType.includes('credit') || rawType.includes('varavu');
    const dateBase = new Date(cleanDate + 'T12:00:00Z').getTime() || now;
    const createdAt = dateBase + (lines.length - i) * 1000;

    const uniqueId = `tx-${cleanDate.replace(/[^0-9]/g, '')}-${now}-${String(i).padStart(3, '0')}-${Math.random().toString(36).slice(2, 6)}`;

    transactions.push({
      id: uniqueId,
      title: title || 'Untitled',
      amount: Math.abs(cleanAmount),
      type: isIncome ? 'income' : 'expense',
      category: catId || 'other',
      date: cleanDate,
      note: note || '',
      paymentMethod: (paymentMethod as any) || 'UPI',
      createdAt: createdAt,
    });
  }

  return transactions;
}

