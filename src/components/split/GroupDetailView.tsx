import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  HandCoins, 
  Archive, 
  RotateCcw, 
  Trash2, 
  Users, 
  Receipt, 
  Calendar, 
  Search, 
  CheckCircle2, 
  AlertCircle,
  Clock
} from 'lucide-react';
import { SplitGroup, Friend, SplitExpense } from '../../types';
import { formatCurrency, getCurrencySymbol } from '../../utils/currency';
import { getGroupSummary } from '../../utils/splitEngine';
import { formatDisplayDate } from '../../utils/storage';

interface GroupDetailViewProps {
  group: SplitGroup;
  friends: Friend[];
  splitExpenses: SplitExpense[];
  currency: string;
  onBack: () => void;
  onAddExpenseInGroup: (groupId: string) => void;
  onOpenSettle: (friend: Friend, netBalance: number, groupId: string) => void;
  onDeleteExpense: (expenseId: string) => void;
  onToggleCloseGroup: (groupId: string) => void;
  onDeleteGroup: (groupId: string) => void;
}

export const GroupDetailView: React.FC<GroupDetailViewProps> = ({
  group,
  friends,
  splitExpenses,
  currency,
  onBack,
  onAddExpenseInGroup,
  onOpenSettle,
  onDeleteExpense,
  onToggleCloseGroup,
  onDeleteGroup,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const isClosed = group.status === 'closed';

  // Calculate metrics for this specific group
  const summary = useMemo(() => {
    return getGroupSummary(group, friends, splitExpenses);
  }, [group, friends, splitExpenses]);

  // Filtered expenses for search
  const filteredExpenses = useMemo(() => {
    const expenses = [...summary.groupExpenses].reverse();
    if (!searchQuery.trim()) return expenses;
    const q = searchQuery.toLowerCase();
    return expenses.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.paidByName.toLowerCase().includes(q) ||
        (e.note && e.note.toLowerCase().includes(q))
    );
  }, [summary.groupExpenses, searchQuery]);

  // Calculate your share in this group
  const yourShareTotal = useMemo(() => {
    return summary.groupExpenses
      .filter((e) => !e.isSettlement)
      .reduce((sum, e) => {
        const yourShare = e.shares.find((s) => s.personId === 'YOU');
        return sum + (yourShare ? Number(yourShare.amount) || 0 : 0);
      }, 0);
  }, [summary.groupExpenses]);

  // Calculate your total paid in this group
  const yourPaidTotal = useMemo(() => {
    return summary.groupExpenses
      .filter((e) => !e.isSettlement && e.paidBy === 'YOU')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [summary.groupExpenses]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Back Navigation Bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-800 light:border-slate-300 bg-slate-900/60 light:bg-white text-xs font-semibold text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-900 hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Groups</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleCloseGroup(group.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
              isClosed
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                : 'border-slate-800 light:border-slate-300 bg-slate-900/60 light:bg-white text-slate-300 light:text-slate-700 hover:text-white'
            }`}
          >
            {isClosed ? (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reopen Group</span>
              </>
            ) : (
              <>
                <Archive className="w-3.5 h-3.5" />
                <span>Close Group</span>
              </>
            )}
          </button>

          <button
            onClick={() => onDeleteGroup(group.id)}
            className="p-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
            title="Delete this group and its expenses"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Group Header Hero */}
      <div className="p-5 sm:p-6 rounded-2xl border border-slate-800 light:border-slate-200 bg-gradient-to-br from-slate-900 via-indigo-950/20 to-slate-900 light:from-white light:to-indigo-50/50 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center text-3xl shrink-0 shadow-inner">
              {group.icon || '✈️'}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-100 light:text-slate-900">
                  {group.name}
                </h2>
                {isClosed ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
                    <Archive className="w-3 h-3" />
                    Closed Group
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Active Group
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-400 light:text-slate-600">
                {group.description || 'Dedicated split ledger for group expenses'}
              </p>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                <span className="inline-flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  {summary.groupFriends.length + 1} participants
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Created {new Date(group.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div>
            <button
              onClick={() => onAddExpenseInGroup(group.id)}
              disabled={isClosed}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Expense in Group</span>
            </button>
          </div>
        </div>

        {/* Closed Banner Warning */}
        {isClosed && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                This group is closed. New expenses are disabled unless reopened.
              </span>
            </div>
            <button
              onClick={() => onToggleCloseGroup(group.id)}
              className="text-xs font-bold text-amber-200 hover:underline shrink-0"
            >
              Reopen
            </button>
          </div>
        )}

        {/* 4 Financial Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-slate-950/60 light:bg-white border border-slate-800 light:border-slate-200">
            <span className="text-[11px] font-semibold text-slate-400 block mb-1">
              Total Group Spend
            </span>
            <strong className="text-lg sm:text-xl font-bold font-mono text-slate-100 light:text-slate-900">
              {formatCurrency(summary.totalSpend, currency)}
            </strong>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 light:bg-white border border-slate-800 light:border-slate-200">
            <span className="text-[11px] font-semibold text-slate-400 block mb-1">
              Your Share
            </span>
            <strong className="text-lg sm:text-xl font-bold font-mono text-indigo-400">
              {formatCurrency(yourShareTotal, currency)}
            </strong>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 light:bg-white border border-slate-800 light:border-slate-200">
            <span className="text-[11px] font-semibold text-slate-400 block mb-1">
              You Paid Total
            </span>
            <strong className="text-lg sm:text-xl font-bold font-mono text-slate-200 light:text-slate-800">
              {formatCurrency(yourPaidTotal, currency)}
            </strong>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 light:bg-white border border-slate-800 light:border-slate-200">
            <span className="text-[11px] font-semibold text-slate-400 block mb-1">
              Your Group Balance
            </span>
            <strong
              className={`text-lg sm:text-xl font-bold font-mono ${
                summary.netBalance > 0
                  ? 'text-emerald-400'
                  : summary.netBalance < 0
                  ? 'text-rose-400'
                  : 'text-slate-400'
              }`}
            >
              {summary.netBalance > 0 ? '+' : ''}
              {formatCurrency(summary.netBalance, currency)}
            </strong>
          </div>
        </div>
      </div>

      {/* Member Balances Section for this Group */}
      <div className="p-5 rounded-2xl border border-slate-800 light:border-slate-200 bg-slate-900/60 light:bg-white shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-100 light:text-slate-900">
              Group Balances ({summary.friendBalances.length} Friends)
            </h3>
            <p className="text-xs text-slate-400">
              Who owes whom within &quot;{group.name}&quot;
            </p>
          </div>
        </div>

        {summary.friendBalances.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No other friends are assigned to this group yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {summary.friendBalances.map(({ friend, netBalance, totalOwedToYou, totalYouOwe }) => {
              const isSettled = netBalance === 0;
              const friendOwesYou = netBalance > 0;

              return (
                <div
                  key={friend.id}
                  className="p-3.5 rounded-xl border border-slate-800 light:border-slate-200 bg-slate-950/40 light:bg-slate-50 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0"
                      style={{ backgroundColor: friend.avatarColor || '#6366f1' }}
                    >
                      {friend.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <strong className="text-sm font-semibold text-slate-100 light:text-slate-900 truncate block">
                        {friend.name}
                      </strong>
                      <span className="text-[11px] text-slate-400 truncate block">
                        {friend.note || 'Group Member'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      {isSettled ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
                          <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                          Settled
                        </span>
                      ) : friendOwesYou ? (
                        <div className="text-xs font-bold text-emerald-400">
                          Owes you {formatCurrency(totalOwedToYou, currency)}
                        </div>
                      ) : (
                        <div className="text-xs font-bold text-rose-400">
                          You owe {formatCurrency(totalYouOwe, currency)}
                        </div>
                      )}
                    </div>

                    {!isSettled && (
                      <button
                        onClick={() => onOpenSettle(friend, netBalance, group.id)}
                        className="px-2.5 py-1 text-xs font-bold bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 rounded-lg transition-colors flex items-center gap-1"
                        title="Settle debt in this group"
                      >
                        <HandCoins className="w-3 h-3" />
                        <span>Settle</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Group Expenses List */}
      <div className="p-5 rounded-2xl border border-slate-800 light:border-slate-200 bg-slate-900/60 light:bg-white shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-100 light:text-slate-900">
              Expenses in {group.name} ({summary.groupExpenses.length})
            </h3>
            <p className="text-xs text-slate-400">
              Shared bills and settlement transactions logged under this group
            </p>
          </div>

          {summary.groupExpenses.length > 3 && (
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search group expenses..."
                className="w-full bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 light:text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs space-y-3">
            <Receipt className="w-8 h-8 text-slate-600 mx-auto" />
            <p>No expenses found for this group yet.</p>
            {!isClosed && (
              <button
                onClick={() => onAddExpenseInGroup(group.id)}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold hover:bg-indigo-600/30 transition-colors"
              >
                + Add the first expense
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredExpenses.map((expense) => {
              const isSettlement = expense.isSettlement;

              return (
                <div
                  key={expense.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isSettlement
                      ? 'bg-emerald-950/20 border-emerald-500/30 light:bg-emerald-50/50'
                      : 'bg-slate-950/40 border-slate-800 light:border-slate-200 light:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-bold text-slate-100 light:text-slate-900">
                          {expense.title}
                        </strong>
                        {isSettlement && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Settlement
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-400">
                        Paid by <strong className="text-indigo-400">{expense.paidByName}</strong> on{' '}
                        {formatDisplayDate(expense.date)}
                        {expense.note ? ` • ${expense.note}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <strong className="text-base font-bold font-mono text-slate-100 light:text-slate-900">
                        {formatCurrency(expense.amount, currency)}
                      </strong>

                      <button
                        onClick={() => onDeleteExpense(expense.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                        title="Delete split expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Share breakdown chips */}
                  {!isSettlement && (
                    <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-slate-800/60 light:border-slate-200">
                      {expense.shares.map((share, sIdx) => (
                        <span
                          key={sIdx}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-800/80 light:bg-slate-200 text-[11px] text-slate-300 light:text-slate-700"
                        >
                          <span>{share.personName}:</span>
                          <strong className="font-mono">
                            {formatCurrency(share.amount, currency)}
                          </strong>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
