import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Plus } from 'lucide-react';
import { AppState, Transaction, Subscription, Category, SplitExpense, PaymentMethod, SplitGroup, Friend, PendingTransaction } from './types';
import { 
  getInitialState, 
  saveState, 
  getMonthKey, 
  getAvailableMonths, 
  SEED_TRANSACTIONS, 
  DEFAULT_CATEGORIES, 
  SEED_SUBSCRIPTIONS, 
  SEED_FRIENDS, 
  SEED_SPLIT_EXPENSES,
  generateWebhookKey
} from './utils/storage';
import { calculateBalances } from './utils/splitEngine';
import { useAuth } from './utils/AuthContext';
import { 
  subscribeToUserData, 
  syncUserProfile, 
  saveUserSettingsToFirestore,
  saveTransactionToFirestore,
  deleteTransactionFromFirestore,
  saveSubscriptionToFirestore,
  deleteSubscriptionFromFirestore,
  saveFriendToFirestore,
  deleteFriendFromFirestore,
  saveSplitGroupToFirestore,
  deleteSplitGroupFromFirestore,
  saveSplitExpenseToFirestore,
  deleteSplitExpenseFromFirestore,
  saveCategoryToFirestore,
  deleteCategoryFromFirestore,
  migrateLocalStateToFirestore,
  savePendingTransactionToFirestore,
  batchSavePendingTransactionsToFirestore,
  deletePendingTransactionFromFirestore,
  clearAllPendingTransactionsFromFirestore
} from './utils/firestoreSync';
import { parseSpreadsheetTransactions } from './utils/csvSyncEngine';
import { getApiUrl, getApiBaseUrl } from './utils/apiConfig';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { DashboardView } from './components/DashboardView';
import { HistoryView } from './components/HistoryView';
import { AnalyticsView } from './components/AnalyticsView';
import { SplitView } from './components/SplitView';
import { SubscriptionsView } from './components/SubscriptionsView';
import { SettingsView } from './components/SettingsView';
import { TransactionModal } from './components/TransactionModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { SplashScreen } from './components/SplashScreen';
import { ConfirmDialog } from './components/ConfirmDialog';
import { AuthModal } from './components/AuthModal';
import { PendingInboxModal } from './components/PendingInboxModal';
import { IPhoneShortcutGuideModal } from './components/IPhoneShortcutGuideModal';

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [state, setState] = useState<AppState>(() => getInitialState());
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getMonthKey(new Date()));
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [isPendingInboxOpen, setIsPendingInboxOpen] = useState(false);
  const [isShortcutGuideOpen, setIsShortcutGuideOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const hasMigratedRef = useRef<string | null>(null);
  const prevUserRef = useRef<string | null>(null);

  // Auth modal openers
  const handleOpenLogin = useCallback(() => {
    setAuthModalMode('login');
    setIsAuthModalOpen(true);
  }, []);

  const handleOpenSignUp = useCallback(() => {
    setAuthModalMode('signup');
    setIsAuthModalOpen(true);
  }, []);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  } | null>(null);

  // Apply Theme & sync Title
  useEffect(() => {
    const isLight = state.theme === 'light';
    document.documentElement.classList.toggle('light', isLight);
    document.body.classList.toggle('light', isLight);
    document.title = `${state.appName} - Smart Expense & Split Tracker`;
  }, [state.theme, state.appName]);

  // Save state to local cache as reliable offline fallback
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Clean data isolation on user sign out
  useEffect(() => {
    if (prevUserRef.current && !user) {
      // User signed out: reset local state so user data is cleanly isolated
      const cleanResetState: AppState = {
        appName: 'VARAVU&SELAVU',
        currency: 'INR',
        budgetLimit: 0,
        theme: state.theme,
        activeTab: 'dashboard',
        transactions: [],
        categories: DEFAULT_CATEGORIES,
        subscriptions: [],
        friends: [],
        splitExpenses: [],
        splitGroups: [],
        pendingTransactions: [],
      };
      setState(cleanResetState);
      saveState(cleanResetState);
      hasMigratedRef.current = null;
    }
    prevUserRef.current = user?.uid || null;
  }, [user, state.theme]);

  // Synchronize with Firebase Firestore whenever user is logged in
  useEffect(() => {
    if (!user) {
      hasMigratedRef.current = null;
      return;
    }

    // Sync profile
    syncUserProfile(user.uid, user.email || '', user.displayName || undefined, user.photoURL || undefined);

    // Initial check: if local storage has existing transactions/groups and this is a first sign-in, offer background migration
    if (hasMigratedRef.current !== user.uid) {
      hasMigratedRef.current = user.uid;
      const currentLocal = getInitialState();
      // Only migrate if there are local guest transactions
      if (currentLocal.transactions.length > 0 || currentLocal.friends.length > 0 || currentLocal.splitGroups.length > 0) {
        migrateLocalStateToFirestore(user.uid, currentLocal);
      }
    }

    // Subscribe to realtime updates from Firestore
    const unsubscribe = subscribeToUserData(user.uid, {
      onSettings: (settings) => {
        setState((prev) => ({
          ...prev,
          appName: settings.appName || prev.appName,
          currency: settings.currency || prev.currency,
          budgetLimit: typeof settings.budgetLimit === 'number' ? settings.budgetLimit : prev.budgetLimit,
          theme: settings.theme || prev.theme,
          smsWebhookKey: settings.smsWebhookKey || prev.smsWebhookKey,
        }));
      },
      onTransactions: (transactions) => {
        setState((prev) => ({ ...prev, transactions }));
      },
      onCategories: (categories) => {
        setState((prev) => ({ ...prev, categories }));
      },
      onSubscriptions: (subscriptions) => {
        setState((prev) => ({ ...prev, subscriptions }));
      },
      onFriends: (friends) => {
        setState((prev) => ({ ...prev, friends }));
      },
      onSplitGroups: (splitGroups) => {
        setState((prev) => ({ ...prev, splitGroups }));
      },
      onSplitExpenses: (splitExpenses) => {
        setState((prev) => ({ ...prev, splitExpenses }));
      },
      onPendingTransactions: (pendingTransactions) => {
        setState((prev) => ({ ...prev, pendingTransactions }));
      },
    });

    return () => unsubscribe();
  }, [user]);

  // Scroll to top when switching views/tabs
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [state.activeTab]);

  // Toast helper
  const addToast = useCallback((text: string, type: ToastMessage['type'] = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Available months list
  const availableMonths = useMemo(() => {
    return getAvailableMonths(state.transactions);
  }, [state.transactions]);

  // Split Debts count for bottom nav badge
  const splitDebtsCount = useMemo(() => {
    const { totalOwedToYou, totalYouOwe } = calculateBalances(state.friends, state.splitExpenses);
    return (totalOwedToYou > 0 ? 1 : 0) + (totalYouOwe > 0 ? 1 : 0);
  }, [state.friends, state.splitExpenses]);

  // Handlers for Transactions
  const handleOpenAddTx = () => {
    setEditingTransaction(null);
    setIsTxModalOpen(true);
  };

  const handleEditTx = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsTxModalOpen(true);
  };

  const handleSaveTransaction = (
    txData: Omit<Transaction, 'id' | 'createdAt'>,
    existingId?: string
  ) => {
    if (existingId) {
      const existing = state.transactions.find((t) => t.id === existingId);
      const updatedTx: Transaction = {
        ...txData,
        id: existingId,
        createdAt: existing?.createdAt || Date.now(),
      };
      setState((prev) => ({
        ...prev,
        transactions: prev.transactions.map((t) =>
          t.id === existingId ? updatedTx : t
        ),
      }));
      if (user) {
        saveTransactionToFirestore(user.uid, updatedTx);
      }
      addToast('Transaction updated', 'success');
    } else {
      const newTx: Transaction = {
        ...txData,
        id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: Date.now(),
      };
      setState((prev) => ({
        ...prev,
        transactions: [newTx, ...prev.transactions],
      }));
      if (user) {
        saveTransactionToFirestore(user.uid, newTx);
      }
      // If transaction date is in another month, optionally update selectedMonth
      const txMonth = newTx.date.slice(0, 7);
      if (txMonth !== selectedMonth) {
        setSelectedMonth(txMonth);
      }
      addToast('Transaction logged', 'success');
    }
  };

  const handleDeleteTransaction = (id: string) => {
    const tx = state.transactions.find((t) => t.id === id);
    setConfirmModal({
      isOpen: true,
      title: 'Delete Transaction',
      message: tx ? `Delete transaction "${tx.title}"?` : 'Delete this transaction?',
      confirmLabel: 'Delete',
      isDestructive: true,
      onConfirm: () => {
        setState((prev) => ({
          ...prev,
          transactions: prev.transactions.filter((t) => t.id !== id),
        }));
        if (user) {
          deleteTransactionFromFirestore(user.uid, id);
        }
        addToast('Transaction deleted', 'info');
      },
    });
  };

  // Handlers for Subscriptions
  const handleAddSubscription = (subData: Omit<Subscription, 'id'>) => {
    const newSub: Subscription = {
      ...subData,
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    setState((prev) => ({
      ...prev,
      subscriptions: [...prev.subscriptions, newSub],
    }));
    if (user) {
      saveSubscriptionToFirestore(user.uid, newSub);
    }
    addToast(`Subscription "${newSub.name}" added`, 'success');
  };

  const handleUpdateSubscription = (id: string, updates: Partial<Subscription>) => {
    const existing = state.subscriptions.find((s) => s.id === id);
    if (existing) {
      const updatedSub: Subscription = { ...existing, ...updates };
      setState((prev) => ({
        ...prev,
        subscriptions: prev.subscriptions.map((s) =>
          s.id === id ? updatedSub : s
        ),
      }));
      if (user) {
        saveSubscriptionToFirestore(user.uid, updatedSub);
      }
    }
    addToast('Subscription updated', 'success');
  };

  const handleDeleteSubscription = (id: string) => {
    const sub = state.subscriptions.find((s) => s.id === id);
    setConfirmModal({
      isOpen: true,
      title: 'Remove Subscription',
      message: sub ? `Remove recurring payment "${sub.name}"?` : 'Remove this subscription?',
      confirmLabel: 'Delete',
      isDestructive: true,
      onConfirm: () => {
        setState((prev) => ({
          ...prev,
          subscriptions: prev.subscriptions.filter((s) => s.id !== id),
        }));
        if (user) {
          deleteSubscriptionFromFirestore(user.uid, id);
        }
        addToast('Subscription removed', 'info');
      },
    });
  };

  const handleLogSubscription = (sub: Subscription) => {
    const dayStr = String(Math.min(28, sub.day)).padStart(2, '0');
    const logDate = `${selectedMonth}-${dayStr}`;

    const newTx: Transaction = {
      id: `tx-sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: `${sub.name} (Recurring)`,
      amount: sub.amount,
      type: 'expense',
      category: sub.category,
      date: logDate,
      paymentMethod: 'Card',
      note: `Recurring bill logged for ${selectedMonth}`,
      createdAt: Date.now(),
    };

    setState((prev) => ({
      ...prev,
      transactions: [newTx, ...prev.transactions],
    }));
    if (user) {
      saveTransactionToFirestore(user.uid, newTx);
    }
    addToast(`Logged "${sub.name}" into ${selectedMonth}`, 'success');
  };

  // Handlers for Friends & Split
  const handleAddFriend = (name: string, note?: string) => {
    const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#14b8a6'];
    const avatarColor = colors[state.friends.length % colors.length];

    const newFriend: Friend = {
      id: `friend-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      note,
      avatarColor,
    };

    setState((prev) => ({
      ...prev,
      friends: [...prev.friends, newFriend],
    }));
    if (user) {
      saveFriendToFirestore(user.uid, newFriend);
    }
    addToast(`Friend ${name} added`, 'success');
  };

  const handleDeleteFriend = (friendId: string) => {
    const friend = state.friends.find((f) => f.id === friendId);
    setConfirmModal({
      isOpen: true,
      title: 'Remove Friend',
      message: friend ? `Remove "${friend.name}" from your friends list?` : 'Remove this friend?',
      confirmLabel: 'Remove',
      isDestructive: true,
      onConfirm: () => {
        setState((prev) => ({
          ...prev,
          friends: prev.friends.filter((f) => f.id !== friendId),
        }));
        if (user) {
          deleteFriendFromFirestore(user.uid, friendId);
        }
        addToast(`Friend removed`, 'info');
      },
    });
  };

  const handleAddSplitExpense = (expense: Omit<SplitExpense, 'id'>) => {
    const newExpense: SplitExpense = {
      ...expense,
      id: `split-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    setState((prev) => ({
      ...prev,
      splitExpenses: [...prev.splitExpenses, newExpense],
    }));
    if (user) {
      saveSplitExpenseToFirestore(user.uid, newExpense);
    }
    addToast(`Split expense "${newExpense.title}" recorded`, 'success');
  };

  const handleDeleteSplitExpense = (expenseId: string) => {
    const exp = state.splitExpenses.find((e) => e.id === expenseId);
    setConfirmModal({
      isOpen: true,
      title: 'Delete Shared Expense',
      message: exp
        ? `Delete shared expense "${exp.title}"? Shared debts and balances will be recalculated immediately.`
        : 'Delete this shared expense?',
      confirmLabel: 'Delete',
      isDestructive: true,
      onConfirm: () => {
        setState((prev) => ({
          ...prev,
          splitExpenses: prev.splitExpenses.filter((e) => e.id !== expenseId),
        }));
        if (user) {
          deleteSplitExpenseFromFirestore(user.uid, expenseId);
        }
        addToast('Shared expense deleted', 'info');
      },
    });
  };

  const handleSettleUp = (
    settlementExpense: SplitExpense,
    logToTransactions: boolean = true,
    paymentMethod: PaymentMethod = 'UPI'
  ) => {
    let createdTx: Transaction | null = null;
    setState((prev) => {
      let updatedTransactions = prev.transactions;
      if (logToTransactions) {
        const isIncomeForUser = settlementExpense.paidBy !== 'YOU';
        const newTx: Transaction = {
          id: `settle-tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: settlementExpense.title,
          amount: settlementExpense.amount,
          type: isIncomeForUser ? 'income' : 'expense',
          category: isIncomeForUser ? 'other' : 'bills',
          date: settlementExpense.date,
          paymentMethod,
          note: settlementExpense.note || 'Debt Settlement',
          createdAt: Date.now(),
        };
        createdTx = newTx;
        updatedTransactions = [newTx, ...prev.transactions];
      }

      return {
        ...prev,
        transactions: updatedTransactions,
        splitExpenses: [...prev.splitExpenses, settlementExpense],
      };
    });

    if (user) {
      saveSplitExpenseToFirestore(user.uid, settlementExpense);
      if (createdTx) {
        saveTransactionToFirestore(user.uid, createdTx);
      }
    }

    addToast(
      logToTransactions
        ? 'Settlement recorded & added to personal transactions!'
        : 'Settlement recorded! Balances updated',
      'success'
    );
  };

  // Handlers for Split Groups
  const handleAddGroup = (groupData: Omit<SplitGroup, 'id' | 'createdAt'>) => {
    const newGroup: SplitGroup = {
      ...groupData,
      id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
    };
    setState((prev) => ({
      ...prev,
      splitGroups: [...(prev.splitGroups || []), newGroup],
    }));
    if (user) {
      saveSplitGroupToFirestore(user.uid, newGroup);
    }
    addToast(`Group "${newGroup.name}" created!`, 'success');
    return newGroup;
  };

  const handleUpdateGroup = (groupId: string, updates: Partial<SplitGroup>) => {
    const existing = (state.splitGroups || []).find((g) => g.id === groupId);
    if (existing) {
      const updatedGroup: SplitGroup = { ...existing, ...updates };
      setState((prev) => ({
        ...prev,
        splitGroups: (prev.splitGroups || []).map((g) =>
          g.id === groupId ? updatedGroup : g
        ),
      }));
      if (user) {
        saveSplitGroupToFirestore(user.uid, updatedGroup);
      }
    }
    addToast('Group updated successfully', 'success');
  };

  const handleToggleCloseGroup = (groupId: string) => {
    let updatedGroup: SplitGroup | null = null;
    setState((prev) => {
      const group = (prev.splitGroups || []).find((g) => g.id === groupId);
      if (!group) return prev;
      const isClosing = group.status === 'active';
      const updated = {
        ...group,
        status: (isClosing ? 'closed' : 'active') as 'active' | 'closed',
        closedAt: isClosing ? Date.now() : undefined,
      };
      updatedGroup = updated;
      const updatedGroups = (prev.splitGroups || []).map((g) =>
        g.id === groupId ? updated : g
      );
      return {
        ...prev,
        splitGroups: updatedGroups,
      };
    });
    if (user && updatedGroup) {
      saveSplitGroupToFirestore(user.uid, updatedGroup);
    }
    addToast('Group status updated', 'info');
  };

  const handleDeleteGroup = (groupId: string) => {
    const group = (state.splitGroups || []).find((g) => g.id === groupId);
    setConfirmModal({
      isOpen: true,
      title: 'Delete Split Group',
      message: group
        ? `Are you sure you want to delete "${group.name}"? All shared expenses logged under this group will also be permanently removed.`
        : 'Are you sure you want to delete this group?',
      confirmLabel: 'Delete Group',
      isDestructive: true,
      onConfirm: () => {
        const groupExpenses = state.splitExpenses.filter((e) => e.groupId === groupId);
        setState((prev) => ({
          ...prev,
          splitGroups: (prev.splitGroups || []).filter((g) => g.id !== groupId),
          splitExpenses: prev.splitExpenses.filter((e) => e.groupId !== groupId),
        }));
        if (user) {
          deleteSplitGroupFromFirestore(user.uid, groupId);
          groupExpenses.forEach((exp) => deleteSplitExpenseFromFirestore(user.uid, exp.id));
        }
        addToast('Group and its expenses deleted', 'info');
      },
    });
  };

  // Settings Handlers
  const handleUpdateSettings = (updates: Partial<AppState>) => {
    setState((prev) => {
      const next = { ...prev, ...updates };
      if (user) {
        saveUserSettingsToFirestore(user.uid, next);
      }
      return next;
    });
  };

  const handleAddCategory = (cat: Category) => {
    setState((prev) => ({
      ...prev,
      categories: [...prev.categories, cat],
    }));
    if (user) {
      saveCategoryToFirestore(user.uid, cat);
    }
  };

  const handleUpdateCategory = (cat: Category) => {
    setState((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => (c.id === cat.id ? cat : c)),
    }));
    if (user) {
      saveCategoryToFirestore(user.uid, cat);
    }
  };

  const handleDeleteCategory = (catId: string) => {
    const cat = state.categories.find((c) => c.id === catId);
    setConfirmModal({
      isOpen: true,
      title: 'Delete Category',
      message: cat ? `Delete category "${cat.name}"? Existing transactions will keep their records.` : 'Delete this category?',
      confirmLabel: 'Delete',
      isDestructive: true,
      onConfirm: () => {
        setState((prev) => ({
          ...prev,
          categories: prev.categories.filter((c) => c.id !== catId),
        }));
        if (user) {
          deleteCategoryFromFirestore(user.uid, catId);
        }
        addToast(cat ? `Category "${cat.name}" deleted` : 'Category deleted', 'info');
      },
    });
  };

  const handleRestoreState = (importedState: AppState) => {
    setState(importedState);
    setSelectedMonth(getMonthKey(new Date()));
  };

  const handleResetAll = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Clear All Data',
      message: 'Are you sure you want to clear all stored data? This will permanently erase all transactions, recurring payments, friends, and split expenses, giving you a fresh, clean ledger.',
      confirmLabel: 'Clear All Data',
      isDestructive: true,
      onConfirm: () => {
        const resetState: AppState = {
          appName: 'VARAVU&SELAVU',
          currency: 'INR',
          budgetLimit: 0,
          theme: state.theme,
          activeTab: 'dashboard',
          transactions: [],
          categories: DEFAULT_CATEGORIES,
          subscriptions: [],
          friends: [],
          splitExpenses: [],
          splitGroups: [],
          pendingTransactions: [],
        };
        setState(resetState);
        setSelectedMonth(getMonthKey(new Date()));
        addToast('All data cleared successfully. Fresh start ready!', 'info');
      },
    });
  };

  // Pending Transactions Handlers (iPhone & CSV Automation Sync)
  const handleApprovePendingSingle = (pending: PendingTransaction) => {
    const txId = pending.id.startsWith('sync_')
      ? pending.id.replace('sync_', 'tx_')
      : `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const newTx: Transaction = {
      id: txId,
      title: pending.title,
      amount: pending.amount,
      type: 'expense',
      category: pending.category,
      date: pending.date,
      note: pending.note,
      paymentMethod: pending.paymentMethod || 'UPI',
      createdAt: Date.now(),
    };

    let createdSplitExp: SplitExpense | null = null;
    if (pending.isSplit && pending.splitWithMemberIds && pending.splitWithMemberIds.length > 1) {
      const count = pending.splitWithMemberIds.length;
      const splitAmount = Math.round((pending.amount / count) * 100) / 100;
      const shares = pending.splitWithMemberIds.map((memId) => {
        const friend = state.friends.find((f) => f.id === memId);
        return {
          personId: memId,
          personName: memId === 'YOU' ? 'You' : (friend?.name || 'Friend'),
          amount: splitAmount,
        };
      });

      createdSplitExp = {
        id: `split-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        groupId: pending.splitGroupId,
        title: pending.title,
        amount: pending.amount,
        date: pending.date,
        paidBy: 'YOU',
        paidByName: 'You',
        shares,
        note: `Auto-split from ${pending.title} (iPhone debit)`,
      };
    }

    setState((prev) => ({
      ...prev,
      transactions: [newTx, ...prev.transactions],
      splitExpenses: createdSplitExp ? [...prev.splitExpenses, createdSplitExp] : prev.splitExpenses,
      pendingTransactions: (prev.pendingTransactions || []).filter((p) => p.id !== pending.id),
    }));

    if (user) {
      saveTransactionToFirestore(user.uid, newTx);
      deletePendingTransactionFromFirestore(user.uid, pending.id);
      if (createdSplitExp) {
        saveSplitExpenseToFirestore(user.uid, createdSplitExp);
      }
    }

    addToast(`Approved expense "${newTx.title}" (-₹${newTx.amount})`, 'success');
  };

  const handleApprovePendingAll = (items: PendingTransaction[]) => {
    if (!items.length) return;

    const newTxs: Transaction[] = [];
    const newSplits: SplitExpense[] = [];
    const itemIds = new Set(items.map((i) => i.id));

    items.forEach((pending) => {
      const txId = pending.id.startsWith('sync_')
        ? pending.id.replace('sync_', 'tx_')
        : `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      const newTx: Transaction = {
        id: txId,
        title: pending.title,
        amount: pending.amount,
        type: 'expense',
        category: pending.category,
        date: pending.date,
        note: pending.note,
        paymentMethod: pending.paymentMethod || 'UPI',
        createdAt: Date.now(),
      };
      newTxs.push(newTx);

      if (pending.isSplit && pending.splitWithMemberIds && pending.splitWithMemberIds.length > 1) {
        const count = pending.splitWithMemberIds.length;
        const splitAmount = Math.round((pending.amount / count) * 100) / 100;
        const shares = pending.splitWithMemberIds.map((memId) => {
          const friend = state.friends.find((f) => f.id === memId);
          return {
            personId: memId,
            personName: memId === 'YOU' ? 'You' : (friend?.name || 'Friend'),
            amount: splitAmount,
          };
        });

        newSplits.push({
          id: `split-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          groupId: pending.splitGroupId,
          title: pending.title,
          amount: pending.amount,
          date: pending.date,
          paidBy: 'YOU',
          paidByName: 'You',
          shares,
          note: `Auto-split from ${pending.title}`,
        });
      }
    });

    setState((prev) => ({
      ...prev,
      transactions: [...newTxs, ...prev.transactions],
      splitExpenses: [...newSplits, ...prev.splitExpenses],
      pendingTransactions: (prev.pendingTransactions || []).filter((p) => !itemIds.has(p.id)),
    }));

    if (user) {
      newTxs.forEach((tx) => saveTransactionToFirestore(user.uid, tx));
      newSplits.forEach((sp) => saveSplitExpenseToFirestore(user.uid, sp));
      items.forEach((p) => deletePendingTransactionFromFirestore(user.uid, p.id));
    }

    addToast(`Approved all ${items.length} automated debit expenses!`, 'success');
  };

  const handleDismissPendingSingle = (id: string) => {
    setState((prev) => ({
      ...prev,
      pendingTransactions: (prev.pendingTransactions || []).filter((p) => p.id !== id),
    }));
    if (user) {
      deletePendingTransactionFromFirestore(user.uid, id);
    }
    addToast('Pending transaction dismissed', 'info');
  };

  const handleDismissAllPending = () => {
    const count = state.pendingTransactions?.length || 0;
    if (count === 0) return;
    setConfirmModal({
      isOpen: true,
      title: 'Clear All Pending Items',
      message: `Dismiss all ${count} unreviewed pending transactions? They will not be recorded in your expenses.`,
      confirmLabel: 'Clear Pending',
      isDestructive: true,
      onConfirm: () => {
        const toDelete = state.pendingTransactions || [];
        setState((prev) => ({
          ...prev,
          pendingTransactions: [],
        }));
        if (user) {
          clearAllPendingTransactionsFromFirestore(user.uid, toDelete);
        }
        addToast(`Cleared ${count} pending debits`, 'info');
      },
    });
  };

  const handleUpdatePendingItem = (id: string, updates: Partial<PendingTransaction>) => {
    setState((prev) => {
      const list = prev.pendingTransactions || [];
      const updated = list.map((item) => (item.id === id ? { ...item, ...updates } : item));
      const targetItem = updated.find((i) => i.id === id);
      if (user && targetItem) {
        savePendingTransactionToFirestore(user.uid, targetItem);
      }
      return {
        ...prev,
        pendingTransactions: updated,
      };
    });
  };

  const handleImportCsv = (csvContent: string) => {
    const result = parseSpreadsheetTransactions(
      csvContent,
      state.categories,
      state.transactions,
      state.pendingTransactions || []
    );

    if (result.newTransactions.length > 0) {
      setState((prev) => ({
        ...prev,
        pendingTransactions: [...(prev.pendingTransactions || []), ...result.newTransactions],
      }));
      if (user) {
        batchSavePendingTransactionsToFirestore(user.uid, result.newTransactions);
      }
      setIsPendingInboxOpen(true);
      addToast(
        `Added ${result.newTransactions.length} automated debit(s) to inbox!${
          result.duplicateCount > 0 ? ` (${result.duplicateCount} duplicates skipped)` : ''
        }`,
        'success'
      );
    } else if (result.duplicateCount > 0) {
      addToast(`All ${result.duplicateCount} transactions were already recorded!`, 'info');
    } else {
      addToast('No new transactions found in sheet.', 'error');
    }
  };

  const [isRefreshingWebhook, setIsRefreshingWebhook] = useState(false);

  const fetchSmsFromWebhookQueue = useCallback(async (isManual: boolean = false) => {
    const key = state.smsWebhookKey;
    if (!key) return;

    if (isManual) {
      setIsRefreshingWebhook(true);
    }

    try {
      const inboxUrl = getApiUrl(`/api/sms-inbox?key=${encodeURIComponent(key)}`, state.customWebhookServerUrl);
      const res = await fetch(inboxUrl);
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }
      const data = await res.json();
      const incoming: PendingTransaction[] = data.transactions || [];

      if (incoming.length > 0) {
        const existingPendingIds = new Set((state.pendingTransactions || []).map((p) => p.id));
        const existingTxIds = new Set(state.transactions.map((t) => t.id));

        const brandNew = incoming.filter((item) => !existingPendingIds.has(item.id) && !existingTxIds.has(item.id));

        if (brandNew.length > 0) {
          setState((prev) => ({
            ...prev,
            pendingTransactions: [...brandNew, ...(prev.pendingTransactions || [])],
          }));

          if (user) {
            batchSavePendingTransactionsToFirestore(user.uid, brandNew);
          }

          // Acknowledge these items so server queue clears them
          const ackUrl = getApiUrl('/api/sms-inbox/ack', state.customWebhookServerUrl);
          await fetch(ackUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, ids: incoming.map((i) => i.id) }),
          });

          addToast(
            `⚡ Captured ${brandNew.length} new debit SMS from iPhone!`,
            'success'
          );
        }
      } else if (isManual) {
        addToast('No new debit SMS in queue. Everything is up to date!', 'info');
      }
    } catch {
      if (isManual) {
        const serverHost = getApiBaseUrl(state.customWebhookServerUrl).replace(/^https?:\/\//, '');
        addToast(`Could not reach webhook server queue (${serverHost})`, 'error');
      }
    } finally {
      if (isManual) {
        setIsRefreshingWebhook(false);
      }
    }
  }, [state.smsWebhookKey, state.customWebhookServerUrl, state.pendingTransactions, state.transactions, user, addToast]);

  // Periodic polling for incoming iPhone SMS (every 8 seconds when window is active)
  useEffect(() => {
    fetchSmsFromWebhookQueue(false);

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchSmsFromWebhookQueue(false);
      }
    }, 8000);

    const handleFocus = () => fetchSmsFromWebhookQueue(false);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchSmsFromWebhookQueue]);

  const handleRegenerateWebhookKey = () => {
    const newKey = generateWebhookKey();
    setState((prev) => {
      const next = { ...prev, smsWebhookKey: newKey };
      if (user) {
        saveUserSettingsToFirestore(user.uid, next);
      }
      return next;
    });
    addToast('New SMS Webhook key generated!', 'info');
  };

  const handleAddDirectPending = (item: PendingTransaction) => {
    setState((prev) => ({
      ...prev,
      pendingTransactions: [item, ...(prev.pendingTransactions || [])],
    }));
    if (user) {
      savePendingTransactionToFirestore(user.uid, item);
    }
    addToast(`Added ₹${item.amount} at ${item.title} to inbox!`, 'success');
  };

  const handleSendSimulatedSms = async (text: string) => {
    try {
      const webhookUrl = getApiUrl('/api/sms-webhook', state.customWebhookServerUrl);
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, key: state.smsWebhookKey }),
      });
      await fetchSmsFromWebhookQueue(false);
      setIsPendingInboxOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 light:bg-slate-50 text-slate-100 light:text-slate-900 transition-colors duration-200 pb-24 sm:pb-28">
      {/* Top Navigation */}
      <Navbar
        appName={state.appName}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        availableMonths={availableMonths}
        theme={state.theme}
        onThemeToggle={() =>
          handleUpdateSettings({ theme: state.theme === 'dark' ? 'light' : 'dark' })
        }
        onOpenAddModal={handleOpenAddTx}
        onOpenAuthModal={handleOpenLogin}
        onOpenLogin={handleOpenLogin}
        onOpenSignUp={handleOpenSignUp}
        onOpenPendingInbox={() => setIsPendingInboxOpen(true)}
        pendingCount={state.pendingTransactions?.length || 0}
      />

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        {state.activeTab === 'dashboard' && (
          <DashboardView
            transactions={state.transactions}
            categories={state.categories}
            subscriptions={state.subscriptions}
            selectedMonth={selectedMonth}
            currency={state.currency}
            budgetLimit={state.budgetLimit}
            pendingTransactions={state.pendingTransactions || []}
            onNavigateTab={(tab) => handleUpdateSettings({ activeTab: tab })}
            onOpenAddModal={handleOpenAddTx}
            onEditTransaction={handleEditTx}
            onDeleteTransaction={handleDeleteTransaction}
            onLogSubscription={handleLogSubscription}
            onOpenPendingInbox={() => setIsPendingInboxOpen(true)}
            onOpenShortcutGuide={() => setIsShortcutGuideOpen(true)}
          />
        )}

        {state.activeTab === 'history' && (
          <HistoryView
            transactions={state.transactions}
            categories={state.categories}
            selectedMonth={selectedMonth}
            currency={state.currency}
            appName={state.appName}
            onOpenAddModal={handleOpenAddTx}
            onEditTransaction={handleEditTx}
            onDeleteTransaction={handleDeleteTransaction}
          />
        )}

        {state.activeTab === 'analytics' && (
          <AnalyticsView
            transactions={state.transactions}
            categories={state.categories}
            selectedMonth={selectedMonth}
            currency={state.currency}
            onNavigateTab={(tab) => handleUpdateSettings({ activeTab: tab })}
          />
        )}

        {state.activeTab === 'split' && (
          <SplitView
            friends={state.friends}
            splitExpenses={state.splitExpenses}
            splitGroups={state.splitGroups || []}
            currency={state.currency}
            onAddFriend={handleAddFriend}
            onDeleteFriend={handleDeleteFriend}
            onAddSplitExpense={handleAddSplitExpense}
            onDeleteSplitExpense={handleDeleteSplitExpense}
            onSettleUp={handleSettleUp}
            onAddGroup={handleAddGroup}
            onUpdateGroup={handleUpdateGroup}
            onToggleCloseGroup={handleToggleCloseGroup}
            onDeleteGroup={handleDeleteGroup}
          />
        )}

        {state.activeTab === 'subscriptions' && (
          <SubscriptionsView
            subscriptions={state.subscriptions}
            categories={state.categories}
            currency={state.currency}
            selectedMonth={selectedMonth}
            transactions={state.transactions}
            onAddSubscription={handleAddSubscription}
            onUpdateSubscription={handleUpdateSubscription}
            onDeleteSubscription={handleDeleteSubscription}
            onLogSubscription={handleLogSubscription}
          />
        )}

        {state.activeTab === 'settings' && (
          <SettingsView
            state={state}
            onUpdateSettings={handleUpdateSettings}
            onAddCategory={handleAddCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
            onRestoreState={handleRestoreState}
            onResetAll={handleResetAll}
            onShowToast={addToast}
            onOpenLogin={handleOpenLogin}
            onOpenSignUp={handleOpenSignUp}
            onOpenPendingInbox={() => setIsPendingInboxOpen(true)}
            onOpenShortcutGuide={() => setIsShortcutGuideOpen(true)}
          />
        )}
      </main>

      {/* Floating Action Button (FAB) for Quick Transaction Entry */}
      <button
        onClick={handleOpenAddTx}
        className="fixed right-4 sm:right-8 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:bottom-24 z-50 w-14 h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/40 flex items-center justify-center transition-all hover:scale-105 active:scale-95 group focus:outline-none focus:ring-2 focus:ring-indigo-400"
        title="Add Transaction"
        aria-label="Add Transaction"
      >
        <Plus className="w-6 h-6 transition-transform group-hover:rotate-90" />
      </button>

      {/* Bottom Mobile Navigation */}
      <BottomNav
        activeTab={state.activeTab}
        onTabChange={(tab) => handleUpdateSettings({ activeTab: tab })}
        splitDebtsCount={splitDebtsCount}
      />

      {/* Pending Debit Review Inbox Modal */}
      <PendingInboxModal
        isOpen={isPendingInboxOpen}
        onClose={() => setIsPendingInboxOpen(false)}
        pendingTransactions={state.pendingTransactions || []}
        categories={state.categories}
        splitGroups={state.splitGroups || []}
        friends={state.friends}
        currency={state.currency}
        existingTransactions={state.transactions}
        onApproveSingle={handleApprovePendingSingle}
        onApproveAll={handleApprovePendingAll}
        onDismissSingle={handleDismissPendingSingle}
        onDismissAll={handleDismissAllPending}
        onUpdatePendingItem={handleUpdatePendingItem}
        onImportCsv={handleImportCsv}
        onAddDirectPending={handleAddDirectPending}
        onOpenGuide={() => setIsShortcutGuideOpen(true)}
        onRefreshWebhook={() => fetchSmsFromWebhookQueue(true)}
        isRefreshing={isRefreshingWebhook}
      />

      {/* iPhone Shortcuts Automation Setup Guide Modal */}
      <IPhoneShortcutGuideModal
        isOpen={isShortcutGuideOpen}
        onClose={() => setIsShortcutGuideOpen(false)}
        smsWebhookKey={state.smsWebhookKey}
        onRegenerateKey={handleRegenerateWebhookKey}
        onSendSimulatedSms={handleSendSimulatedSms}
        currency={state.currency}
        customWebhookServerUrl={state.customWebhookServerUrl}
        onUpdateServerUrl={(url) => handleUpdateSettings({ customWebhookServerUrl: url })}
      />

      {/* Transaction Modal (Form & Smart SMS auto-fill) */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        onSave={handleSaveTransaction}
        initialTransaction={editingTransaction}
        categories={state.categories}
        currency={state.currency}
      />

      {/* Floating Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* In-App Confirmation Dialog */}
      {confirmModal && (
        <ConfirmDialog
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          isDestructive={confirmModal.isDestructive}
          onConfirm={() => {
            confirmModal.onConfirm();
            setConfirmModal(null);
          }}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {/* Authentication Modal (Login / Create Account) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        appName={state.appName}
        initialMode={authModalMode}
        onSuccess={(msg) => addToast(msg, 'success')}
      />

      {/* Splash Screen on Launch */}
      {showSplash && (
        <SplashScreen
          appName={state.appName}
          onComplete={() => setShowSplash(false)}
        />
      )}
    </div>
  );
}
