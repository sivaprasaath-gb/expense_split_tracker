import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { AppState, Transaction, Subscription, Category, SplitExpense, PaymentMethod, SplitGroup } from './types';
import { 
  getInitialState, 
  saveState, 
  getMonthKey, 
  getAvailableMonths, 
  SEED_TRANSACTIONS, 
  DEFAULT_CATEGORIES, 
  SEED_SUBSCRIPTIONS, 
  SEED_FRIENDS, 
  SEED_SPLIT_EXPENSES 
} from './utils/storage';
import { calculateBalances } from './utils/splitEngine';
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

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [state, setState] = useState<AppState>(() => getInitialState());
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getMonthKey(new Date()));
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

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

  // Save state on change
  useEffect(() => {
    saveState(state);
  }, [state]);

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
      setState((prev) => ({
        ...prev,
        transactions: prev.transactions.map((t) =>
          t.id === existingId
            ? { ...t, ...txData }
            : t
        ),
      }));
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
    addToast(`Subscription "${newSub.name}" added`, 'success');
  };

  const handleUpdateSubscription = (id: string, updates: Partial<Subscription>) => {
    setState((prev) => ({
      ...prev,
      subscriptions: prev.subscriptions.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    }));
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
    addToast(`Logged "${sub.name}" into ${selectedMonth}`, 'success');
  };

  // Handlers for Friends & Split
  const handleAddFriend = (name: string, note?: string) => {
    const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#14b8a6'];
    const avatarColor = colors[state.friends.length % colors.length];

    const newFriend = {
      id: `friend-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      note,
      avatarColor,
    };

    setState((prev) => ({
      ...prev,
      friends: [...prev.friends, newFriend],
    }));
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
        addToast('Shared expense deleted', 'info');
      },
    });
  };

  const handleSettleUp = (
    settlementExpense: SplitExpense,
    logToTransactions: boolean = true,
    paymentMethod: PaymentMethod = 'UPI'
  ) => {
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
        updatedTransactions = [newTx, ...prev.transactions];
      }

      return {
        ...prev,
        transactions: updatedTransactions,
        splitExpenses: [...prev.splitExpenses, settlementExpense],
      };
    });

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
    addToast(`Group "${newGroup.name}" created!`, 'success');
    return newGroup;
  };

  const handleUpdateGroup = (groupId: string, updates: Partial<SplitGroup>) => {
    setState((prev) => ({
      ...prev,
      splitGroups: (prev.splitGroups || []).map((g) =>
        g.id === groupId ? { ...g, ...updates } : g
      ),
    }));
    addToast('Group updated successfully', 'success');
  };

  const handleToggleCloseGroup = (groupId: string) => {
    setState((prev) => {
      const group = (prev.splitGroups || []).find((g) => g.id === groupId);
      if (!group) return prev;
      const isClosing = group.status === 'active';
      const updatedGroups = (prev.splitGroups || []).map((g) =>
        g.id === groupId
          ? {
              ...g,
              status: (isClosing ? 'closed' : 'active') as 'active' | 'closed',
              closedAt: isClosing ? Date.now() : undefined,
            }
          : g
      );
      return {
        ...prev,
        splitGroups: updatedGroups,
      };
    });
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
        setState((prev) => ({
          ...prev,
          splitGroups: (prev.splitGroups || []).filter((g) => g.id !== groupId),
          splitExpenses: prev.splitExpenses.filter((e) => e.groupId !== groupId),
        }));
        addToast('Group and its expenses deleted', 'info');
      },
    });
  };

  // Settings Handlers
  const handleUpdateSettings = (updates: Partial<AppState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const handleAddCategory = (cat: Category) => {
    setState((prev) => ({
      ...prev,
      categories: [...prev.categories, cat],
    }));
  };

  const handleUpdateCategory = (cat: Category) => {
    setState((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => (c.id === cat.id ? cat : c)),
    }));
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
        };
        setState(resetState);
        setSelectedMonth(getMonthKey(new Date()));
        addToast('All data cleared successfully. Fresh start ready!', 'info');
      },
    });
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
            onNavigateTab={(tab) => handleUpdateSettings({ activeTab: tab })}
            onOpenAddModal={handleOpenAddTx}
            onEditTransaction={handleEditTx}
            onDeleteTransaction={handleDeleteTransaction}
            onLogSubscription={handleLogSubscription}
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
