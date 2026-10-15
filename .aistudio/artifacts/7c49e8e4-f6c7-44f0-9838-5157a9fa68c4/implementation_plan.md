# Direct iPhone SMS Debit Capture Plan

This plan completely eliminates the need for spreadsheets (Apple Numbers or Google Sheets). Instead, your iPhone will directly capture incoming bank/UPI debit SMS messages using an **iOS Shortcuts Personal Automation** and send them straight to a dedicated app webhook, which automatically parses them into your **Pending Review Inbox**.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Summary of Selected Architecture:**
> 1. **No Spreadsheets Needed**:
>    - Bypasses Numbers and Google Sheets entirely. Zero manual file uploads, zero row ordering issues, zero syncing lag.
> 2. **iOS Shortcuts Personal Automation Trigger**:
>    - Trigger: "When I receive a message containing 'debited' (or 'spent', 'UPI', 'INR')" $\rightarrow$ Run Immediately.
>    - Action: "Get Contents of URL" $\rightarrow$ `POST` request to `https://[app-url]/api/sms-webhook` with the SMS body.
> 3. **Smart Ingestion & Parsing Engine**:
>    - Extracts: Amount, Merchant / Payee, Payment Mode (UPI, Card, NetBanking), Account digits, and Timestamp.
>    - Handles standard Indian & international bank formats (HDFC, SBI, ICICI, Axis, Kotak, GPay, PhonePe, Paytm, Chase, etc.).
> 4. **Pending Review Inbox**:
>    - Transactions land immediately in the Pending Review Inbox with a real-time badge.
>    - One tap to **[ Confirm as Personal ]** or **[ Split with Group/Roommates ]**.
> 5. **Security & Privacy**:
>    - Each user gets a unique personal Webhook Key (`/api/sms-webhook?key=...`) to ensure SMS data only routes to their private account.

---

## 1. End-to-End Workflow

```
┌────────────────────────────────────────────────────────┐
│           Bank / UPI Debit SMS Arrives                 │
│  "Dear Customer, your A/c XX1234 debited by Rs 450.00  │
│   at STARBUCKS via UPI on 14-Oct-26. Bal: Rs 12,400"   │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼ (iOS Personal Automation Trigger)
┌────────────────────────────────────────────────────────┐
│             iOS Shortcuts Automation                   │
│  Trigger: When message contains 'debited'              │
│  Run Immediately: Yes                                  │
│  Action: Get Contents of URL (POST to Webhook)         │
│  Body: { "message": Shortcut Input, "key": "user_key"} │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼ (HTTP POST /api/sms-webhook)
┌────────────────────────────────────────────────────────┐
│            Varaavu Selaavu Backend Server              │
│  • Validates personal Webhook Key                      │
│  • Runs Smart SMS Parser (regex + NLP heuristic)       │
│  • Extracts: ₹450 | Starbucks | UPI | Food & Dining    │
│  • Stores in User's Pending Transactions (Firestore)   │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼ (Real-time Firestore listener / badge)
┌────────────────────────────────────────────────────────┐
│              Pending Review Inbox Modal                │
│  ★ 1 New SMS Transaction Ready to Review               │
│  • Starbucks Coffee                                    │
│    ₹450 · UPI (A/c XX1234) · Just now                  │
│    Category: Food & Dining                             │
│                                                        │
│  [ Approve as Personal ]     [ Split with Roommates ]  │
└────────────────────────────────────────────────────────┘
```

---

## 2. Key Modules & Changes

### Module 1: Full-Stack Express Server & Webhook API
- **File**: `server.ts`
- Create standard Express server mounted with Vite middleware for dev and static serving in production.
- Update `package.json` scripts:
  - `"dev": "tsx server.ts"`
  - `"start": "node dist/server.js"` (or tsx in node runtime)
- Implement `POST /api/sms-webhook`:
  - Request format: `{ message: string, sender?: string, key: string }` or plain text body.
  - Authenticates incoming request via user's unique webhook token.
  - Executes `parseExpenseFromText(message)`.
  - Saves into user's `pendingTransactions` collection in Firestore.
  - Returns `{ success: true, transaction: {...} }`.

### Module 2: Enhanced Bank & UPI SMS Parser
- **File**: `src/utils/smartParser.ts`
- Upgrade parser to handle real-world bank formats:
  - Amount: `debited by INR 450`, `Rs. 450.00`, `₹450`, `spent Rs 450`.
  - Merchant: `at STARBUCKS`, `to SWIGGY`, `VPA merchant@okaxis`, `info: UBER RIDES`.
  - Mode: `via UPI`, `on Card ending 4321`, `IMPS/NEFT`, `NetBanking`.
  - Account Number extraction (e.g., `A/c XX8901`).
  - Auto-categorization based on known merchants and keywords.

### Module 3: Webhook Key Management & In-App Guide
- **Files**: `src/types.ts`, `src/utils/storage.ts`, `src/components/IPhoneShortcutGuideModal.tsx`
- Generate and store a secure, persistent `smsWebhookKey` in user settings/Firestore.
- In `IPhoneShortcutGuideModal.tsx`:
  - Provide a 1-tap **[ Copy Your Personal Webhook URL ]** button.
  - Step-by-step visual setup guide with iOS screenshots/diagrams for:
    1. Setting up the "Message" Automation in Apple Shortcuts.
    2. Adding the "Get Contents of URL" action.
    3. Setting JSON parameters (`message` = `Shortcut Input`).
    4. Turning on "Run Immediately" without asking.
  - Interactive "Test Your SMS" simulator: User can paste any sample bank SMS right in the app to test parsing accuracy before setting up the automation.

### Module 4: Pending Review Inbox Enhancements
- **Files**: `src/components/PendingInboxModal.tsx`, `src/components/Header.tsx`
- Display incoming SMS transactions with special "Direct SMS" badge and bank account tag.
- One-tap actions:
  - **Confirm Personal**: Saves to main expense list with chosen category.
  - **Split**: Opens split modal with amount and merchant pre-filled.
  - **Edit/Delete**: Adjust amounts or discard OTP/irrelevant messages if triggered accidentally.
- Real-time indicator in the app header showing pending SMS count badge (`[ ⚡ 1 Pending ]`).

---

## 3. Implementation Plan by Phases

### Phase 1: Server & Webhook Endpoint
- Create `server.ts` with Express and mount Vite dev server.
- Add `POST /api/sms-webhook` and `GET /api/sms-webhook/test`.
- Update `package.json` dev script to run `server.ts`.

### Phase 2: Enhanced SMS Parser & Deduplication
- Enhance `smartParser.ts` with comprehensive bank SMS patterns and merchant dictionaries.
- Ensure duplicate SMS texts or identical timestamps are ignored or flagged.

### Phase 3: Webhook Credentials & Interactive iOS Guide
- Add webhook key generation in settings and Firestore sync.
- Create the interactive iOS Shortcuts guide in `IPhoneShortcutGuideModal.tsx` with copyable webhook URLs and test sandbox.

### Phase 4: Pending Inbox UI & Verification
- Verify real-time updates when an SMS payload hits `/api/sms-webhook`.
- Verify approving/splitting pending items.
- Run `compile_applet` and check full build integrity.
