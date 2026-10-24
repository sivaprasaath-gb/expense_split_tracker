import React, { useState } from 'react';
import { 
  X, 
  Smartphone, 
  Copy, 
  Check, 
  Sparkles, 
  ArrowRight, 
  RefreshCw, 
  Send, 
  ShieldCheck, 
  CheckCircle2, 
  ExternalLink,
  Zap,
  HelpCircle,
  FileSpreadsheet,
  Download,
  AlertCircle
} from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import { generateSampleTransactionsCSV } from '../utils/csvSyncEngine';
import { parseExpenseFromText } from '../utils/smartParser';
import { getApiUrl, getApiBaseUrl } from '../utils/apiConfig';

interface IPhoneShortcutGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  smsWebhookKey?: string;
  onRegenerateKey?: () => void;
  onSendSimulatedSms?: (text: string) => void;
  currency?: string;
  customWebhookServerUrl?: string;
  onUpdateServerUrl?: (url: string) => void;
}

const SAMPLE_SMS_TEMPLATES = [
  {
    bank: 'HDFC Bank (UPI)',
    text: 'Dear Customer, INR 450.00 has been debited from your A/c XX1234 on 14-OCT-26 to STARBUCKS VPA starbucks@hdfcbank. Avl Bal: INR 12,450.50. - HDFC Bank',
  },
  {
    bank: 'SBI (Zomato UPI)',
    text: 'Dear SBI UPI User, A/c 5678 debited by 320.0 on 14Oct26 transfer to ZOMATO Ref No 628371928371. Bal: Rs 4,500.00.',
  },
  {
    bank: 'ICICI (Credit Card)',
    text: 'Alert: You have spent INR 2,499.00 on your Credit Card ending with 4321 at ZARA MUMBAI on 14-Oct-26 at 18:32. Avail Lmt: INR 85,000.',
  },
  {
    bank: 'Axis Bank (Blinkit)',
    text: 'INR 540.00 debited from A/c no. XX3456 on 14-10-2026 at BLINKIT GROCERIES. UPI Ref: 394857392019. Balance: Rs 18,230.00.',
  },
  {
    bank: 'Google Pay (Uber)',
    text: 'Paid ₹180 to Uber Rides using Google Pay UPI on 14-Oct-26.',
  },
];

export const IPhoneShortcutGuideModal: React.FC<IPhoneShortcutGuideModalProps> = ({
  isOpen,
  onClose,
  onSendSimulatedSms,
  currency = 'INR',
}) => {
  const [activeTab, setActiveTab] = useState<'url_shortcut' | 'simulator' | 'csv_backup'>('url_shortcut');
  const [copiedDirectUrl, setCopiedDirectUrl] = useState(false);
  const [customSms, setCustomSms] = useState(SAMPLE_SMS_TEMPLATES[0].text);
  const [simulatedResult, setSimulatedResult] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  if (!isOpen) return null;

  const handleTestParse = () => {
    const result = parseExpenseFromText(customSms);
    setSimulatedResult(result);
  };

  const handleSendToInbox = async () => {
    setIsSending(true);
    try {
      if (onSendSimulatedSms) {
        onSendSimulatedSms(customSms);
      }
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-2xl bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 light:border-slate-200 flex items-center justify-between bg-slate-900/60 light:bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 via-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Zap className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-100 light:text-slate-900">
                  Direct iPhone SMS Debit Capture
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Live Webhook
                </span>
              </div>
              <p className="text-xs text-slate-400 light:text-slate-500">
                Auto-log bank debit SMS straight to your app without any spreadsheets
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 light:hover:text-slate-700 rounded-xl hover:bg-slate-800 light:hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 light:border-slate-200 px-5 pt-2 bg-slate-900 light:bg-white text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('url_shortcut')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'url_shortcut'
                ? 'border-indigo-500 text-indigo-400 light:text-indigo-600 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>1. Direct URL Shortcut</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('simulator');
              if (!simulatedResult) handleTestParse();
            }}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'simulator'
                ? 'border-indigo-500 text-indigo-400 light:text-indigo-600 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>2. Test SMS Simulator</span>
          </button>

          <button
            onClick={() => setActiveTab('csv_backup')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'csv_backup'
                ? 'border-indigo-500 text-indigo-400 light:text-indigo-600 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>3. Numbers / CSV</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-sm text-slate-300 light:text-slate-700">
          {activeTab === 'url_shortcut' && (
            <div className="space-y-4">
              {/* Highlight Hero Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-indigo-950/60 light:from-emerald-50 light:to-indigo-50 border border-emerald-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 light:text-emerald-700">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <span>Zero-Server Direct URL Capture (Recommended)</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300">
                    No Server Needed
                  </span>
                </div>
                <p className="text-xs text-slate-300 light:text-slate-600 leading-relaxed">
                  You don't need any webhook server or Cloud Functions! Your iPhone Shortcut simply opens your app URL with the bank SMS, and your app automatically extracts the amount, payee, and date into your <strong>Pending Review Inbox</strong>.
                </p>

                {/* URL Template Card */}
                <div className="p-3 rounded-xl bg-slate-950 light:bg-white border border-slate-800 light:border-slate-300 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400">Shortcut URL Template:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const directUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://varaavuselaavu.web.app'}/?sms=Shortcut Input`;
                        navigator.clipboard.writeText(directUrl);
                        setCopiedDirectUrl(true);
                        setTimeout(() => setCopiedDirectUrl(false), 2000);
                      }}
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedDirectUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedDirectUrl ? 'Copied URL!' : 'Copy URL'}</span>
                    </button>
                  </div>
                  <div className="font-mono text-xs text-emerald-300 light:text-emerald-700 bg-slate-900 light:bg-slate-100 p-2.5 rounded-lg break-all select-all border border-slate-800 light:border-slate-300">
                    {typeof window !== 'undefined' ? window.location.origin : 'https://varaavuselaavu.web.app'}/?sms=<span className="text-amber-400">[Shortcut Input]</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">Want to see it in action right now?</span>
                  <button
                    type="button"
                    onClick={() => {
                      const testUrl = `${window.location.pathname}?sms=${encodeURIComponent('Dear Customer, INR 450.00 debited from your A/c XX1234 on 15-OCT-26 to STARBUCKS via UPI.')}`;
                      window.location.href = testUrl;
                    }}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30"
                  >
                    <span>⚡ Test URL Capture Now</span>
                  </button>
                </div>
              </div>

              {/* 3 Step Guide */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  2-Minute iPhone Setup:
                </h3>

                {/* Step 1 */}
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-800/50 light:bg-slate-100 border border-slate-700/50 light:border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-slate-100 light:text-slate-900 text-xs sm:text-sm">
                      Create an Automation in Apple Shortcuts
                    </h4>
                    <p className="text-xs text-slate-400 light:text-slate-600">
                      Open <strong>Shortcuts</strong> on iPhone → tap <strong>Automation</strong> at bottom → tap <strong>+ (New Automation)</strong>. Choose <strong>Message</strong>.
                    </p>
                    <div className="p-2.5 rounded-xl bg-slate-900/80 light:bg-white text-[11px] space-y-1 border border-slate-700/60 light:border-slate-300 font-mono">
                      <div>• <strong>Message Contains:</strong> <span className="text-indigo-400">debited</span> (or your bank name)</div>
                      <div>• <strong>Run:</strong> <span className="text-emerald-400">Run Immediately</span> (turn off "Ask Before Running")</div>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-800/50 light:bg-slate-100 border border-slate-700/50 light:border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-slate-100 light:text-slate-900 text-xs sm:text-sm">
                      Add "Open URLs" Action
                    </h4>
                    <p className="text-xs text-slate-400 light:text-slate-600">
                      Tap <strong>New Blank Automation</strong> → tap <strong>Add Action</strong> → search for <strong>Open URLs</strong>.
                    </p>
                    <div className="p-2.5 rounded-xl bg-slate-900/80 light:bg-white text-[11px] space-y-1 border border-slate-700/60 light:border-slate-300 font-mono">
                      <div>• <strong>URL:</strong> <span className="text-indigo-400">{typeof window !== 'undefined' ? window.location.origin : 'https://varaavuselaavu.web.app'}/?sms=</span><span className="text-amber-400">[Shortcut Input]</span></div>
                      <div className="text-[10px] text-slate-400 pt-0.5">(Tap the blue pill at top of keyboard to select <em>Shortcut Input</em>)</div>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-800/50 light:bg-slate-100 border border-slate-700/50 light:border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-slate-100 light:text-slate-900 text-xs sm:text-sm">
                      Done! Automatic 1-Tap Review
                    </h4>
                    <p className="text-xs text-slate-400 light:text-slate-600">
                      When your bank sends you a debit SMS, your iPhone automatically opens the app, parses the amount and payee, and places it in your <strong>Pending Review Inbox</strong> ready for 1-tap approval.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}



          {activeTab === 'simulator' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 light:text-indigo-700 text-xs flex items-start gap-2">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Test the parser with your actual bank messages or pick a template below. You can send it directly to your pending inbox to preview the approval experience!
                </span>
              </div>

              {/* Quick Template Buttons */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Select Bank SMS Template:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {SAMPLE_SMS_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.bank}
                      onClick={() => {
                        setCustomSms(tmpl.text);
                        setSimulatedResult(parseExpenseFromText(tmpl.text));
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 light:bg-slate-200 hover:bg-slate-700 light:hover:bg-slate-300 text-slate-200 light:text-slate-800 transition-colors"
                    >
                      {tmpl.bank}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  SMS Message Body:
                </label>
                <textarea
                  value={customSms}
                  onChange={(e) => {
                    setCustomSms(e.target.value);
                    setSimulatedResult(parseExpenseFromText(e.target.value));
                  }}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 light:bg-white border border-slate-700 light:border-slate-300 text-xs text-slate-100 light:text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Paste any bank SMS text here..."
                />
              </div>

              {/* Parsed Result Card */}
              {simulatedResult && (
                <div className="p-4 rounded-2xl bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-200 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-800 light:border-slate-200 pb-2">
                    <span className="text-xs font-bold text-slate-300 light:text-slate-700">
                      Parsed Extraction Preview
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      simulatedResult.isDebitAlert
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>
                      {simulatedResult.isDebitAlert ? '✓ Valid Debit' : '⚠️ No Debit Detected'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-slate-900 light:bg-white border border-slate-800/80 light:border-slate-200">
                      <span className="text-[10px] text-slate-400 block">Amount</span>
                      <strong className="text-sm font-bold text-rose-400 font-mono">
                        {simulatedResult.amount > 0 ? formatCurrency(simulatedResult.amount, currency) : '₹0'}
                      </strong>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-900 light:bg-white border border-slate-800/80 light:border-slate-200">
                      <span className="text-[10px] text-slate-400 block">Merchant / Title</span>
                      <strong className="text-xs font-semibold text-slate-100 light:text-slate-900 truncate block">
                        {simulatedResult.title || 'Unknown'}
                      </strong>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-900 light:bg-white border border-slate-800/80 light:border-slate-200">
                      <span className="text-[10px] text-slate-400 block">Category</span>
                      <strong className="text-xs font-semibold text-indigo-400 capitalize truncate block">
                        {simulatedResult.category}
                      </strong>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-900 light:bg-white border border-slate-800/80 light:border-slate-200">
                      <span className="text-[10px] text-slate-400 block">Payment Method</span>
                      <strong className="text-xs font-semibold text-slate-200 light:text-slate-800 block">
                        {simulatedResult.paymentMethod} {simulatedResult.accountNumber ? `(${simulatedResult.accountNumber})` : ''}
                      </strong>
                    </div>
                  </div>

                  {/* Action to send to Inbox */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">
                      Date: <strong className="text-slate-300 light:text-slate-700">{simulatedResult.date}</strong>
                    </span>

                    <button
                      onClick={handleSendToInbox}
                      disabled={isSending || !simulatedResult.isDebitAlert}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                      {sendSuccess ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-white" />
                          <span>Sent to Pending Inbox!</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>{isSending ? 'Sending...' : 'Send to Pending Inbox'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'csv_backup' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 light:text-slate-600">
                If you ever want to bulk-import past statements from Numbers or CSV in iCloud, you can use the traditional file format below:
              </p>

              <div className="p-3 rounded-2xl bg-slate-950 light:bg-slate-100 border border-slate-800 light:border-slate-200 font-mono text-xs">
                <pre className="text-emerald-400 light:text-emerald-700 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {generateSampleTransactionsCSV()}
                </pre>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-400">Standard columns: Date, Amount, Merchant, Mode</span>
                <button
                  onClick={() => {
                    const blob = new Blob([generateSampleTransactionsCSV()], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', 'Transactions.csv');
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 light:bg-slate-200 hover:bg-slate-700 light:hover:bg-slate-300 text-xs font-semibold text-slate-200 light:text-slate-800"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Download Sample CSV</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 light:border-slate-200 flex items-center justify-between bg-slate-900/60 light:bg-slate-50">
          <span className="text-xs text-slate-400">
            Supports iOS 16, 17, 18+ Personal Automations
          </span>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-sm transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
