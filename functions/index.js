const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const { parseExpenseFromText } = require('./smartParser');

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(express.text({ type: ['text/*', 'application/x-www-form-urlencoded'], limit: '5mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/sms-webhook/ping', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Varaavu Selaavu Firebase Cloud Function',
    message: 'SMS Webhook Cloud Function is active, online, and listening!',
    timestamp: Date.now(),
  });
});

async function handleSmsIngestion(key, rawMessage, sender = '') {
  if (!rawMessage || typeof rawMessage !== 'string' || !rawMessage.trim()) {
    return {
      status: 400,
      body: { success: false, error: 'No SMS message body found in request' },
    };
  }

  const parsed = parseExpenseFromText(rawMessage, sender);

  if (!parsed.isDebitAlert || parsed.amount <= 0) {
    return {
      status: 200,
      body: {
        success: false,
        ignored: true,
        reason: 'Message does not appear to be a financial debit alert',
        parsedTitle: parsed.title,
        amount: parsed.amount,
      },
    };
  }

  const pendingItem = {
    id: `sms_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: parsed.title,
    amount: parsed.amount,
    type: parsed.type,
    category: parsed.category,
    date: parsed.date,
    paymentMethod: parsed.paymentMethod,
    accountNumber: parsed.accountNumber || '',
    source: 'sms_webhook',
    rawSms: rawMessage,
    note: parsed.accountNumber ? `${parsed.accountNumber} · Auto-captured via iPhone SMS` : 'Auto-captured via iPhone SMS',
    createdAt: Date.now(),
  };

  // Save to Firestore under webhookQueues/{key}/items/{id}
  await db.collection('webhookQueues').doc(key).collection('items').doc(pendingItem.id).set(pendingItem);

  return {
    status: 200,
    body: {
      success: true,
      message: 'Debit SMS successfully parsed and stored in pending review queue!',
      transaction: pendingItem,
    },
  };
}

// POST and GET /api/sms-webhook
app.post('/api/sms-webhook', async (req, res) => {
  try {
    const key = (
      req.query.key ||
      req.headers['x-webhook-key'] ||
      (typeof req.body === 'object' && req.body?.key) ||
      'default'
    ).toString().trim();

    let message = '';
    let sender = '';
    if (typeof req.body === 'string') {
      message = req.body;
    } else if (typeof req.body === 'object' && req.body !== null) {
      message = req.body.message || req.body.text || req.body.sms || req.body.body || '';
      sender = req.body.sender || req.body.from || '';
    }

    const result = await handleSmsIngestion(key, message, sender);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Error in SMS webhook function:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/sms-webhook', async (req, res) => {
  const key = (req.query.key || 'default').toString().trim();
  const queryMessage = req.query.message || req.query.text || req.query.sms;

  if (queryMessage && typeof queryMessage === 'string' && queryMessage.trim()) {
    const result = await handleSmsIngestion(key, queryMessage.trim(), req.query.sender || '');
    return res.status(result.status).json(result.body);
  }

  res.json({
    status: 'online',
    service: 'Varaavu Selaavu Firebase Cloud Function',
    key,
    message: 'SMS Webhook Cloud Function is live and ready for iPhone Shortcuts POST automations.',
  });
});

app.get('/api/sms-inbox', async (req, res) => {
  try {
    const key = (req.query.key || 'default').toString().trim();
    const snap = await db.collection('webhookQueues').doc(key).collection('items').orderBy('createdAt', 'desc').limit(50).get();
    const items = [];
    snap.forEach((doc) => items.push(doc.data()));
    res.json({ success: true, count: items.length, transactions: items });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/sms-inbox/ack', async (req, res) => {
  try {
    const key = (req.body?.key || req.query.key || 'default').toString().trim();
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const batch = db.batch();
    ids.forEach((id) => {
      batch.delete(db.collection('webhookQueues').doc(key).collection('items').doc(id));
    });
    await batch.commit();
    res.json({ success: true, removedCount: ids.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

exports.api = functions.https.onRequest(app);
