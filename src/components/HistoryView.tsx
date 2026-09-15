import React, { useState, useMemo } from 'react';
import { 
  Search, 
  X, 
  ArrowDownUp, 
  Download, 
  Pencil, 
  Trash2, 
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar
} from 'lucide-react';
import { Transaction, Category } from '../types';
import { formatCurrency } from '../utils/currency';
import { exportTransactionsToCsv, getMonthLabel, formatDisplayDate } from '../utils/storage';

interface HistoryViewProps {
  transactions: Transaction[];
  categories: Category[];
  selectedMonth: string;
  currency: string;
  appName: string;
  onOpenAddModal: () => void;
  onEditTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  transactions,
  categories,
  selectedMonth,
  currency,
  appName,
  onOpenAddModal,
  onEditTransaction,
  onDeleteTransaction,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<'month' | 'all'>('month');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

  const catMap = useMemo(() => {
    return new Map(categories.map(c => [c.id, c]));
  }, [categories]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // Month scope
      if (scopeFilter === 'month') {
        if (!tx.date || tx.date.slice(0, 7) !== selectedMonth) {
          return false;
        }
      }

      // Type filter
      if (typeFilter !== 'all' && tx.type !== typeFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && tx.category !== categoryFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const cat = catMap.get(tx.category)?.name.toLowerCase() || '';
        const titleMatch = (tx.title || '').toLowerCase().includes(q);
        const noteMatch = (tx.note || '').toLowerCase().includes(q);
        const catMatch = cat.includes(q);
        const methodMatch = (tx.paymentMethod || '').toLowerCase().includes(q);
        return titleMatch || noteMatch || catMatch || methodMatch;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'date-desc') {
        return (b.date + b.createdAt).localeCompare(a.date + a.createdAt);
      }
      if (sortBy === 'date-asc') {
        return (a.date + a.createdAt).localeCompare(b.date + b.createdAt);
      }
      if (sortBy === 'amount-desc') {
        return b.amount - a.amount;
      }
      if (sortBy === 'amount-asc') {
        return a.amount - b.amount;
      }
      return 0;
    });
  }, [transactions, selectedMonth, scopeFilter, typeFilter, categoryFilter, searchQuery, sortBy, catMap]);

  // Aggregate stats for filtered
  const totalFilteredIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);

  const totalFilteredExpense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);

  // Group by Date
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filteredTransactions.forEach(tx => {
      const dateKey = tx.date || 'Unknown';
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(tx);
    });
    return groups;
  }, [filteredTransactions]);

  const handleExportCsv = () => {
    exportTransactionsToCsv(filteredTransactions, categories, appName);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header & Controls Bar */}
      <div className="p-4 sm:p-5 rounded-2xl border border-slate-800 light:border-slate-200 bg-slate-900/60 light:bg-white shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-100 light:text-slate-900">
              Transaction History
            </h2>
            <p className="text-xs text-slate-400">
              {scopeFilter === 'month' ? `Filtered to ${getMonthLabel(selectedMonth)}` : 'All time records'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700/60 light:border-slate-200 bg-slate-800 light:bg-slate-100 text-xs font-semibold text-slate-300 light:text-slate-700 hover:text-white transition-colors"
              title="Download CSV of current filter"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search merchant, category, note, or UPI..."
            className="w-full bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-slate-100 light:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Controls: Scope, Type, Sort */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {/* Scope Toggle */}
          <div className="flex rounded-xl bg-slate-950 light:bg-slate-100 p-1 border border-slate-800 light:border-slate-200 text-xs">
            <button
              onClick={() => setScopeFilter('month')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                scopeFilter === 'month'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setScopeFilter('all')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                scopeFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Time
            </button>
          </div>

          {/* Type Toggle */}
          <div className="flex rounded-xl bg-slate-950 light:bg-slate-100 p-1 border border-slate-800 light:border-slate-200 text-xs">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold ${
                typeFilter === 'all' ? 'bg-slate-800 light:bg-slate-200 text-white light:text-slate-900' : 'text-slate-400'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setTypeFilter('expense')}
              className={`px-2.5 py-1 rounded-lg font-semibold ${
                typeFilter === 'expense' ? 'bg-rose-500/20 text-rose-300' : 'text-slate-400'
              }`}
            >
              Expenses
            </button>
            <button
              onClick={() => setTypeFilter('income')}
              className={`px-2.5 py-1 rounded-lg font-semibold ${
                typeFilter === 'income' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400'
              }`}
            >
              Income
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <ArrowDownUp className="w-3.5 h-3.5" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-200 rounded-lg px-2 py-1 text-slate-200 light:text-slate-800 cursor-pointer focus:outline-none"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Amount: High to Low</option>
              <option value="amount-asc">Amount: Low to High</option>
            </select>
          </div>
        </div>

        {/* Category Horizontal Chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar scrollbar-none">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all border ${
              categoryFilter === 'all'
                ? 'bg-slate-100 light:bg-slate-900 text-slate-950 light:text-white border-transparent'
                : 'bg-slate-950/60 light:bg-slate-100 text-slate-400 border-slate-800 light:border-slate-200 hover:text-slate-200'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => {
            const isSelected = categoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all border ${
                  isSelected
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow-sm'
                    : 'bg-slate-950/60 light:bg-slate-100 text-slate-400 border-slate-800 light:border-slate-200 hover:text-slate-200'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Filtered Result Metrics */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80 light:border-slate-200">
          <span>{filteredTransactions.length} transaction(s) found</span>
          <div className="flex gap-3">
            <span className="text-emerald-400">+{formatCurrency(totalFilteredIncome, currency)}</span>
            <span className="text-rose-400">-{formatCurrency(totalFilteredExpense, currency)}</span>
          </div>
        </div>
      </div>

      {/* Grouped Transactions List */}
      {filteredTransactions.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-slate-800 light:border-slate-200 bg-slate-900/40 text-slate-400 space-y-3">
          <p className="text-sm">No transactions match your search or filter.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setTypeFilter('all');
              setCategoryFilter('all');
              setScopeFilter('month');
            }}
            className="text-xs text-indigo-400 hover:underline font-medium"
          >
            Reset all filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {(Object.entries(groupedTransactions) as [string, Transaction[]][]).map(([dateKey, txs]) => {
            const dateLabel = formatDisplayDate(dateKey, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }) || dateKey;

            const dayTotalExp = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
            const dayTotalInc = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);

            return (
              <div
                key={dateKey}
                className="rounded-2xl border border-slate-800 light:border-slate-200 bg-slate-900/60 light:bg-white overflow-hidden shadow-sm"
              >
                {/* Date Group Header */}
                <div className="px-4 py-2.5 bg-slate-950/60 light:bg-slate-50 border-b border-slate-800/60 light:border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-300 light:text-slate-700">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{dateLabel}</span>
                  </div>

                  <div className="flex items-center gap-2 font-mono">
                    {dayTotalInc > 0 && <span className="text-emerald-400">+{formatCurrency(dayTotalInc, currency)}</span>}
                    {dayTotalExp > 0 && <span className="text-rose-400">-{formatCurrency(dayTotalExp, currency)}</span>}
                  </div>
                </div>

                {/* Items in this date */}
                <div className="divide-y divide-slate-800/60 light:divide-slate-100">
                  {txs.map((tx) => {
                    const cat = catMap.get(tx.category) || {
                      name: 'Other',
                      icon: '🏷️',
                      color: '#64748b',
                    };
                    const isIncome = tx.type === 'income';

                    return (
                      <div
                        key={tx.id}
                        className="p-3.5 sm:px-4 flex items-center justify-between gap-3 group hover:bg-slate-800/30 light:hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-sm"
                            style={{ backgroundColor: `${cat.color}20` }}
                          >
                            {cat.icon}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs sm:text-sm font-bold text-slate-100 light:text-slate-900 truncate">
                                {tx.title}
                              </span>
                              {tx.paymentMethod && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 light:bg-slate-200 text-slate-400 light:text-slate-600 font-mono shrink-0">
                                  {tx.paymentMethod}
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {cat.name}
                              {tx.note ? ` • ${tx.note}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <div className={`text-xs sm:text-sm font-extrabold font-mono ${
                              isIncome ? 'text-emerald-400' : 'text-slate-100 light:text-slate-900'
                            }`}>
                              {isIncome ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => onEditTransaction(tx)}
                              className="p-1.5 text-slate-400 hover:text-indigo-400 rounded-lg hover:bg-slate-800 light:hover:bg-slate-200 transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteTransaction(tx.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 light:hover:bg-slate-200 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
