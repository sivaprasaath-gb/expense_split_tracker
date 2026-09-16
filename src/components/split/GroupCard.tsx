import React from 'react';
import { 
  Users, 
  Receipt, 
  CheckCircle2, 
  Archive, 
  RotateCcw, 
  Trash2, 
  ChevronRight 
} from 'lucide-react';
import { SplitGroup, Friend, SplitExpense } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { getGroupSummary } from '../../utils/splitEngine';

interface GroupCardProps {
  group: SplitGroup;
  friends: Friend[];
  splitExpenses: SplitExpense[];
  currency: string;
  onSelectGroup: (groupId: string) => void;
  onToggleClose: (groupId: string) => void;
  onDeleteGroup: (groupId: string) => void;
}

export const GroupCard: React.FC<GroupCardProps> = ({
  group,
  friends,
  splitExpenses,
  currency,
  onSelectGroup,
  onToggleClose,
  onDeleteGroup,
}) => {
  const isClosed = group.status === 'closed';
  const summary = getGroupSummary(group, friends, splitExpenses);
  const netBalance = summary.netBalance;

  // Get member friends
  const memberFriends = friends.filter((f) => group.memberIds.includes(f.id));

  return (
    <div
      onClick={() => onSelectGroup(group.id)}
      className={`group relative p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
        isClosed
          ? 'bg-slate-900/40 light:bg-slate-100/70 border-slate-800/80 light:border-slate-200 opacity-80 hover:opacity-100 hover:border-slate-700'
          : 'bg-slate-900/70 light:bg-white border-slate-800 light:border-slate-200 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/5'
      }`}
    >
      <div>
        {/* Header row: Icon, Name, Status Badge */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-indigo-600/10 light:bg-indigo-50 border border-indigo-500/20 light:border-indigo-200 flex items-center justify-center text-xl shrink-0">
              {group.icon || '✈️'}
            </div>
            <div className="min-w-0">
              <h4 className="text-base font-bold text-slate-100 light:text-slate-900 truncate group-hover:text-indigo-400 transition-colors">
                {group.name}
              </h4>
              <span className="text-[11px] text-slate-400 light:text-slate-500 truncate block">
                {group.description || `${group.memberIds.length} members involved`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isClosed ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 light:bg-slate-200 text-slate-400 light:text-slate-600 border border-slate-700/60 light:border-slate-300">
                <Archive className="w-3 h-3" />
                Closed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active
              </span>
            )}
          </div>
        </div>

        {/* Member Avatars */}
        <div className="flex items-center gap-2 mb-4 pt-1">
          <div className="flex -space-x-2 overflow-hidden">
            {/* You avatar */}
            <div
              className="inline-block h-6 w-6 rounded-full ring-2 ring-slate-900 light:ring-white bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0"
              title="You"
            >
              Y
            </div>
            {/* Friends avatars */}
            {memberFriends.slice(0, 4).map((f) => (
              <div
                key={f.id}
                className="inline-block h-6 w-6 rounded-full ring-2 ring-slate-900 light:ring-white text-white text-[10px] font-bold flex items-center justify-center shrink-0"
                style={{ backgroundColor: f.avatarColor || '#6366f1' }}
                title={f.name}
              >
                {f.name.charAt(0).toUpperCase()}
              </div>
            ))}
            {memberFriends.length > 4 && (
              <div className="inline-block h-6 w-6 rounded-full ring-2 ring-slate-900 light:ring-white bg-slate-800 text-slate-300 text-[9px] font-bold flex items-center justify-center shrink-0">
                +{memberFriends.length - 4}
              </div>
            )}
          </div>
          <span className="text-[11px] text-slate-400 light:text-slate-500">
            {memberFriends.length + 1} participants
          </span>
        </div>
      </div>

      {/* Metrics & Footer */}
      <div className="pt-3 border-t border-slate-800/80 light:border-slate-200">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
              Total Spend
            </span>
            <strong className="text-sm font-bold font-mono text-slate-100 light:text-slate-900">
              {formatCurrency(summary.totalSpend, currency)}
            </strong>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
              Your Position
            </span>
            {netBalance > 0 ? (
              <strong className="text-sm font-bold font-mono text-emerald-400">
                +{formatCurrency(netBalance, currency)} (owed)
              </strong>
            ) : netBalance < 0 ? (
              <strong className="text-sm font-bold font-mono text-rose-400">
                -{formatCurrency(Math.abs(netBalance), currency)} (you owe)
              </strong>
            ) : (
              <span className="text-xs font-semibold text-slate-400 inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                Settled
              </span>
            )}
          </div>
        </div>

        {/* Card bottom actions */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Receipt className="w-3.5 h-3.5" />
            <span>{summary.expenseCount} {summary.expenseCount === 1 ? 'expense' : 'expenses'}</span>
          </div>

          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onToggleClose(group.id)}
              className="p-1.5 text-slate-400 hover:text-indigo-400 rounded-lg hover:bg-slate-800/60 light:hover:bg-slate-200 transition-colors"
              title={isClosed ? 'Reopen group' : 'Close / Archive group'}
            >
              {isClosed ? <RotateCcw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => onDeleteGroup(group.id)}
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800/60 light:hover:bg-slate-200 transition-colors"
              title="Delete group"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onSelectGroup(group.id)}
              className="p-1.5 text-indigo-400 hover:text-indigo-300 rounded-lg hover:bg-slate-800/60 light:hover:bg-slate-200 transition-colors flex items-center"
              title="Open group details"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
