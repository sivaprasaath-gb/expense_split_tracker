import React, { useState, useRef } from 'react';
import { 
  X, 
  Inbox, 
  CheckCircle2, 
  Trash2, 
  Upload, 
  FileSpreadsheet, 
  HelpCircle, 
  Users2, 
  Sparkles, 
  Check, 
  FileText, 
  Zap, 
  RefreshCw, 
  CreditCard, 
  MessageSquare,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { PendingTransaction, Category, SplitGroup, Friend, Transaction } from '../types';
import { formatCurrency } from '../utils/currency';
import { formatDisplayDate } from '../utils/storage';
import { parseSpreadsheetTransactions } from '../utils/csvSyncEngine';
import { parseExpenseFromText } from '../utils/smartParser';

interface PendingInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingTransactions: PendingTransaction[];
  categories: Category[];
  splitGroups: SplitGroup[];
  friends: Friend[];
  currency: string;
  existingTransactions: Transaction[];
  onApproveSingle: (pending: PendingTransaction) => void;
  onApproveAll: (items: PendingTransaction[]) => void;
  onDismissSingle: (id: string) => void;
  onDismissAll: () => void;
  onUpdatePendingItem: (id: string, updates: Partial<PendingTransaction>) => void;
  onImportCsv: (csvContent: string) => void;
  onAddDirectPending?: (item: PendingTransaction) => void;
  onOpenGuide: () => void;
  onRefreshWebhook?: () => void;
  isRefreshing?: boolean;
}

export const PendingInboxModal: React.FC<PendingInboxModalProps> = ({
  isOpen,
  onClose,
  pendingTransactions,
  categories,
  splitGroups,
  friends,
  currency,
  existingTransactions,
  onApproveSingle,
  onApproveAll,
  onDismissSingle,
  onDismissAll,
  onUpdatePendingItem,
  onImportCsv,
  onAddDirectPending,
  onOpenGuide,
  onRefreshWebhook,
  isRefreshing = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [expandedSmsId, setExpandedSmsId] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalPendingAmount = pendingTransactions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const webhookCount = pendingTransactions.filter(p => p.source === 'sms_webhook').length;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = parseSpreadsheetTransactions(
          content,
          categories,
          existingTransactions,
          pendingTransactions
        );

        if (result.newTransactions.length > 0) {
          onImportCsv(content);
          setSyncFeedback(`Imported ${result.newTransactions.length} new debit(s)${result.duplicateCount > 0 ? ` (${result.duplicateCount} duplicates skipped)` : ''}`);
        } else if (result.duplicateCount > 0) {
          setSyncFeedback(`All ${result.duplicateCount} transactions in this file are already recorded!`);
        } else {
          setSyncFeedback('No valid debit transactions found in this file.');
        }
        setTimeout(() => setSyncFeedback(null), 4000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handlePasteSubmit = () => {
    if (!pasteText.trim()) return;

    // Check if it's a single SMS or spreadsheet CSV
    const isSingleSms = !pasteText.includes('\n') && (pasteText.toLowerCase().includes('debited') || pasteText.toLowerCase().includes('spent') || pasteText.toLowerCase().includes('upi'));

    if (isSingleSms && onAddDirectPending) {
      const parsed = parseExpenseFromText(pasteText);
      if (parsed.amount > 0) {
        const newItem: PendingTransaction = {
          id: `sms_manual_${Date.now()}`,
          title: parsed.title,
          amount: parsed.amount,
          type: parsed.type,
          category: parsed.category,
          date: parsed.date,
          paymentMethod: parsed.paymentMethod,
          accountNumber: parsed.accountNumber,
          source: 'sms_webhook',
          rawSms: pasteText,
          note: parsed.accountNumber ? `${parsed.accountNumber} · Parsed SMS` : 'Parsed SMS',
          createdAt: Date.now(),
        };
        onAddDirectPending(newItem);
        setSyncFeedback(`Captured ₹${parsed.amount} at ${parsed.title}!`);
        setPasteText('');
        setShowPasteBox(false);
        setTimeout(() => setSyncFeedback(null), 4000);
        return;
      }
    }

    // Default to CSV/Spreadsheet parse
    const result = parseSpreadsheetTransactions(
      pasteText,
      categories,
      existingTransactions,
      pendingTransactions
    );

    if (result.newTransactions.length > 0) {
      onImportCsv(pasteText);
      setSyncFeedback(`Found ${result.newTransactions.length} transaction(s)!`);
      setPasteText('');
      setShowPasteBox(false);
    } else if (result.duplicateCount > 0) {
      setSyncFeedback('All these transactions have already been logged.');
    } else {
      setSyncFeedback('Could not detect debit amount or date from text.');
    }
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  const getCategory = (catId: string) => {
    return categories.find(c => c.id === catId) || {
      id: 'other',
      name: 'Other',
      icon: '🏷️',
      color: '#64748b',
      budget: 0,
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv,.tsv,.txt"
        className="hidden"
      />

      <div 
        className="w-full max-w-3xl bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 light:border-slate-200 flex items-center justify-between bg-slate-900/60 light:bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 via-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-100 light:text-slate-900">
                  Pending Debit Inbox
                </h2>
                {pendingTransactions.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    {pendingTransactions.length}
                  </span>
                )}
                {webhookCount > 0 && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span>{webhookCount} via SMS Webhook</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 light:text-slate-500">
                {pendingTransactions.length > 0
                  ? `Review auto-captured debits before committing · Total: ${formatCurrency(totalPendingAmount, currency)}`
                  : 'Zero unreviewed debits · Captured SMS messages appear here instantly'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onRefreshWebhook && (
              <button
                onClick={onRefreshWebhook}
                disabled={isRefreshing}
                className="p-2 text-slate-400 hover:text-indigo-400 rounded-xl hover:bg-slate-800 light:hover:bg-slate-200 transition-colors cursor-pointer"
                title="Check for new SMS from Webhook queue"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
              </button>
            )}

            <button
              onClick={onOpenGuide}
              className="p-2 text-slate-400 hover:text-indigo-400 rounded-xl hover:bg-slate-800 light:hover:bg-slate-200 transition-colors"
              title="iPhone Shortcuts Webhook Setup Guide"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-200 light:hover:text-slate-700 rounded-xl hover:bg-slate-800 light:hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sync Feedback Toast Banner */}
        {syncFeedback && (
          <div className="px-5 py-2.5 bg-indigo-500/10 border-b border-indigo-500/20 text-indigo-300 light:text-indigo-700 text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <Sparkles className="w-4 h-4 shrink-0 text-indigo-400" />
            <span>{syncFeedback}</span>
          </div>
        )}

        {/* Action Toolbar */}
        <div className="px-5 py-2.5 border-b border-slate-800 light:border-slate-200 bg-slate-900/40 light:bg-slate-100/50 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenGuide}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>iPhone Webhook Setup</span>
            </button>

            <button
              onClick={() => setShowPasteBox(!showPasteBox)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 light:bg-slate-200 hover:bg-slate-700 light:hover:bg-slate-300 text-slate-300 light:text-slate-700 font-semibold transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{showPasteBox ? 'Hide Paste' : 'Paste SMS Text'}</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/60 light:bg-slate-200 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[11px] transition-colors"
              title="Import historical CSV if needed"
            >
              <Upload className="w-3 h-3" />
              <span>Import CSV</span>
            </button>
          </div>

          {pendingTransactions.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onApproveAll(pendingTransactions)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Approve All ({pendingTransactions.length})</span>
              </button>

              <button
                onClick={onDismissAll}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 font-semibold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            </div>
          )}
        </div>

        {/* Collapsible Paste Textarea */}
        {showPasteBox && (
          <div className="p-4 border-b border-slate-800 light:border-slate-200 bg-slate-950/60 light:bg-slate-50 space-y-2">
            <label className="block text-xs font-semibold text-slate-300 light:text-slate-700">
              Paste raw debit SMS or CSV text to test:
            </label>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="e.g.: Dear Customer, INR 450.00 debited from A/c XX1234 at STARBUCKS via UPI on 14-OCT-26..."
              rows={3}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 light:bg-white border border-slate-700 light:border-slate-300 text-xs text-slate-100 light:text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPasteBox(false)}
                className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePasteSubmit}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                Parse & Add to Inbox
              </button>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {pendingTransactions.length === 0 ? (
            <div className="py-12 sm:py-16 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-slate-800/60 light:bg-slate-100 border border-slate-700/60 light:border-slate-200 text-slate-400 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="max-w-sm mx-auto">
                <h3 className="text-base font-bold text-slate-100 light:text-slate-900">
                  Inbox is Clean & Caught Up!
                </h3>
                <p className="text-xs text-slate-400 light:text-slate-500 mt-1">
                  When your iPhone receives a debit SMS, it automatically sends it to your webhook and appears here for 1-tap review.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                <button
                  onClick={onOpenGuide}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all active:scale-95 cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-amber-300" />
                  View iPhone Automation Setup
                </button>
                {onRefreshWebhook && (
                  <button
                    onClick={onRefreshWebhook}
                    disabled={isRefreshing}
                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 light:bg-slate-200 hover:bg-slate-700 light:hover:bg-slate-300 text-slate-300 light:text-slate-700 text-xs font-semibold transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Check Webhook Queue
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingTransactions.map((item) => {
                const category = getCategory(item.category);
                const hasSplits = Boolean(item.isSplit);
                const isSmsSource = item.source === 'sms_webhook';
                const isExpanded = expandedSmsId === item.id;

                return (
                  <div
                    key={item.id}
                    className="p-3.5 sm:p-4 rounded-2xl border border-slate-800 light:border-slate-200 bg-slate-900/60 light:bg-white shadow-sm space-y-3 transition-all hover:border-slate-700"
                  >
                    {/* Top Row: Title, Badges, Amount, Date */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => onUpdatePendingItem(item.id, { title: e.target.value })}
                            className="text-sm sm:text-base font-bold text-slate-100 light:text-slate-900 bg-transparent border-b border-transparent hover:border-slate-600 focus:border-indigo-500 focus:outline-none truncate"
                          />

                          {isSmsSource && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              <Zap className="w-2.5 h-2.5 text-amber-400" />
                              <span>iPhone SMS</span>
                            </span>
                          )}

                          {item.accountNumber && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 light:bg-slate-100 text-slate-300 light:text-slate-700 border border-slate-700/60">
                              <CreditCard className="w-2.5 h-2.5 text-indigo-400" />
                              <span>{item.accountNumber}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                          <span>{formatDisplayDate(item.date)}</span>
                          <span>·</span>
                          <span className="capitalize">{item.paymentMethod || 'UPI'}</span>
                          {item.note && (
                            <>
                              <span>·</span>
                              <span className="truncate max-w-[150px] sm:max-w-xs">{item.note}</span>
                            </>
                          )}
                          {item.rawSms && (
                            <button
                              type="button"
                              onClick={() => setExpandedSmsId(isExpanded ? null : item.id)}
                              className="text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-0.5 ml-1"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>{isExpanded ? 'Hide SMS' : 'View SMS'}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono tabular-nums text-base sm:text-lg font-bold text-rose-400">
                          -{formatCurrency(item.amount, currency)}
                        </span>
                      </div>
                    </div>

                    {/* Expandable Raw SMS Body */}
                    {isExpanded && item.rawSms && (
                      <div className="p-2.5 rounded-xl bg-slate-950 light:bg-slate-100 border border-slate-800 light:border-slate-300 text-xs text-slate-300 light:text-slate-800 font-mono leading-relaxed animate-fade-in">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Original Bank SMS:
                        </div>
                        {item.rawSms}
                      </div>
                    )}

                    {/* Middle Row: Category Selection & Split Toggle */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/50 light:border-slate-100">
                      {/* Category Dropdown */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-400 font-medium">Category:</span>
                        <div className="relative inline-flex items-center">
                          <span className="text-sm mr-1">{category.icon}</span>
                          <select
                            value={item.category}
                            onChange={(e) => onUpdatePendingItem(item.id, { category: e.target.value })}
                            className="text-xs font-semibold bg-slate-800 light:bg-slate-100 text-slate-200 light:text-slate-800 rounded-lg px-2 py-1 pr-6 border border-slate-700/60 light:border-slate-300 focus:outline-none cursor-pointer"
                          >
                            {categories.map((c) => (
                              <option key={c.id} value={c.id} className="bg-slate-900 text-white light:bg-white light:text-slate-900">
                                {c.icon} {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Split Expense Switch */}
                      <button
                        type="button"
                        onClick={() => onUpdatePendingItem(item.id, { isSplit: !item.isSplit })}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          hasSplits
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-800/80 light:bg-slate-100 text-slate-400 hover:text-slate-200 border border-slate-700/60 light:border-slate-300'
                        }`}
                      >
                        <Users2 className="w-3.5 h-3.5" />
                        <span>{hasSplits ? 'Splitting with Group' : 'Split Expense?'}</span>
                      </button>
                    </div>

                    {/* Expanded Split Options */}
                    {hasSplits && (
                      <div className="p-3 rounded-xl bg-slate-950/70 light:bg-slate-50 border border-slate-800 light:border-slate-200 space-y-2 text-xs animate-fade-in">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200 light:text-slate-800">
                            Select Split Group or Friends:
                          </span>
                          {splitGroups.length > 0 && (
                            <select
                              value={item.splitGroupId || ''}
                              onChange={(e) => {
                                const gId = e.target.value;
                                const group = splitGroups.find(g => g.id === gId);
                                onUpdatePendingItem(item.id, {
                                  splitGroupId: gId || undefined,
                                  splitWithMemberIds: group ? group.memberIds : ['YOU'],
                                });
                              }}
                              className="bg-slate-800 light:bg-white text-slate-200 light:text-slate-800 px-2 py-0.5 rounded text-[11px] border border-slate-700 light:border-slate-300"
                            >
                              <option value="">Custom Friends</option>
                              {splitGroups.map(g => (
                                <option key={g.id} value={g.id}>
                                  {g.icon} {g.name} ({g.memberIds.length} members)
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        {/* Friends checkbox list */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold">
                            You (Paid)
                          </span>
                          {friends.map(f => {
                            const isSelected = item.splitWithMemberIds?.includes(f.id);
                            return (
                              <button
                                key={f.id}
                                type="button"
                                onClick={() => {
                                  const current = item.splitWithMemberIds || ['YOU'];
                                  const next = isSelected 
                                    ? current.filter(id => id !== f.id)
                                    : [...current, f.id];
                                  onUpdatePendingItem(item.id, { splitWithMemberIds: next });
                                }}
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-800 light:bg-slate-200 text-slate-300 light:text-slate-700 hover:bg-slate-700'
                                }`}
                              >
                                {isSelected ? '✓ ' : '+ '}{f.name}
                              </button>
                            );
                          })}
                          {friends.length === 0 && (
                            <span className="text-[11px] text-slate-400">
                              (Add friends in the Split tab to share automatically)
                            </span>
                          )}
                        </div>

                        {/* Split share calculation */}
                        {item.splitWithMemberIds && item.splitWithMemberIds.length > 1 && (
                          <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800 light:border-slate-200">
                            Split {item.splitWithMemberIds.length} ways = ~
                            <strong className="text-slate-200 light:text-slate-800 font-mono">
                              {formatCurrency(item.amount / item.splitWithMemberIds.length, currency)}
                            </strong> per person
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bottom Action Row */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onDismissSingle(item.id)}
                        className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Dismiss</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onApproveSingle(item)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve & Add</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Bottom Bar */}
        <div className="px-5 py-3.5 border-t border-slate-800 light:border-slate-200 flex items-center justify-between bg-slate-900/60 light:bg-slate-50">
          <span className="text-xs text-slate-400">
            {pendingTransactions.length} pending · Direct iPhone SMS Webhook Active
          </span>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 light:bg-slate-200 hover:bg-slate-700 light:hover:bg-slate-300 text-xs font-semibold text-slate-100 light:text-slate-800 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
