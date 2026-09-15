import React, { useState } from 'react';
import { 
  Users2, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CheckCheck, 
  Trash2, 
  UserPlus, 
  Calendar, 
  Receipt,
  X,
  Sparkles,
  HandCoins
} from 'lucide-react';
import { Friend, SplitExpense, SplitShare, PaymentMethod } from '../types';
import { formatCurrency, getCurrencySymbol } from '../utils/currency';
import { calculateBalances, createSettlementExpense } from '../utils/splitEngine';
import { formatDisplayDate } from '../utils/storage';

interface SplitViewProps {
  friends: Friend[];
  splitExpenses: SplitExpense[];
  currency: string;
  onAddFriend: (name: string, note?: string) => void;
  onDeleteFriend: (friendId: string) => void;
  onAddSplitExpense: (expense: Omit<SplitExpense, 'id'>) => void;
  onDeleteSplitExpense: (expenseId: string) => void;
  onSettleUp: (expense: SplitExpense, logToPersonalTx?: boolean, paymentMethod?: PaymentMethod) => void;
}

export const SplitView: React.FC<SplitViewProps> = ({
  friends,
  splitExpenses,
  currency,
  onAddFriend,
  onDeleteFriend,
  onAddSplitExpense,
  onDeleteSplitExpense,
  onSettleUp,
}) => {
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [newFriendName, setNewFriendName] = useState('');
  const [newFriendNote, setNewFriendNote] = useState('');

  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [paidBy, setPaidBy] = useState<'YOU' | string>('YOU');
  const [expenseDate, setExpenseDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(['YOU']);
  const [customShares, setCustomShares] = useState<Record<string, string>>({});
  const [splitMethod, setSplitMethod] = useState<'equal' | 'custom'>('equal');
  const [expenseError, setExpenseError] = useState('');

  const [settleModalFriend, setSettleModalFriend] = useState<{
    friend: Friend;
    netBalance: number;
  } | null>(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleDate, setSettleDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [settlePaymentMethod, setSettlePaymentMethod] = useState<PaymentMethod>('UPI');
  const [settleLogToTx, setSettleLogToTx] = useState(true);

  const currencySymbol = getCurrencySymbol(currency);

  // Compute bilateral balances with all friends
  const { friendBalances, totalOwedToYou, totalYouOwe } = calculateBalances(friends, splitExpenses);
  const netPosition = totalOwedToYou - totalYouOwe;

  // Handler for adding friend
  const handleCreateFriend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFriendName.trim()) return;
    onAddFriend(newFriendName.trim(), newFriendNote.trim() || undefined);
    setNewFriendName('');
    setNewFriendNote('');
    setIsAddFriendOpen(false);
  };

  // Open add expense modal
  const handleOpenAddExpense = () => {
    if (friends.length === 0) {
      setIsAddFriendOpen(true);
      return;
    }
    setExpenseTitle('');
    setExpenseAmount('');
    setPaidBy('YOU');
    setExpenseDate(new Date().toLocaleDateString('en-CA'));
    setSelectedParticipants(['YOU', ...friends.map(f => f.id)]);
    setSplitMethod('equal');
    setCustomShares({});
    setExpenseError('');
    setIsAddExpenseOpen(true);
  };

  // Toggle participant
  const toggleParticipant = (id: string) => {
    if (selectedParticipants.includes(id)) {
      if (selectedParticipants.length <= 2) {
        setExpenseError('A split expense requires at least 2 participants.');
        return;
      }
      setSelectedParticipants(selectedParticipants.filter(p => p !== id));
    } else {
      setSelectedParticipants([...selectedParticipants, id]);
    }
    setExpenseError('');
  };

  // Submit shared expense
  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(expenseAmount);

    if (isNaN(amountNum) || amountNum <= 0) {
      setExpenseError('Please enter a valid expense amount.');
      return;
    }

    if (!expenseTitle.trim()) {
      setExpenseError('Please enter a description for the expense.');
      return;
    }

    if (selectedParticipants.length < 2) {
      setExpenseError('Please select at least 2 participants.');
      return;
    }

    let shares: SplitShare[] = [];

    if (splitMethod === 'equal') {
      const count = selectedParticipants.length;
      // Precise 2-decimal distribution (e.g. 369 / 2 = 184.50)
      const baseShare = Math.floor((amountNum / count) * 100) / 100;
      const totalBase = Math.round(baseShare * count * 100) / 100;
      const remainder = Math.round((amountNum - totalBase) * 100) / 100;

      shares = selectedParticipants.map((pId, idx) => {
        const pName = pId === 'YOU' ? 'You' : friends.find(f => f.id === pId)?.name || 'Unknown';
        const finalAmt = idx === 0 ? Math.round((baseShare + remainder) * 100) / 100 : baseShare;
        return {
          personId: pId,
          personName: pName,
          amount: Math.round(finalAmt * 100) / 100,
        };
      });
    } else {
      // Custom amounts
      let customSum = 0;
      shares = selectedParticipants.map(pId => {
        const pName = pId === 'YOU' ? 'You' : friends.find(f => f.id === pId)?.name || 'Unknown';
        const val = parseFloat(customShares[pId] || '0');
        customSum += val;
        return {
          personId: pId,
          personName: pName,
          amount: Math.round(val * 100) / 100,
        };
      });

      if (Math.abs(customSum - amountNum) > 0.05) {
        setExpenseError(`Sum of custom shares (${formatCurrency(customSum, currency)}) must equal total amount (${formatCurrency(amountNum, currency)})!`);
        return;
      }
    }

    const payerName = paidBy === 'YOU' ? 'You' : friends.find(f => f.id === paidBy)?.name || 'Unknown';

    onAddSplitExpense({
      title: expenseTitle.trim(),
      amount: amountNum,
      date: expenseDate,
      paidBy,
      paidByName: payerName,
      shares,
      isSettlement: false,
    });

    setIsAddExpenseOpen(false);
  };

  // Open Settle Up modal
  const handleOpenSettle = (friend: Friend, netBalance: number) => {
    setSettleModalFriend({ friend, netBalance });
    setSettleAmount(Math.abs(netBalance).toString());
    setSettleDate(new Date().toLocaleDateString('en-CA'));
    setSettlePaymentMethod('UPI');
    setSettleLogToTx(true);
  };

  // Settle Up Handler
  const handleConfirmSettle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleModalFriend) return;
    const numAmt = parseFloat(settleAmount);
    if (isNaN(numAmt) || numAmt <= 0) return;

    const settlement = createSettlementExpense(
      settleModalFriend.friend,
      settleModalFriend.netBalance,
      currencySymbol,
      numAmt,
      settleDate,
      settlePaymentMethod
    );
    onSettleUp(settlement, settleLogToTx, settlePaymentMethod);
    setSettleModalFriend(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner with Summary */}
      <div className="p-5 rounded-2xl border border-slate-800 light:border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 light:from-white light:to-indigo-50/40 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Users2 className="w-4 h-4" />
              <span>Group Debt & Bill Splitting</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100 light:text-slate-900">
              Split with Friends
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Keep group dinners, trips, and shared bills cleanly organized and settled.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddFriendOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-700 light:border-slate-300 bg-slate-800/80 light:bg-slate-100 text-slate-200 light:text-slate-800 text-xs font-semibold hover:bg-slate-700 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Friend</span>
            </button>
            <button
              onClick={handleOpenAddExpense}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Split Expense</span>
            </button>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="p-3.5 rounded-xl bg-slate-950/60 light:bg-white border border-slate-800 light:border-slate-200">
            <span className="text-[11px] font-semibold text-slate-400 block mb-1">You Owe</span>
            <strong className="text-base sm:text-xl font-bold text-rose-400">
              {formatCurrency(totalYouOwe, currency)}
            </strong>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 light:bg-white border border-slate-800 light:border-slate-200">
            <span className="text-[11px] font-semibold text-slate-400 block mb-1">Owed to You</span>
            <strong className="text-base sm:text-xl font-bold text-emerald-400">
              {formatCurrency(totalOwedToYou, currency)}
            </strong>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 light:bg-white border border-slate-800 light:border-slate-200">
            <span className="text-[11px] font-semibold text-slate-400 block mb-1">Net Balance</span>
            <strong className={`text-base sm:text-xl font-bold ${
              netPosition >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {netPosition >= 0 ? '+' : ''}{formatCurrency(netPosition, currency)}
            </strong>
          </div>
        </div>
      </div>

      {/* Friends Ledger List */}
      <div className="p-5 rounded-2xl border border-slate-800 light:border-slate-200 bg-slate-900/60 light:bg-white shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-100 light:text-slate-900">
              Friends & Balances ({friends.length})
            </h3>
            <p className="text-xs text-slate-400">
              Individual balances between You and each friend
            </p>
          </div>
        </div>

        {friends.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs space-y-2">
            <p>No friends added yet. Add friends to start splitting expenses.</p>
            <button
              onClick={() => setIsAddFriendOpen(true)}
              className="text-indigo-400 font-semibold hover:underline"
            >
              + Add your first friend
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {friendBalances.map(({ friend, netBalance, totalOwedToYou: owed, totalYouOwe: owes }) => {
              const isSettled = netBalance === 0;
              const friendOwesYou = netBalance > 0;
              const youOweFriend = netBalance < 0;

              return (
                <div
                  key={friend.id}
                  className="p-3.5 rounded-xl border border-slate-800 light:border-slate-200 bg-slate-950/40 light:bg-slate-50 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-sm"
                      style={{ backgroundColor: friend.avatarColor || '#6366f1' }}
                    >
                      {friend.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <strong className="text-sm font-semibold text-slate-100 light:text-slate-900 truncate block">
                        {friend.name}
                      </strong>
                      <span className="text-[11px] text-slate-400 block truncate">
                        {friend.note || 'Participant'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      {isSettled ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
                          <CheckCheck className="w-3.5 h-3.5 text-slate-500" />
                          Settled up
                        </span>
                      ) : friendOwesYou ? (
                        <div>
                          <div className="text-xs font-bold text-emerald-400">
                            Owes you {formatCurrency(owed, currency)}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-xs font-bold text-rose-400">
                            You owe {formatCurrency(owes, currency)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Settle Up Action */}
                    {!isSettled && (
                      <button
                        onClick={() => handleOpenSettle(friend, netBalance)}
                        className="px-2.5 py-1 text-xs font-bold bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 rounded-lg transition-colors flex items-center gap-1"
                        title="Settle up balance with this friend"
                      >
                        <HandCoins className="w-3 h-3" />
                        <span>Settle</span>
                      </button>
                    )}

                    {isSettled && (
                      <button
                        onClick={() => onDeleteFriend(friend.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                        title="Remove friend"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Shared Expenses Log */}
      <div className="p-5 rounded-2xl border border-slate-800 light:border-slate-200 bg-slate-900/60 light:bg-white shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-100 light:text-slate-900">
              Shared Expense History ({splitExpenses.length})
            </h3>
            <p className="text-xs text-slate-400">
              All split bills and settlements recorded
            </p>
          </div>
        </div>

        {splitExpenses.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No shared expenses recorded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {[...splitExpenses].reverse().map((expense) => {
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
                        onClick={() => onDeleteSplitExpense(expense.id)}
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
                          <strong className="font-mono">{formatCurrency(share.amount, currency)}</strong>
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

      {/* Add Friend Modal */}
      {isAddFriendOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-100 light:text-slate-900">
                Add New Friend
              </h3>
              <button
                onClick={() => setIsAddFriendOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFriend} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1">
                  Friend&apos;s Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newFriendName}
                  onChange={(e) => setNewFriendName(e.target.value)}
                  placeholder="e.g. Alex Rivera, Sarah"
                  className="w-full bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-100 light:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1">
                  Relationship / Note (Optional)
                </label>
                <input
                  type="text"
                  value={newFriendNote}
                  onChange={(e) => setNewFriendNote(e.target.value)}
                  placeholder="e.g. Roommate, Trip to Goa, Work"
                  className="w-full bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-100 light:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddFriendOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20"
                >
                  Add Friend
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Shared Expense Modal */}
      {isAddExpenseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-100 light:text-slate-900">
                Split an Expense
              </h3>
              <button
                onClick={() => setIsAddExpenseOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {expenseError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400">
                {expenseError}
              </div>
            )}

            <form onSubmit={handleSubmitExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1">
                  Expense Description
                </label>
                <input
                  type="text"
                  required
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                  placeholder="e.g. Dinner at Olive Garden, Airbnb deposit"
                  className="w-full bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-100 light:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1">
                    Total Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                      {currencySymbol}
                    </span>
                    <input
                      type="number"
                      step="any"
                      required
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl pl-8 pr-3 py-2 text-sm font-bold text-slate-100 light:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-100 light:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1">
                  Paid By
                </label>
                <select
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  className="w-full bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-100 light:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="YOU">You</option>
                  {friends.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Participants selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1.5">
                  Split With ({selectedParticipants.length} people)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => toggleParticipant('YOU')}
                    className={`p-2 rounded-xl text-left border text-xs flex items-center justify-between ${
                      selectedParticipants.includes('YOU')
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span>You</span>
                    {selectedParticipants.includes('YOU') && <CheckCheck className="w-3.5 h-3.5 text-indigo-400" />}
                  </button>

                  {friends.map((f) => {
                    const isSelected = selectedParticipants.includes(f.id);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => toggleParticipant(f.id)}
                        className={`p-2 rounded-xl text-left border text-xs flex items-center justify-between ${
                          isSelected
                            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                            : 'bg-slate-950/40 border-slate-800 text-slate-400'
                        }`}
                      >
                        <span className="truncate">{f.name}</span>
                        {isSelected && <CheckCheck className="w-3.5 h-3.5 text-indigo-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Split Method Toggle */}
              <div>
                <div className="flex gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs mb-2">
                  <button
                    type="button"
                    onClick={() => setSplitMethod('equal')}
                    className={`flex-1 py-1 rounded-lg font-semibold ${
                      splitMethod === 'equal' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    Split Equally (~{selectedParticipants.length > 0 && parseFloat(expenseAmount) > 0 ? formatCurrency(parseFloat(expenseAmount) / selectedParticipants.length, currency) : '0'}/person)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitMethod('custom')}
                    className={`flex-1 py-1 rounded-lg font-semibold ${
                      splitMethod === 'custom' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    Custom Shares
                  </button>
                </div>

                {splitMethod === 'custom' && (
                  <div className="space-y-2 p-3 bg-slate-950 rounded-xl border border-slate-800">
                    {selectedParticipants.map(pId => {
                      const name = pId === 'YOU' ? 'You' : friends.find(f => f.id === pId)?.name || 'Unknown';
                      return (
                        <div key={pId} className="flex items-center justify-between gap-3 text-xs">
                          <span>{name}</span>
                          <input
                            type="number"
                            step="any"
                            placeholder="0.00"
                            value={customShares[pId] || ''}
                            onChange={(e) => setCustomShares({ ...customShares, [pId]: e.target.value })}
                            className="w-28 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-right font-mono"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddExpenseOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20"
                >
                  Add Shared Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Up Full-Featured Modal */}
      {settleModalFriend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HandCoins className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-slate-100 light:text-slate-900">
                  Record Settlement
                </h3>
              </div>
              <button
                onClick={() => setSettleModalFriend(null)}
                className="p-1 text-slate-400 hover:text-slate-200 light:hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-950/30 light:bg-indigo-50/70 border border-indigo-500/20 light:border-indigo-200 space-y-1">
              <div className="text-xs text-slate-300 light:text-slate-700">
                {settleModalFriend.netBalance > 0 ? (
                  <span>
                    <strong>{settleModalFriend.friend.name}</strong> pays <strong>You</strong>
                  </span>
                ) : (
                  <span>
                    <strong>You</strong> pay <strong>{settleModalFriend.friend.name}</strong>
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 light:text-slate-500">
                Outstanding balance: {formatCurrency(Math.abs(settleModalFriend.netBalance), currency)}
              </div>
            </div>

            <form onSubmit={handleConfirmSettle} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1">
                  Settlement Amount ({currencySymbol})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    className="w-full bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl pl-8 pr-3 py-2 text-base sm:text-sm font-mono text-slate-100 light:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={settleDate}
                    onChange={(e) => setSettleDate(e.target.value)}
                    className="w-full bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 light:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={settlePaymentMethod}
                    onChange={(e) => setSettlePaymentMethod(e.target.value)}
                    className="w-full bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 light:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="UPI">UPI / GPay</option>
                    <option value="Cash">Cash</option>
                    <option value="NetBanking">Net Banking</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
              </div>

              {/* Checkbox to register as Personal Transaction */}
              <label className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-950/50 light:bg-slate-100 border border-slate-800 light:border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settleLogToTx}
                  onChange={(e) => setSettleLogToTx(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-200 light:text-slate-800 block">
                    Register in personal ledger
                  </span>
                  <span className="text-[11px] text-slate-400 light:text-slate-500 block">
                    {settleModalFriend.netBalance > 0
                      ? 'Adds this payment as Income in your dashboard'
                      : 'Adds this payment as Expense in your dashboard'}
                  </span>
                </div>
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSettleModalFriend(null)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 light:hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20"
                >
                  Confirm Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
