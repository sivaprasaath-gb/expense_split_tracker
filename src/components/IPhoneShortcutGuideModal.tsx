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
  smsWebhookKey = 'wbk_user123',
  onRegenerateKey,
  onSendSimulatedSms,
  currency = 'INR',
  customWebhookServerUrl,
  onUpdateServerUrl,
}) => {
  const [activeTab, setActiveTab] = useState<'webhook' | 'simulator' | 'csv_backup'>('webhook');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [customSms, setCustomSms] = useState(SAMPLE_SMS_TEMPLATES[0].text);
  const [simulatedResult, setSimulatedResult] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [pingStatus, setPingStatus] = useState<{ testing: boolean; success?: boolean; msg?: string } | null>(null);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(customWebhookServerUrl || '');

  if (!isOpen) return null;

  // Webhook URL resolved against active backend server
  const activeBaseUrl = getApiBaseUrl(customWebhookServerUrl);
  const webhookUrl = getApiUrl(`/api/sms-webhook?key=${smsWebhookKey}`, customWebhookServerUrl);

  const curlCommand = `curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Dear Customer, INR 450.00 debited from A/c XX1234 at STARBUCKS via UPI"}'`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2200);
  };

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(curlCommand);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2200);
  };

  const handleTestParse = () => {
    const result = parseExpenseFromText(customSms);
    setSimulatedResult(result);
  };

  const handlePingServer = async () => {
    setPingStatus({ testing: true });
    try {
      const pingUrl = getApiUrl('/api/sms-webhook/ping', customWebhookServerUrl);
      const res = await fetch(pingUrl);
      const data = await res.json();
      if (res.ok && data.status === 'ok') {
        setPingStatus({ testing: false, success: true, msg: 'Server is active, online, and responding!' });
      } else {
        setPingStatus({ testing: false, success: false, msg: 'Server responded with unexpected status' });
      }
    } catch {
      setPingStatus({ testing: false, success: false, msg: `Could not reach ${activeBaseUrl}` });
    }
  };

  const handleSendToInbox = async () => {
    setIsSending(true);
    try {
      if (onSendSimulatedSms) {
        onSendSimulatedSms(customSms);
      } else {
        const postUrl = getApiUrl('/api/sms-webhook', customWebhookServerUrl);
        await fetch(postUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: customSms, key: smsWebhookKey }),
        });
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
        <div className="flex border-b border-slate-800 light:border-slate-200 px-5 pt-2 bg-slate-900 light:bg-white text-xs font-semibold">
          <button
            onClick={() => setActiveTab('webhook')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'webhook'
                ? 'border-indigo-500 text-indigo-400 light:text-indigo-600 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>1. Shortcuts Setup</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('simulator');
              if (!simulatedResult) handleTestParse();
            }}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
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
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'csv_backup'
                ? 'border-indigo-500 text-indigo-400 light:text-indigo-600 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>3. Numbers / CSV (Backup)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-sm text-slate-300 light:text-slate-700">
          {activeTab === 'webhook' && (
            <div className="space-y-4">
              {/* Personal Webhook URL Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900/80 light:from-indigo-50 light:to-slate-100 border border-indigo-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 light:text-indigo-700">
                    <ShieldCheck className="w-4 h-4 text-indigo-400" />
                    <span>Your Dedicated Webhook URL</span>
                  </div>
                  {onRegenerateKey && (
                    <button
                      onClick={onRegenerateKey}
                      className="text-[11px] text-slate-400 hover:text-indigo-400 flex items-center gap-1 transition-colors"
                      title="Generate new webhook secret token"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Regenerate Key</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-950 light:bg-white border border-slate-800 light:border-slate-300 font-mono text-xs text-indigo-300 light:text-indigo-700 select-all truncate focus:outline-none"
                  />
                  <button
                    onClick={handleCopyUrl}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
                  >
                    {copiedUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedUrl ? 'Copied!' : 'Copy URL'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 light:text-slate-500">
                  This private endpoint receives the SMS body from your iPhone and automatically registers it into your Pending Review inbox.
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-indigo-500/15 text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span>Server:</span>
                    <span className="font-mono text-indigo-300 light:text-indigo-700 truncate max-w-[200px] sm:max-w-xs">{activeBaseUrl}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handlePingServer}
                    disabled={pingStatus?.testing}
                    className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer bg-slate-900/80 px-2 py-1 rounded-lg border border-indigo-500/30"
                  >
                    <Zap className="w-3 h-3 text-amber-300" />
                    <span>{pingStatus?.testing ? 'Checking...' : 'Ping Server'}</span>
                  </button>
                </div>
                {pingStatus && (
                  <div className={`p-2 rounded-lg text-[11px] font-medium ${pingStatus.success ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'}`}>
                    {pingStatus.success ? '🟢 ' : '🔴 '}{pingStatus.msg}
                  </div>
                )}
              </div>

              {/* Step by step iPhone Shortcut creation */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Configuring Apple Shortcuts (Takes 60 seconds):
                </h3>

                {/* Step 1 */}
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-800/50 light:bg-slate-100 border border-slate-700/50 light:border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-slate-100 light:text-slate-900 text-xs sm:text-sm">
                      Create a Personal Automation
                    </h4>
                    <p className="text-xs text-slate-400 light:text-slate-600">
                      Open <strong>Shortcuts</strong> on your iPhone $\rightarrow$ tap <strong>Automation</strong> at bottom $\rightarrow$ tap <strong>New Automation</strong> $\rightarrow$ choose <strong>Message</strong>.
                    </p>
                    <div className="p-2 rounded-xl bg-slate-900 light:bg-white text-slate-300 light:text-slate-800 text-[11px] font-mono border border-slate-700/40 light:border-slate-300">
                      Message Contains: <span className="text-indigo-400 font-bold">debited</span> (or <span className="text-indigo-400 font-bold">spent</span>)<br />
                      Run Immediately: <span className="text-emerald-400 font-bold">Turn ON</span><br />
                      Notify When Run: <span className="text-slate-400 font-bold">Turn OFF</span>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-800/50 light:bg-slate-100 border border-slate-700/50 light:border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <h4 className="font-semibold text-slate-100 light:text-slate-900 text-xs sm:text-sm">
                      Add "Get Contents of URL" Action
                    </h4>
                    <p className="text-xs text-slate-400 light:text-slate-600">
                      Tap <strong>New Blank Automation</strong> $\rightarrow$ Add Action $\rightarrow$ Search <strong>Get Contents of URL</strong>:
                    </p>
                    <div className="p-2.5 rounded-xl bg-slate-900 light:bg-white text-[11px] font-mono border border-slate-700/40 light:border-slate-300 space-y-1">
                      <div>URL: <span className="text-indigo-300 light:text-indigo-700 truncate block">{webhookUrl}</span></div>
                      <div>Method: <span className="text-amber-400 font-bold">POST</span></div>
                      <div>Request Body: <span className="text-emerald-400 font-bold">JSON</span></div>
                      <div className="text-slate-400">
                        Add field: Key = <strong className="text-slate-200 light:text-slate-800">message</strong> $\rightarrow$ Value = <strong className="text-indigo-400">Shortcut Input</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-800/50 light:bg-slate-100 border border-slate-700/50 light:border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-100 light:text-slate-900 text-xs sm:text-sm">
                      Done! Automatic Real-time Ingestion
                    </h4>
                    <p className="text-xs text-slate-400 light:text-slate-600 mt-0.5">
                      Whenever you pay via UPI (GPay, PhonePe, Paytm) or swipe your bank card, iOS captures the debit SMS, transmits it directly to the webhook, and populates your Pending Review inbox!
                    </p>
                  </div>
                </div>
              </div>

              {/* cURL preview toggle */}
              <div className="pt-1">
                <button
                  onClick={handleCopyCurl}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer"
                >
                  {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCurl ? 'Copied cURL command!' : 'Copy cURL command to test via Terminal'}</span>
                </button>
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
