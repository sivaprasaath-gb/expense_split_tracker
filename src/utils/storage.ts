import { AppState, Category, Transaction, Subscription, Friend, SplitExpense } from '../types';

export const STORAGE_KEY = 'varavu_selavu_state_v1';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food', name: 'Food & Dining', icon: '🍔', color: '#f97316', budget: 0 },
  { id: 'shopping', name: 'Shopping', icon: '🛍️', color: '#ec4899', budget: 0 },
  { id: 'transport', name: 'Transport & Fuel', icon: '🚗', color: '#0ea5e9', budget: 0 },
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
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
  return defaultState;
}

export function normalizeState(raw: Partial<AppState>): AppState {
  const rawName = raw.appName?.trim();
  const cleanName = (!rawName || rawName === 'Spendr' || rawName === 'VARU&SELAVU') 
    ? 'VARAVU&SELAVU' 
    : rawName;

  return {
    appName: cleanName,
    currency: raw.currency || 'INR',
    budgetLimit: typeof raw.budgetLimit === 'number' ? raw.budgetLimit : 0,
    theme: raw.theme === 'light' ? 'light' : 'dark',
    activeTab: raw.activeTab || 'dashboard',
    transactions: Array.isArray(raw.transactions) ? raw.transactions : [],
    categories: Array.isArray(raw.categories) && raw.categories.length > 0
      ? raw.categories
      : DEFAULT_CATEGORIES,
    subscriptions: Array.isArray(raw.subscriptions) ? raw.subscriptions : [],
    friends: Array.isArray(raw.friends) ? raw.friends : [],
    splitExpenses: Array.isArray(raw.splitExpenses) ? raw.splitExpenses : [],
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
