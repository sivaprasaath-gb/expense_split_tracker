import React, { useState } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  PiggyBank, 
  Wallet, 
  TrendingUp, 
  Sparkles, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Pencil, 
  Trash2,
  ChevronRight,
  Plus
} from 'lucide-react';
import { Transaction, Category, Subscription, AppState } from '../types';
import { formatCurrency } from '../utils/currency';
import { getMonthLabel, formatDisplayDate } from '../utils/storage';

interface DashboardViewProps {
  transactions: Transaction[];
  categories: Category[];
  subscriptions: Subscription[];
  selectedMonth: string;
  currency: string;
  budgetLimit: number;
  onNavigateTab: (tab: AppState['activeTab']) => void;
  onOpenAddModal: () => void;
  onEditTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onLogSubscription: (sub: Subscription) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  transactions,
  categories,
  subscriptions,
  selectedMonth,
  currency,
  budgetLimit,
  onNavigateTab,
  onOpenAddModal,
  onEditTransaction,
  onDeleteTransaction,
  onLogSubscription,
}) => {
  const [chartMode, setChartMode] = useState<'weekly' | 'daily'>('weekly');
  const [showAllRecent, setShowAllRecent] = useState(false);

  // Filter transactions for selected month
  const monthTx = transactions.filter(t => t.date && t.date.slice(0, 7) === selectedMonth);
  
  const totalIncome = monthTx
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalExpense = monthTx
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((netSavings / totalIncome) * 100)) : 0;

  // Monthly Budget calculations
  const budgetSpentPercent = budgetLimit > 0 ? Math.min(200, Math.round((totalExpense / budgetLimit) * 100)) : 0;
  const budgetRemaining = Math.max(0, budgetLimit - totalExpense);
  
  // Calculate remaining days in selected month
  const [year, month] = selectedMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && (today.getMonth() + 1) === month;
  const currentDay = isCurrentMonth ? today.getDate() : 1;
  const remainingDays = isCurrentMonth ? Math.max(1, daysInMonth - currentDay + 1) : daysInMonth;
  const safeDailySpend = budgetLimit > 0 ? Math.round(budgetRemaining / remainingDays) : 0;

  // Category lookup
  const getCategory = (catId: string) => {
    return categories.find(c => c.id === catId) || {
      id: 'other',
      name: 'Other',
      icon: '🏷️',
      color: '#64748b',
      budget: 0,
    };
  };

  // Generate Month Weekly Bars
  // Divides the month into Week 1 (1-7), Week 2 (8-14), Week 3 (15-21), Week 4 (22-28), Week 5 (29-end)
  const weeksData = [
    { label: 'W1 (1-7)', start: 1, end: 7 },
    { label: 'W2 (8-14)', start: 8, end: 14 },
    { label: 'W3 (15-21)', start: 15, end: 21 },
    { label: 'W4 (22-28)', start: 22, end: 28 },
    { label: `W5 (29-${daysInMonth})`, start: 29, end: daysInMonth },
  ].map(w => {
    const wTx = monthTx.filter(t => {
      const day = parseInt(t.date.slice(8, 10), 10);
      return day >= w.start && day <= w.end;
    });

    const inc = wTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = wTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    return {
      label: w.label,
      income: inc,
      expense: exp,
      count: wTx.length,
    };
  });

  const maxWeeklyVal = Math.max(100, ...weeksData.map(w => Math.max(w.income, w.expense)));

  // Generate 7-day or daily view
  const recentDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(year, month - 1, Math.min(daysInMonth, Math.max(1, currentDay - 6 + i)));
    const dateStr = d.toISOString().slice(0, 10);
    const dayTx = monthTx.filter(t => t.date === dateStr);
    const inc = dayTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = dayTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return {
      dateStr,
      dayLabel: d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }),
      income: inc,
      expense: exp,
    };
  });
  const maxDailyVal = Math.max(100, ...recentDays.map(d => Math.max(d.income, d.expense)));

  // Upcoming subscriptions in current month
  const upcomingSubscriptions = subscriptions.filter(sub => sub.active).slice(0, 3);

  // Recent transactions for the selected month, sorted newest first
  const recentTransactions = [...monthTx]
    .sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt));

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Balance Card */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-800 light:border-slate-200 bg-gradient-to-b from-slate-900 to-slate-900/60 light:from-white light:to-slate-50 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Net Balance</span>
            <Wallet className="w-4 h-4 text-indigo-400" />
          </div>
          <div className={`text-xl sm:text-2xl font-extrabold tracking-tight ${
            netSavings >= 0 ? 'text-slate-100 light:text-slate-900' : 'text-rose-400'
          }`}>
            {formatCurrency(netSavings, currency)}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
            <span>{getMonthLabel(selectedMonth)}</span>
            <span className="text-slate-600">•</span>
            <span className={netSavings >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {netSavings >= 0 ? 'Surplus' : 'Deficit'}
            </span>
          </div>
        </div>

        {/* Income Card */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-800 light:border-slate-200 bg-gradient-to-b from-slate-900 to-slate-900/60 light:from-white light:to-slate-50 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Income</span>
            <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-emerald-400">
            +{formatCurrency(totalIncome, currency)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {monthTx.filter(t => t.type === 'income').length} income source(s)
          </div>
        </div>

        {/* Expenses Card */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-800 light:border-slate-200 bg-gradient-to-b from-slate-900 to-slate-900/60 light:from-white light:to-slate-50 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Spent</span>
            <div className="p-1 rounded-lg bg-rose-500/10 text-rose-400">
              <ArrowDownLeft className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-rose-400">
            -{formatCurrency(totalExpense, currency)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {monthTx.filter(t => t.type === 'expense').length} expense item(s)
          </div>
        </div>

        {/* Savings / Rate Card */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-800 light:border-slate-200 bg-gradient-to-b from-slate-900 to-slate-900/60 light:from-white light:to-slate-50 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Savings Rate</span>
            <PiggyBank className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-sky-400">
            {savingsRate}%
          </div>
          <div className="mt-1 text-[11px] text-slate-400 truncate">
            {totalIncome > 0 ? `${formatCurrency(netSavings, currency)} saved` : 'No income recorded'}
          </div>
        </div>
      </div>

      {/* Monthly Budget Tracker Bar */}
      {budgetLimit > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-800 light:border-slate-200 bg-slate-900/60 light:bg-white shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 light:text-slate-900">
                  Monthly Budget Limit
                </h3>
                <p className="text-xs text-slate-400">
                  {formatCurrency(totalExpense, currency)} spent of {formatCurrency(budgetLimit, currency)}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                budgetSpentPercent > 100
                  ? 'bg-rose-500/20 text-rose-400'
                  : budgetSpentPercent > 80
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {budgetSpentPercent > 100 && <AlertTriangle className="w-3 h-3" />}
                {budgetSpentPercent}% used
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-slate-800 light:bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                budgetSpentPercent > 100
                  ? 'bg-rose-500'
                  : budgetSpentPercent > 80
                  ? 'bg-amber-500'
                  : 'bg-gradient-to-r from-indigo-500 to-emerald-400'
              }`}
              style={{ width: `${Math.min(100, budgetSpentPercent)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <span>
              {budgetSpentPercent > 100 ? (
                <strong className="text-rose-400">
                  Over budget by {formatCurrency(totalExpense - budgetLimit, currency)}!
                </strong>
              ) : (
                <span>Remaining: <strong className="text-slate-200 light:text-slate-800">{formatCurrency(budgetRemaining, currency)}</strong></span>
              )}
            </span>
            {budgetSpentPercent <= 100 && safeDailySpend > 0 && (
              <span className="text-emerald-400 font-medium hidden sm:inline">
                Safe daily spend: ~{formatCurrency(safeDailySpend, currency)}/day ({remainingDays} days left)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Activity Chart Section */}
      <div className="p-4 sm:p-5 rounded-2xl border border-slate-800 light:border-slate-200 bg-slate-900/60 light:bg-white shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-100 light:text-slate-900">
              Spending & Income Activity
            </h3>
            <p className="text-xs text-slate-400">
              Breakdown across {getMonthLabel(selectedMonth)}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block" /> Income
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-400 inline-block" /> Expense
              </span>
            </div>

            <div className="flex rounded-lg bg-slate-800 light:bg-slate-100 p-0.5 border border-slate-700/50 light:border-slate-200">
              <button
                onClick={() => setChartMode('weekly')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  chartMode === 'weekly'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setChartMode('daily')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  chartMode === 'daily'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                7-Days
              </button>
            </div>
          </div>
        </div>

        {/* Chart Visualization Bars */}
        <div className="h-44 flex items-end justify-around gap-2 pt-4 pb-2 border-b border-slate-800 light:border-slate-200">
          {(chartMode === 'weekly' ? weeksData : recentDays).map((item, idx) => {
            const incHeight = chartMode === 'weekly' 
              ? Math.max(4, Math.round(((item as any).income / maxWeeklyVal) * 100))
              : Math.max(4, Math.round(((item as any).income / maxDailyVal) * 100));

            const expHeight = chartMode === 'weekly' 
              ? Math.max(4, Math.round(((item as any).expense / maxWeeklyVal) * 100))
              : Math.max(4, Math.round(((item as any).expense / maxDailyVal) * 100));

            const hasInc = (item as any).income > 0;
            const hasExp = (item as any).expense > 0;

            return (
              <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                {/* Tooltip on Hover */}
                <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 bg-slate-950 text-white text-[11px] p-2 rounded-xl shadow-xl border border-slate-800 whitespace-nowrap min-w-28 text-center">
                  <div className="font-bold text-slate-300">{(item as any).label || (item as any).dayLabel}</div>
                  <div className="text-emerald-400">+{formatCurrency((item as any).income, currency)}</div>
                  <div className="text-rose-400">-{formatCurrency((item as any).expense, currency)}</div>
                </div>

                {/* Bars */}
                <div className="w-full max-w-[42px] flex items-end justify-center gap-1.5 h-32">
                  {/* Income bar */}
                  <div
                    className={`w-3.5 rounded-t-md transition-all duration-300 ${
                      hasInc ? 'bg-emerald-400 group-hover:brightness-110' : 'bg-slate-800/40'
                    }`}
                    style={{ height: hasInc ? `${incHeight}%` : '4px' }}
                    title={`Income: ${formatCurrency((item as any).income, currency)}`}
                  />
                  {/* Expense bar */}
                  <div
                    className={`w-3.5 rounded-t-md transition-all duration-300 ${
                      hasExp ? 'bg-rose-400 group-hover:brightness-110' : 'bg-slate-800/40'
                    }`}
                    style={{ height: hasExp ? `${expHeight}%` : '4px' }}
                    title={`Expense: ${formatCurrency((item as any).expense, currency)}`}
                  />
                </div>

                {/* Label */}
                <span className="text-[11px] font-medium text-slate-400 mt-2 truncate max-w-full">
                  {(item as any).label || (item as any).dayLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subscriptions Reminder Strip */}
      {upcomingSubscriptions.length > 0 && (
        <div className="p-4 rounded-2xl border border-slate-800 light:border-slate-200 bg-indigo-950/20 light:bg-indigo-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Recurring Subscriptions
              </h4>
              <p className="text-xs text-slate-300 light:text-slate-700">
                {upcomingSubscriptions.map(s => `${s.name} (${formatCurrency(s.amount, currency)})`).join(' • ')}
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('subscriptions')}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 self-start sm:self-auto"
          >
            Manage recurring <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Recent Transactions Panel */}
      <div className="p-4 sm:p-5 rounded-2xl border border-slate-800 light:border-slate-200 bg-slate-900/60 light:bg-white shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-100 light:text-slate-900">
                Recent Transactions
              </h3>
              {recentTransactions.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 light:bg-slate-200 text-slate-300 light:text-slate-700">
                  {recentTransactions.length}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Activity in {getMonthLabel(selectedMonth)}
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('history')}
            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            See All <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-8 text-center text-slate-400 space-y-2">
            <p className="text-sm">No transactions logged in {getMonthLabel(selectedMonth)}.</p>
            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Add First Transaction
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="divide-y divide-slate-800/80 light:divide-slate-100 space-y-0.5">
              {(showAllRecent ? recentTransactions : recentTransactions.slice(0, 6)).map((tx) => {
                const cat = getCategory(tx.category);
                const isIncome = tx.type === 'income';

                return (
                  <div
                    key={tx.id}
                    className="py-3 flex items-center justify-between gap-3 group hover:bg-slate-800/30 light:hover:bg-slate-50 px-2 rounded-xl transition-colors"
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
                          <strong className="text-xs sm:text-sm font-semibold text-slate-100 light:text-slate-900 truncate">
                            {tx.title}
                          </strong>
                          {tx.paymentMethod && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 light:bg-slate-200 text-slate-400 light:text-slate-600 font-mono shrink-0 hidden sm:inline">
                              {tx.paymentMethod}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {cat.name} • {formatDisplayDate(tx.date)}
                          {tx.note ? ` • ${tx.note}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className={`text-xs sm:text-sm font-bold ${
                          isIncome ? 'text-emerald-400' : 'text-slate-100 light:text-slate-900'
                        }`}>
                          {isIncome ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEditTransaction(tx)}
                          className="p-1.5 text-slate-400 hover:text-indigo-400 rounded-lg hover:bg-slate-800 light:hover:bg-slate-200"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteTransaction(tx.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 light:hover:bg-slate-200"
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

            {/* Expand / View All History Footnote */}
            {recentTransactions.length > 6 && (
              <div className="pt-2.5 flex items-center justify-between border-t border-slate-800/60 light:border-slate-100 text-xs">
                <button
                  type="button"
                  onClick={() => setShowAllRecent(!showAllRecent)}
                  className="text-slate-400 hover:text-indigo-400 font-semibold transition-colors"
                >
                  {showAllRecent ? 'Show less (top 6)' : `Show all ${recentTransactions.length} transactions`}
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateTab('history')}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                >
                  History Tab <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
