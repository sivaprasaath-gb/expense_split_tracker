import React, { useState } from 'react';
import { 
  Repeat, 
  Plus, 
  Calendar, 
  CheckCircle, 
  CheckCheck,
  AlertCircle, 
  Pencil, 
  Trash2, 
  X,
  CreditCard,
  Clock
} from 'lucide-react';
import { Subscription, Category, Transaction } from '../types';
import { formatCurrency, getCurrencySymbol } from '../utils/currency';

interface SubscriptionsViewProps {
  subscriptions: Subscription[];
  categories: Category[];
  currency: string;
  selectedMonth: string;
  transactions?: Transaction[];
  onAddSubscription: (sub: Omit<Subscription, 'id'>) => void;
  onUpdateSubscription: (id: string, updates: Partial<Subscription>) => void;
  onDeleteSubscription: (id: string) => void;
  onLogSubscription: (sub: Subscription) => void;
}

export const SubscriptionsView: React.FC<SubscriptionsViewProps> = ({
  subscriptions,
  categories,
  currency,
  selectedMonth,
  transactions = [],
  onAddSubscription,
  onUpdateSubscription,
  onDeleteSubscription,
  onLogSubscription,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('1');
  const [category, setCategory] = useState('entertainment');
  const [error, setError] = useState('');

  const currencySymbol = getCurrencySymbol(currency);

  const activeSubs = subscriptions.filter(s => s.active);
  const totalMonthlyCommitment = activeSubs.reduce((s, sub) => s + Number(sub.amount || 0), 0);

  const openAddModal = () => {
    setEditingSub(null);
    setName('');
    setAmount('');
    setDay('1');
    setCategory(categories.find(c => c.id !== 'salary')?.id || 'entertainment');
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (sub: Subscription) => {
    setEditingSub(sub);
    setName(sub.name);
    setAmount(sub.amount.toString());
    setDay(sub.day.toString());
    setCategory(sub.category);
    setError('');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    const dayNum = parseInt(day, 10);

    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (!name.trim()) {
      setError('Please enter subscription name.');
      return;
    }
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      setError('Day of month must be between 1 and 31.');
      return;
    }

    if (editingSub) {
      onUpdateSubscription(editingSub.id, {
        name: name.trim(),
        amount: numAmount,
        day: dayNum,
        category,
      });
    } else {
      onAddSubscription({
        name: name.trim(),
        amount: numAmount,
        day: dayNum,
        category,
        active: true,
      });
    }

    setIsModalOpen(false);
  };

  // Calculate days until next renewal
  const getRenewalStatus = (subDay: number) => {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Next billing date
    let nextDate: Date;
    if (subDay >= currentDay) {
      nextDate = new Date(currentYear, currentMonth, subDay);
    } else {
      nextDate = new Date(currentYear, currentMonth + 1, subDay);
    }

    const diffDays = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return { label: 'Renews Today!', color: 'text-amber-400 bg-amber-500/20' };
    if (diffDays === 1) return { label: 'Renews Tomorrow', color: 'text-amber-300 bg-amber-500/10' };
    if (diffDays <= 5) return { label: `Renews in ${diffDays} days`, color: 'text-sky-300 bg-sky-500/10' };
    return { label: `Due on ${subDay}th`, color: 'text-slate-400 bg-slate-800' };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Overview Banner */}
      <div className="p-5 rounded-2xl border border-slate-800 light:border-slate-200 bg-gradient-to-r from-slate-900 to-indigo-950/40 light:from-white light:to-indigo-50/50 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Repeat className="w-4 h-4" />
            <span>Recurring Obligations</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 light:text-slate-900">
            Subscriptions & Bills
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Track expected monthly fixed costs. Log them into transactions whenever paid.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-slate-400 font-semibold block">Total Monthly</span>
            <strong className="text-lg sm:text-xl font-bold font-mono text-slate-100 light:text-slate-900">
              {formatCurrency(totalMonthlyCommitment, currency)}
            </strong>
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Subscription</span>
          </button>
        </div>
      </div>

      {/* Subscriptions Grid */}
      <div className="p-5 rounded-2xl border border-slate-800 light:border-slate-200 bg-slate-900/60 light:bg-white shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-100 light:text-slate-900">
            Active & Paused Subscriptions ({subscriptions.length})
          </h3>
        </div>

        {subscriptions.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs space-y-2">
            <p>No subscriptions tracked yet.</p>
            <button
              onClick={openAddModal}
              className="text-indigo-400 font-semibold hover:underline"
            >
              + Track Netflix, Spotify, Gym, Broadband, etc.
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {subscriptions.map((sub) => {
              const cat = categories.find(c => c.id === sub.category) || {
                name: 'Other',
                icon: '🏷️',
                color: '#64748b',
              };
              const renewal = getRenewalStatus(sub.day);
              const isLoggedThisMonth = transactions.some(
                (t) => t.date.startsWith(selectedMonth) && t.title.toLowerCase().includes(sub.name.toLowerCase())
              );

              return (
                <div
                  key={sub.id}
                  className={`p-4 rounded-xl border transition-all ${
                    sub.active
                      ? 'bg-slate-950/40 border-slate-800 light:border-slate-200 light:bg-slate-50'
                      : 'bg-slate-950/20 border-slate-900 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                        style={{ backgroundColor: `${cat.color}20` }}
                      >
                        {cat.icon}
                      </div>

                      <div>
                        <strong className="text-sm font-bold text-slate-100 light:text-slate-900 block truncate">
                          {sub.name}
                        </strong>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${renewal.color}`}>
                            {renewal.label}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {cat.name}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <strong className="text-base font-bold font-mono text-slate-100 light:text-slate-900 block">
                        {formatCurrency(sub.amount, currency)}
                      </strong>
                      <span className="text-[10px] text-slate-400 font-medium">/ month</span>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-800/60 light:border-slate-200">
                    <button
                      onClick={() => onLogSubscription(sub)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors border ${
                        isLoggedThisMonth
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                          : 'bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border-indigo-500/30'
                      }`}
                      title={isLoggedThisMonth ? "Already logged for this month. Click to log again." : "Log as an expense in current month"}
                    >
                      {isLoggedThisMonth ? (
                        <>
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Logged ({selectedMonth})</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Log for {selectedMonth}</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onUpdateSubscription(sub.id, { active: !sub.active })}
                        className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                          sub.active
                            ? 'text-slate-400 border-slate-800 hover:text-white'
                            : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                        }`}
                      >
                        {sub.active ? 'Pause' : 'Resume'}
                      </button>

                      <button
                        onClick={() => openEditModal(sub)}
                        className="p-1.5 text-slate-400 hover:text-indigo-400 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onDeleteSubscription(sub.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
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
        )}
      </div>

      {/* Add/Edit Subscription Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-100 light:text-slate-900">
                {editingSub ? 'Edit Subscription' : 'Add Subscription'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1">
                  Service / Subscription Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Netflix, Spotify, Gym, Fiber"
                  className="w-full bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-100 light:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1">
                    Monthly Cost
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                      {currencySymbol}
                    </span>
                    <input
                      type="number"
                      step="any"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl pl-8 pr-3 py-2 text-sm font-bold text-slate-100 light:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1">
                    Billing Day (1-31)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                    className="w-full bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-100 light:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-100 light:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {categories.filter(c => c.id !== 'salary').map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20"
                >
                  Save Subscription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
