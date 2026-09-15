import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar, 
  Tag, 
  FileText, 
  CreditCard 
} from 'lucide-react';
import { Transaction, Category, TransactionType, PaymentMethod } from '../types';
import { getCurrencySymbol } from '../utils/currency';
import { parseExpenseFromText } from '../utils/smartParser';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (txData: Omit<Transaction, 'id' | 'createdAt'>, existingId?: string) => void;
  initialTransaction?: Transaction | null;
  categories: Category[];
  currency: string;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTransaction,
  categories,
  currency,
}) => {
  const [mode, setMode] = useState<'form' | 'smart'>('form');
  const [smartText, setSmartText] = useState('');
  
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<string>('food');
  const [date, setDate] = useState<string>(() => new Date().toLocaleDateString('en-CA'));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string>('');

  const currencySymbol = getCurrencySymbol(currency);

  useEffect(() => {
    if (initialTransaction) {
      setType(initialTransaction.type);
      setAmount(initialTransaction.amount.toString());
      setTitle(initialTransaction.title);
      setCategory(initialTransaction.category);
      setDate(initialTransaction.date);
      setPaymentMethod(initialTransaction.paymentMethod || 'UPI');
      setNote(initialTransaction.note || '');
      setMode('form');
    } else {
      resetForm();
    }
  }, [initialTransaction, isOpen]);

  const resetForm = () => {
    setType('expense');
    setAmount('');
    setTitle('');
    setCategory(categories[0]?.id || 'food');
    setDate(new Date().toLocaleDateString('en-CA'));
    setPaymentMethod('UPI');
    setNote('');
    setSmartText('');
    setError('');
  };

  const handleSmartParse = () => {
    if (!smartText.trim()) {
      setError('Please paste an SMS or text to parse.');
      return;
    }

    const parsed = parseExpenseFromText(smartText);
    if (parsed.amount > 0) {
      setAmount(parsed.amount.toString());
    }
    if (parsed.title) {
      setTitle(parsed.title);
    }
    setType(parsed.type);
    
    // Check if category exists
    if (categories.some(c => c.id === parsed.category)) {
      setCategory(parsed.category);
    }
    
    setPaymentMethod(parsed.paymentMethod);
    if (parsed.note) {
      setNote(parsed.note);
    }
    
    setError('');
    setMode('form');
  };

  const handleQuickAmount = (val: number) => {
    const current = parseFloat(amount) || 0;
    setAmount((current + val).toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }

    if (!title.trim()) {
      setError('Please enter a title or merchant name.');
      return;
    }

    onSave(
      {
        title: title.trim(),
        amount: numAmount,
        type,
        category,
        date,
        paymentMethod,
        note: note.trim() || undefined,
      },
      initialTransaction ? initialTransaction.id : undefined
    );

    onClose();
  };

  if (!isOpen) return null;

  const paymentMethods: PaymentMethod[] = ['UPI', 'Card', 'Cash', 'NetBanking', 'Other'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 light:border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-100 light:text-slate-900">
              {initialTransaction ? 'Edit Transaction' : 'Add Transaction'}
            </h2>
            <p className="text-xs text-slate-400 light:text-slate-500">
              {initialTransaction ? 'Update payment details' : 'Log a new expense or income'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 light:hover:text-slate-700 rounded-xl hover:bg-slate-800 light:hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Toggle (Form vs Smart SMS/Text) */}
        {!initialTransaction && (
          <div className="flex px-6 pt-3 gap-2">
            <button
              type="button"
              onClick={() => setMode('form')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                mode === 'form'
                  ? 'bg-slate-800 light:bg-slate-200 text-slate-100 light:text-slate-900 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Manual Entry
            </button>
            <button
              type="button"
              onClick={() => setMode('smart')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                mode === 'smart'
                  ? 'bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 shadow-sm'
                  : 'text-indigo-400 hover:text-indigo-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Smart SMS / Text Auto-fill</span>
            </button>
          </div>
        )}

        <div className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400">
              {error}
            </div>
          )}

          {mode === 'smart' ? (
            <div className="space-y-4">
              <div className="p-3 bg-indigo-950/30 border border-indigo-500/20 rounded-xl">
                <p className="text-xs text-indigo-300 leading-relaxed">
                  💡 Paste any bank transaction SMS, UPI notification, or simple natural text like:
                  <span className="block mt-1 font-mono text-[11px] text-slate-300 bg-black/30 p-2 rounded">
                    &ldquo;Paid Rs. 450 at Swiggy via UPI for dinner&rdquo;
                  </span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1.5">
                  Paste SMS or Natural Description
                </label>
                <textarea
                  rows={4}
                  value={smartText}
                  onChange={(e) => setSmartText(e.target.value)}
                  placeholder="e.g. Sent Rs. 1,200.00 to Shell Petrol via GPay on 15-Sep..."
                  className="w-full bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl p-3 text-sm text-slate-100 light:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setMode('form')}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSmartParse}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  Parse & Fill Form
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 light:bg-slate-100 rounded-xl border border-slate-800 light:border-slate-200">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                    type === 'expense'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4 text-rose-400" />
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                    type === 'income'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  Income
                </button>
              </div>

              {/* Amount Input with Currency Symbol & Quick Presets */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    autoFocus
                    className="w-full bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl pl-10 pr-4 py-3 text-xl font-bold text-slate-100 light:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                  />
                </div>

                {/* Quick Add Chips */}
                <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
                  {[100, 500, 1000, 2000, 5000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleQuickAmount(preset)}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-slate-800 light:bg-slate-100 hover:bg-slate-700 light:hover:bg-slate-200 text-slate-300 light:text-slate-700 rounded-lg shrink-0 transition-colors"
                    >
                      +{currencySymbol}{preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title / Merchant */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1">
                  Title / Merchant
                </label>
                <div className="relative">
                  <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Starbucks Coffee, Grocery Run, Salary"
                    required
                    className="w-full bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 light:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1.5">
                  Category
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
                  {categories.map((cat) => {
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`flex items-center gap-1.5 p-2 rounded-xl text-left border transition-all ${
                          isSelected
                            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                            : 'bg-slate-950/60 light:bg-slate-50 border-slate-800 light:border-slate-200 text-slate-300 light:text-slate-700 hover:bg-slate-800'
                        }`}
                      >
                        <span className="text-base">{cat.icon}</span>
                        <span className="text-xs truncate font-medium">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date & Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1">
                    Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="w-full bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl pl-10 pr-3 py-2 text-xs sm:text-sm text-slate-100 light:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1">
                    Payment Method
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl pl-10 pr-3 py-2 text-xs sm:text-sm text-slate-100 light:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      {paymentMethods.map((m) => (
                        <option key={m} value={m} className="bg-slate-900 text-white light:bg-white light:text-slate-900">
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Note / Tag */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1">
                  Note / Details (Optional)
                </label>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Additional details, tax, bill ref, or description..."
                    className="w-full bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl pl-10 pr-3 py-2 text-xs sm:text-sm text-slate-100 light:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-slate-800 light:border-slate-200 text-xs sm:text-sm font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                >
                  {initialTransaction ? 'Save Changes' : 'Add Transaction'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
