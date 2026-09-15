import React, { useState } from 'react';
import { 
  PieChart, 
  Target, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle, 
  Award,
  ChevronRight
} from 'lucide-react';
import { Transaction, Category, AppState } from '../types';
import { formatCurrency } from '../utils/currency';
import { getMonthLabel } from '../utils/storage';

interface AnalyticsViewProps {
  transactions: Transaction[];
  categories: Category[];
  selectedMonth: string;
  currency: string;
  onNavigateTab: (tab: AppState['activeTab']) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  transactions,
  categories,
  selectedMonth,
  currency,
  onNavigateTab,
}) => {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Expense transactions for selected month
  const monthExpenseTx = transactions.filter(
    t => t.date && t.date.slice(0, 7) === selectedMonth && t.type === 'expense'
  );

  const monthIncomeTx = transactions.filter(
    t => t.date && t.date.slice(0, 7) === selectedMonth && t.type === 'income'
  );

  const totalExpense = monthExpenseTx.reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalIncome = monthIncomeTx.reduce((s, t) => s + Number(t.amount || 0), 0);
  const netSaved = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((netSaved / totalIncome) * 100)) : 0;

  // Days in month calculation
  const [y, m] = selectedMonth.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const avgDailySpend = daysInMonth > 0 ? Math.round(totalExpense / daysInMonth) : 0;

  // Highest single expense
  const highestExpense = monthExpenseTx.reduce(
    (max, t) => (t.amount > (max?.amount || 0) ? t : max),
    null as Transaction | null
  );

  // Group expenses by category
  const categoryExpenses = categories
    .map(c => {
      const txs = monthExpenseTx.filter(t => t.category === c.id);
      const sum = txs.reduce((s, t) => s + Number(t.amount || 0), 0);
      const percent = totalExpense > 0 ? (sum / totalExpense) * 100 : 0;
      return {
        category: c,
        total: sum,
        percent: Math.round(percent * 10) / 10,
        count: txs.length,
      };
    })
    .filter(item => item.total > 0)
    .sort((a, b) => b.total - a.total);

  // Calculate SVG donut segments
  const size = 200;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativeAngle = 0;
  const donutSegments = categoryExpenses.map(item => {
    const strokeDasharray = `${(item.percent / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -cumulativeAngle;
    cumulativeAngle += (item.percent / 100) * circumference;

    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  // Active category display
  const activeItem = hoveredCategory
    ? categoryExpenses.find(x => x.category.id === hoveredCategory)
    : categoryExpenses[0];

  // Category budgets
  const budgetedCategories = categories.filter(c => c.budget > 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Monthly Financial Health Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl border border-slate-800 light:border-slate-200 bg-slate-900/60 light:bg-white">
          <span className="text-xs text-slate-400 font-semibold block mb-1">Monthly Inflow</span>
          <strong className="text-lg sm:text-xl font-bold text-emerald-400">
            +{formatCurrency(totalIncome, currency)}
          </strong>
          <span className="text-[11px] text-slate-500 block mt-1">
            {monthIncomeTx.length} credits received
          </span>
        </div>

        <div className="p-4 rounded-2xl border border-slate-800 light:border-slate-200 bg-slate-900/60 light:bg-white">
          <span className="text-xs text-slate-400 font-semibold block mb-1">Monthly Outflow</span>
          <strong className="text-lg sm:text-xl font-bold text-rose-400">
            -{formatCurrency(totalExpense, currency)}
          </strong>
          <span className="text-[11px] text-slate-500 block mt-1">
            {monthExpenseTx.length} expenses logged
          </span>
        </div>

        <div className="p-4 rounded-2xl border border-slate-800 light:border-slate-200 bg-slate-900/60 light:bg-white">
          <span className="text-xs text-slate-400 font-semibold block mb-1">Daily Burn Rate</span>
          <strong className="text-lg sm:text-xl font-bold text-slate-100 light:text-slate-900">
            ~{formatCurrency(avgDailySpend, currency)}<span className="text-xs text-slate-400 font-normal">/day</span>
          </strong>
          <span className="text-[11px] text-slate-500 block mt-1">
            Over {daysInMonth} days
          </span>
        </div>

        <div className="p-4 rounded-2xl border border-slate-800 light:border-slate-200 bg-slate-900/60 light:bg-white">
          <span className="text-xs text-slate-400 font-semibold block mb-1">Savings Margin</span>
          <strong className="text-lg sm:text-xl font-bold text-sky-400">
            {savingsRate}%
          </strong>
          <span className="text-[11px] text-slate-500 block mt-1">
            {formatCurrency(netSaved, currency)} net
          </span>
        </div>
      </div>

      {/* Main Analytics Grid: Donut Breakdown + Category Budgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Donut Breakdown */}
        <div className="p-5 rounded-2xl border border-slate-800 light:border-slate-200 bg-slate-900/60 light:bg-white shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-100 light:text-slate-900">
                Expense Breakdown
              </h3>
              <p className="text-xs text-slate-400">
                Spending distribution for {getMonthLabel(selectedMonth)}
              </p>
            </div>
            <PieChart className="w-5 h-5 text-indigo-400" />
          </div>

          {categoryExpenses.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No expenses recorded in {getMonthLabel(selectedMonth)}.
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
              {/* Donut Chart SVG */}
              <div className="relative shrink-0 flex items-center justify-center">
                <svg width={size} height={size} className="-rotate-90">
                  {/* Background track circle */}
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke="rgba(148, 163, 184, 0.1)"
                    strokeWidth={strokeWidth}
                  />
                  {/* Segments */}
                  {donutSegments.map((seg) => (
                    <circle
                      key={seg.category.id}
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      fill="transparent"
                      stroke={seg.category.color}
                      strokeWidth={hoveredCategory === seg.category.id ? strokeWidth + 4 : strokeWidth}
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setHoveredCategory(seg.category.id)}
                      onMouseLeave={() => setHoveredCategory(null)}
                    />
                  ))}
                </svg>

                {/* Center Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                  {activeItem ? (
                    <>
                      <span className="text-xl mb-0.5">{activeItem.category.icon}</span>
                      <strong className="text-sm font-bold text-slate-100 light:text-slate-900 truncate max-w-[110px]">
                        {formatCurrency(activeItem.total, currency)}
                      </strong>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {activeItem.percent}% • {activeItem.category.name}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-slate-400 font-medium">Total</span>
                      <strong className="text-base font-bold text-slate-100 light:text-slate-900">
                        {formatCurrency(totalExpense, currency)}
                      </strong>
                    </>
                  )}
                </div>
              </div>

              {/* Legend List */}
              <div className="flex-1 w-full space-y-2 max-h-56 overflow-y-auto pr-1">
                {categoryExpenses.map((item) => {
                  const isHovered = hoveredCategory === item.category.id;

                  return (
                    <div
                      key={item.category.id}
                      onMouseEnter={() => setHoveredCategory(item.category.id)}
                      onMouseLeave={() => setHoveredCategory(null)}
                      className={`flex items-center justify-between p-2 rounded-xl text-xs transition-all cursor-pointer ${
                        isHovered
                          ? 'bg-slate-800 light:bg-slate-100 shadow-sm'
                          : 'hover:bg-slate-800/40 light:hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.category.color }}
                        />
                        <span className="text-base shrink-0">{item.category.icon}</span>
                        <span className="font-semibold text-slate-200 light:text-slate-800 truncate">
                          {item.category.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 font-mono shrink-0">
                        <span className="text-slate-400 text-[11px]">{item.percent}%</span>
                        <strong className="text-slate-100 light:text-slate-900">
                          {formatCurrency(item.total, currency)}
                        </strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Category Budgets vs Actuals */}
        <div className="p-5 rounded-2xl border border-slate-800 light:border-slate-200 bg-slate-900/60 light:bg-white shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-100 light:text-slate-900">
                Category Budgets
              </h3>
              <p className="text-xs text-slate-400">
                Budget limits vs actual spending
              </p>
            </div>
            <Target className="w-5 h-5 text-indigo-400" />
          </div>

          {budgetedCategories.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs space-y-2">
              <p>No category budgets configured.</p>
              <button
                onClick={() => onNavigateTab('settings')}
                className="text-indigo-400 hover:underline font-semibold"
              >
                Configure Category Budgets in Settings →
              </button>
            </div>
          ) : (
            <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
              {budgetedCategories.map((cat) => {
                const spent = monthExpenseTx
                  .filter(t => t.category === cat.id)
                  .reduce((s, t) => s + Number(t.amount || 0), 0);

                const percent = Math.min(200, Math.round((spent / cat.budget) * 100));
                const isOver = spent > cat.budget;
                const remaining = Math.max(0, cat.budget - spent);

                return (
                  <div key={cat.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-200 light:text-slate-800">
                        <span>{cat.icon}</span>
                        <span>{cat.name}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-mono">
                          {formatCurrency(spent, currency)} / {formatCurrency(cat.budget, currency)}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isOver
                            ? 'bg-rose-500/20 text-rose-400'
                            : percent > 80
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {percent}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Track */}
                    <div className="w-full h-2 bg-slate-800 light:bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isOver
                            ? 'bg-rose-500'
                            : percent > 80
                            ? 'bg-amber-400'
                            : 'bg-emerald-400'
                        }`}
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>
                        {isOver ? (
                          <span className="text-rose-400 font-medium">
                            Over by {formatCurrency(spent - cat.budget, currency)}
                          </span>
                        ) : (
                          <span>{formatCurrency(remaining, currency)} remaining</span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Highest Single Expense & Insight Banner */}
      {highestExpense && (
        <div className="p-4 rounded-2xl border border-slate-800 light:border-slate-200 bg-slate-900/40 light:bg-slate-50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block">
                Peak Single Expense
              </span>
              <p className="text-xs sm:text-sm font-semibold text-slate-100 light:text-slate-900">
                {highestExpense.title} on {new Date(highestExpense.date).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="text-right">
            <strong className="text-base sm:text-lg font-bold text-rose-400">
              -{formatCurrency(highestExpense.amount, currency)}
            </strong>
          </div>
        </div>
      )}
    </div>
  );
};
