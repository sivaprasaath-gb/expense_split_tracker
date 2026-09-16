export type TransactionType = 'expense' | 'income';

export type PaymentMethod = 'UPI' | 'Card' | 'Cash' | 'NetBanking' | 'Other';

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string; // YYYY-MM-DD
  note?: string;
  paymentMethod?: PaymentMethod;
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  budget: number; // 0 = no budget set
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  day: number; // Day of month 1 - 31
  category: string;
  active: boolean;
  notes?: string;
}

export interface Friend {
  id: string;
  name: string;
  note?: string;
  avatarColor?: string;
}

export interface SplitGroup {
  id: string;
  name: string;
  description?: string;
  icon?: string; // e.g., ✈️, 🏠, 🍔, 🎉, 💼, 🚗
  memberIds: string[]; // List of friend IDs plus 'YOU'
  status: 'active' | 'closed';
  createdAt: number;
  closedAt?: number;
}

export interface SplitShare {
  personId: string; // 'YOU' or friend.id
  personName: string;
  amount: number;
}

export interface SplitExpense {
  id: string;
  groupId?: string; // Optional group reference
  title: string;
  amount: number;
  date: string; // YYYY-MM-DD
  paidBy: string; // 'YOU' or friend.id
  paidByName: string;
  shares: SplitShare[];
  note?: string;
  isSettlement?: boolean;
}

export interface FriendBalance {
  friend: Friend;
  netBalance: number; // >0 means Friend owes You, <0 means You owe Friend, 0 means settled
  totalOwedToYou: number;
  totalYouOwe: number;
}

export interface AppState {
  appName: string;
  currency: string;
  budgetLimit: number;
  theme: 'dark' | 'light';
  activeTab: 'dashboard' | 'history' | 'analytics' | 'split' | 'subscriptions' | 'settings';
  transactions: Transaction[];
  categories: Category[];
  subscriptions: Subscription[];
  friends: Friend[];
  splitExpenses: SplitExpense[];
  splitGroups: SplitGroup[];
}
