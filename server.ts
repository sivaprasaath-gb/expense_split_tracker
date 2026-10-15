import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { parseExpenseFromText } from './src/utils/smartParser.ts';
import { PendingTransaction } from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Persistent SMS Store file path
const DATA_DIR = path.resolve(__dirname, 'data');
const STORE_FILE = path.join(DATA_DIR, 'pending-sms.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory cache synced with disk
interface SmsStore {
  // keyed by webhookKey -> array of PendingTransaction
  [key: string]: PendingTransaction[];
}

function loadStore(): SmsStore {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const content = fs.readFileSync(STORE_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Failed to read SMS store from disk:', err);
  }
  return {};
}

function saveStore(store: SmsStore) {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write SMS store to disk:', err);
  }
}

let smsStore: SmsStore = loadStore();

// Middleware: CORS for iOS Shortcuts and cross-origin requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-webhook-key');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Middleware: Body parsers (JSON, plain text, urlencoded)
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(express.text({ type: ['text/*', 'application/x-www-form-urlencoded'], limit: '5mb' }));

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

/**
 * Ping endpoint for quick Safari verification on iPhone
 */
app.get('/api/sms-webhook/ping', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Varaavu Selaavu SMS Webhook',
    message: 'Webhook is active, running, and listening for iOS Shortcut debit automations!',
    timestamp: Date.now(),
  });
});

/**
 * Direct SMS Webhook Ingestion endpoint
/**
 * Core processing logic for incoming debit SMS
 */
function processSmsPayload(key: string, message: string, sender: string = '') {
  if (!message || typeof message !== 'string' || !message.trim()) {
    return {
      status: 400,
      data: {
        success: false,
        error: 'No SMS message body found in request',
        expectedFormat: {
          url: '/api/sms-webhook?key=YOUR_KEY',
          method: 'POST',
          body: { message: 'Dear Customer, your A/c XX1234 debited by Rs 450 at Starbucks...' },
        },
      },
    };
  }

  // Parse SMS with Smart Engine
  const parsed = parseExpenseFromText(message, sender);

  // Validate that it contains a financial debit / expense
  if (!parsed.isDebitAlert || parsed.amount <= 0) {
    return {
      status: 200,
      data: {
        success: false,
        ignored: true,
        reason: 'Message does not appear to be a financial debit alert (might be OTP, promotional, or balance inquiry).',
        parsedTitle: parsed.title,
        amount: parsed.amount,
      },
    };
  }

  // Construct Pending Transaction
  const pendingItem: PendingTransaction = {
    id: `sms_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: parsed.title,
    amount: parsed.amount,
    type: parsed.type,
    category: parsed.category,
    date: parsed.date,
    paymentMethod: parsed.paymentMethod,
    accountNumber: parsed.accountNumber,
    source: 'sms_webhook',
    rawSms: message,
    note: parsed.accountNumber ? `${parsed.accountNumber} · Auto-captured via iPhone SMS` : 'Auto-captured via iPhone SMS',
    createdAt: Date.now(),
  };

  // Store in persistent queue
  if (!smsStore[key]) {
    smsStore[key] = [];
  }

  // Prevent exact duplicates within last 1 hour
  const isDuplicate = smsStore[key].some(
    (existing) =>
      existing.amount === pendingItem.amount &&
      existing.title === pendingItem.title &&
      existing.date === pendingItem.date &&
      Math.abs(existing.createdAt - pendingItem.createdAt) < 3600000
  );

  if (!isDuplicate) {
    smsStore[key].unshift(pendingItem);
    if (smsStore[key].length > 100) {
      smsStore[key] = smsStore[key].slice(0, 100);
    }
    saveStore(smsStore);
  }

  return {
    status: 200,
    data: {
      success: true,
      isDuplicate,
      message: isDuplicate
        ? 'Duplicate debit SMS within 1 hr detected - already in pending inbox queue'
        : 'Debit SMS successfully parsed and stored in pending review queue!',
      transaction: pendingItem,
      queueCount: smsStore[key].length,
    },
  };
}

/**
 * GET /api/sms-webhook
 * When user visits the webhook URL directly in a browser (or sends message via query string)
 */
app.get('/api/sms-webhook', (req, res) => {
  const key = (
    (req.query.key as string) ||
    (req.headers['x-webhook-key'] as string) ||
    'default'
  ).trim();

  // If testing directly via browser URL bar query param, e.g. ?message=...
  const queryMessage = (req.query.message || req.query.text || req.query.sms || req.query.content) as string;
  const querySender = (req.query.sender || req.query.from || '') as string;

  if (queryMessage && queryMessage.trim()) {
    const result = processSmsPayload(key, queryMessage.trim(), querySender);
    return res.status(result.status).json(result.data);
  }

  const items = smsStore[key] || [];

  // If user opens the link in Safari or Chrome, render an interactive diagnostics & test page
  if (req.accepts('html') && !req.accepts('json')) {
    return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SMS Webhook · Varaavu Selaavu</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #090d16;
      color: #e2e8f0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 20px;
      padding: 28px;
      max-width: 580px;
      width: 100%;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
      font-size: 13px;
      font-weight: 600;
      padding: 6px 14px;
      border-radius: 9999px;
    }
    .pulse {
      width: 8px;
      height: 8px;
      background: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 10px #10b981;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      color: #f8fafc;
      margin-bottom: 8px;
    }
    p {
      color: #94a3b8;
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 16px;
    }
    .callout {
      background: rgba(59, 130, 246, 0.1);
      border-left: 4px solid #3b82f6;
      border-radius: 0 12px 12px 0;
      padding: 14px 16px;
      margin-bottom: 20px;
      font-size: 13.5px;
      color: #93c5fd;
      line-height: 1.5;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 20px;
    }
    .stat-box {
      background: #1a2234;
      border: 1px solid #283548;
      border-radius: 12px;
      padding: 12px;
    }
    .stat-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      margin-bottom: 4px;
    }
    .stat-val {
      font-size: 14px;
      font-weight: 600;
      color: #f1f5f9;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      word-break: break-all;
    }
    .test-section {
      background: #1a2234;
      border: 1px solid #283548;
      border-radius: 14px;
      padding: 16px;
      margin-bottom: 20px;
    }
    .test-title {
      font-size: 13px;
      font-weight: 700;
      color: #cbd5e1;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    textarea {
      width: 100%;
      background: #0b1120;
      border: 1px solid #334155;
      border-radius: 10px;
      color: #e2e8f0;
      padding: 10px;
      font-size: 13px;
      line-height: 1.4;
      resize: vertical;
      min-height: 70px;
      margin-bottom: 10px;
    }
    .btn-group {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    button, .btn {
      background: #4f46e5;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s;
    }
    button:hover, .btn:hover { background: #4338ca; }
    .btn-secondary {
      background: #334155;
      color: #cbd5e1;
    }
    .btn-secondary:hover { background: #475569; }
    #result-box {
      margin-top: 12px;
      padding: 10px;
      border-radius: 8px;
      font-size: 12px;
      font-family: monospace;
      display: none;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="badge">
        <div class="pulse"></div>
        Webhook Active & Ready
      </div>
      <span style="font-size: 12px; color: #64748b;">Varaavu Selaavu API</span>
    </div>

    <h1>Direct SMS Webhook Endpoint</h1>
    <p>This backend URL receives incoming debit SMS notifications automatically dispatched from your iPhone Personal Automation.</p>

    <div class="callout">
      <strong>Why are you seeing this page?</strong><br/>
      You clicked or opened this URL in a web browser, which sends an <strong>HTTP GET</strong> request.
      In your <strong>iPhone Shortcuts app</strong>, make sure the automation action is configured to send an <strong>HTTP POST</strong> request with the SMS text in the JSON body.
    </div>

    <div class="info-grid">
      <div class="stat-box">
        <div class="stat-label">Your Webhook Key</div>
        <div class="stat-val">${key}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Pending Inbox Count</div>
        <div class="stat-val">${items.length} items waiting</div>
      </div>
    </div>

    <div class="test-section">
      <div class="test-title">🧪 Instant Browser Test Simulator</div>
      <textarea id="testMsg">Dear Customer, INR 450.00 debited from your A/c XX1234 on 15-OCT-26 to STARBUCKS via UPI. Bal: INR 12,450.</textarea>
      <div class="btn-group">
        <button id="sendBtn" onclick="testSend()">⚡ Test Webhook Parsing Now</button>
        <button type="button" class="btn-secondary" onclick="presetMsg()">Load Sample Bank SMS</button>
      </div>
      <div id="result-box"></div>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
      <a href="/" class="btn" style="background: #0284c7;">← Open Varaavu Selaavu App</a>
      <span style="font-size: 12px; color: #64748b;">Method: POST /api/sms-webhook</span>
    </div>
  </div>

  <script>
    const samples = [
      'Dear Customer, INR 450.00 debited from your A/c XX1234 on 15-OCT-26 to STARBUCKS via UPI.',
      'Alert: You have spent INR 1,299.00 on your Credit Card ending 5432 at ZOMATO on 15-Oct-26.',
      'A/c 8901 debited by Rs 340.00 on 15Oct26 transfer to BLINKIT GROCERIES Ref 8371928.',
      'Paid Rs 180 to Uber Rides using Google Pay UPI on 15-Oct-26.'
    ];
    let idx = 0;
    function presetMsg() {
      idx = (idx + 1) % samples.length;
      document.getElementById('testMsg').value = samples[idx];
    }
    async function testSend() {
      const btn = document.getElementById('sendBtn');
      const box = document.getElementById('result-box');
      const text = document.getElementById('testMsg').value.trim();
      btn.textContent = 'Sending...';
      btn.disabled = true;
      try {
        const res = await fetch('/api/sms-webhook?key=${key}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text })
        });
        const data = await res.json();
        box.style.display = 'block';
        if (data.success) {
          box.style.background = 'rgba(16, 185, 129, 0.2)';
          box.style.color = '#34d399';
          box.style.border = '1px solid #10b981';
          box.textContent = '✅ SUCCESS! ' + data.message + '\\nTitle: ' + data.transaction.title + ' | Amount: ₹' + data.transaction.amount + ' | Category: ' + data.transaction.category + '\\n👉 Open the app to see it in your Pending Inbox!';
        } else {
          box.style.background = 'rgba(239, 68, 68, 0.2)';
          box.style.color = '#f87171';
          box.style.border = '1px solid #ef4444';
          box.textContent = '⚠️ ' + (data.reason || data.error || 'Message not recognized as debit SMS');
        }
      } catch (err) {
        box.style.display = 'block';
        box.style.background = 'rgba(239, 68, 68, 0.2)';
        box.style.color = '#f87171';
        box.textContent = '❌ Error: ' + err.message;
      } finally {
        btn.textContent = '⚡ Test Webhook Parsing Now';
        btn.disabled = false;
      }
    }
  </script>
</body>
</html>`);
  }

  // JSON Response
  return res.json({
    status: 'online',
    service: 'Varaavu Selaavu SMS Webhook',
    key,
    pendingInQueue: items.length,
    message: 'SMS Webhook is active and ready to receive debit messages via HTTP POST from Apple Shortcuts automation.',
    shortcutConfiguration: {
      url: `/api/sms-webhook?key=${key}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      bodyFormat: { message: 'Shortcut Input' },
    },
    quickBrowserTestUrl: `/api/sms-webhook?key=${key}&message=Dear+Customer+INR+450+debited+at+Starbucks`,
    timestamp: Date.now(),
  });
});

/**
 * Direct SMS Webhook Ingestion endpoint
 * Receives debit SMS from Apple Shortcuts Personal Automation via POST
 */
app.post('/api/sms-webhook', (req, res) => {
  try {
    // 1. Resolve Webhook Key
    const key = (
      (req.query.key as string) ||
      (req.headers['x-webhook-key'] as string) ||
      (typeof req.body === 'object' && req.body?.key) ||
      'default'
    ).trim();

    // 2. Extract SMS message text
    let message = '';
    let sender = '';

    if (typeof req.body === 'string') {
      message = req.body;
    } else if (typeof req.body === 'object' && req.body !== null) {
      message =
        req.body.message ||
        req.body.text ||
        req.body.sms ||
        req.body.body ||
        req.body.content ||
        '';
      sender = req.body.sender || req.body.from || '';
    }

    const result = processSmsPayload(key, message, sender);
    return res.status(result.status).json(result.data);
  } catch (err: any) {
    console.error('Error in POST /api/sms-webhook:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal error processing debit SMS',
    });
  }
});

/**
 * Fetch pending SMS transactions for a given user key
 */
app.get('/api/sms-inbox', (req, res) => {
  const key = ((req.query.key as string) || 'default').trim();
  const items = smsStore[key] || [];
  res.json({
    success: true,
    key,
    count: items.length,
    transactions: items,
  });
});

/**
 * Acknowledge and clear processed SMS transactions
 */
app.post('/api/sms-inbox/ack', (req, res) => {
  try {
    const key = (req.body?.key || req.query.key || 'default').toString().trim();
    const ids: string[] = Array.isArray(req.body?.ids) ? req.body.ids : [];

    if (!smsStore[key] || !ids.length) {
      return res.json({ success: true, removedCount: 0 });
    }

    const idSet = new Set(ids);
    const initialCount = smsStore[key].length;
    smsStore[key] = smsStore[key].filter((item) => !idSet.has(item.id));
    const removedCount = initialCount - smsStore[key].length;

    saveStore(smsStore);

    res.json({
      success: true,
      removedCount,
      remainingCount: smsStore[key].length,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Interactive SMS Simulation & Sandbox endpoint
 */
app.post('/api/sms-webhook/simulate', (req, res) => {
  try {
    const { text, addToInbox, key } = req.body || {};
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required for simulation' });
    }

    const parsed = parseExpenseFromText(text);

    let createdItem: PendingTransaction | null = null;
    if (addToInbox && parsed.isDebitAlert && parsed.amount > 0) {
      const activeKey = (key || 'default').trim();
      createdItem = {
        id: `sim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        title: parsed.title,
        amount: parsed.amount,
        type: parsed.type,
        category: parsed.category,
        date: parsed.date,
        paymentMethod: parsed.paymentMethod,
        accountNumber: parsed.accountNumber,
        source: 'sms_webhook',
        rawSms: text,
        note: parsed.accountNumber ? `${parsed.accountNumber} · Test Simulation` : 'Test Simulation',
        createdAt: Date.now(),
      };

      if (!smsStore[activeKey]) {
        smsStore[activeKey] = [];
      }
      smsStore[activeKey].unshift(createdItem);
      saveStore(smsStore);
    }

    res.json({
      success: true,
      parsed,
      createdItem,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Setup Vite or Static File Serving
async function startServer() {
  if (!isProd) {
    // Development mode with Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: Serve built frontend from dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`✨ Varaavu Selaavu Server running on http://0.0.0.0:${PORT}`);
    console.log(`⚡ SMS Webhook listening at: POST /api/sms-webhook?key=<YOUR_KEY>`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
