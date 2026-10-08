# Transactional Email via Nodemailer + Gmail (Firebase Cloud Functions)

A portable, copy-pasteable recipe for adding order/event notification emails to a
Firebase project. This is the exact pattern used in this repo (`functions/index.js`),
generalized so you can drop it into another project.

**Stack:** Firebase Cloud Functions (Node 20) → Nodemailer → Gmail SMTP.
No third-party email API (SendGrid / Resend / Mailgun) required.

---

## 1. Decide if Gmail is right for you

| | Gmail SMTP (this guide) | SendGrid / Resend / Postmark |
|---|---|---|
| Setup time | ~10 min | ~30 min (domain + DNS) |
| Cost | Free | Free tier, then paid |
| Daily limit | ~500/day (free Gmail), ~2000/day (Workspace) | 100/day → millions |
| From address | Your Gmail address only | Your own domain |
| Deliverability | Fine for internal/admin notices | Better for customer-facing mail |
| Analytics | None | Opens, clicks, bounces |

**Use Gmail when:** notifying a handful of internal recipients (store owners, admins,
superadmin) at low volume. **Switch to a real ESP when:** emailing end customers,
sending >300/day, or you need a branded `from` domain.

---

## 2. Create a Gmail App Password

Regular Gmail passwords will **not** work — SMTP requires an App Password.

1. The sending account must have **2-Step Verification enabled**:
   <https://myaccount.google.com/security>
2. Go to <https://myaccount.google.com/apppasswords>
3. App name: e.g. `Firebase Functions` → **Create**
4. Copy the 16-character password (shown once; spaces are optional/ignored).

> If `/apppasswords` 404s, 2FA isn't on yet, or this is a Workspace account whose
> admin has disabled App Passwords. Ask your Workspace admin to allow them.

---

## 3. Install the dependency

```bash
cd functions
npm install nodemailer
```

`functions/package.json` should end up with:

```json
{
  "engines": { "node": "20" },
  "main": "index.js",
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^5.0.0",
    "nodemailer": "^6.10.1"
  }
}
```

---

## 4. Store credentials in `functions/.env`

Create `functions/.env` — the Firebase CLI auto-loads this at deploy time and
injects the values as `process.env.*` in the deployed function:

```dotenv
EMAIL_USER=your-sender@gmail.com
EMAIL_PASS=abcdefghijklmnop
SUPERADMIN_EMAIL=you@example.com
```

**Add it to `.gitignore` immediately:**

```gitignore
.env
functions/.env
service_key.json
```

Verify it is not tracked:

```bash
git check-ignore -v functions/.env   # should print the matching .gitignore rule
git ls-files functions/.env          # should print nothing
```

> **Note on secrets:** `.env` values are stored in plaintext in your function's
> deployment config and are visible to anyone with project access. For stronger
> isolation use Secret Manager — see §10.

---

## 5. Configure the transporter (once, at module scope)

Put this at module scope in `functions/index.js` so the connection pool is reused
across warm invocations:

```js
const functions = require('firebase-functions')
const admin = require('firebase-admin')
const nodemailer = require('nodemailer')

admin.initializeApp()

// Configure email transport via functions/.env:
//   EMAIL_USER=your@gmail.com
//   EMAIL_PASS=your-app-password
const emailUser = process.env.EMAIL_USER || ''
const emailPass = process.env.EMAIL_PASS || ''
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || ''

// null when unconfigured -> callers degrade to a log instead of crashing
const transporter = emailUser && emailPass
    ? nodemailer.createTransport({
        service: 'gmail',
        auth: { user: emailUser, pass: emailPass },
    })
    : null
```

The `service: 'gmail'` shorthand resolves to `smtp.gmail.com:465` over TLS.
For a non-Gmail SMTP host, use the explicit form:

```js
nodemailer.createTransport({
    host: 'smtp.example.com',
    port: 465,
    secure: true,                       // true for 465, false for 587 (STARTTLS)
    auth: { user: emailUser, pass: emailPass },
})
```

**The null-guard matters.** It lets local dev and CI run without credentials —
every send site checks `if (!transporter)` and logs instead of throwing.

---

## 6. Send on a Firestore trigger

The core pattern: a document write fires the function, you fan out one email per
recipient, and you await them all together.

```js
/**
 * Firestore trigger: notify store owners when a new order is created.
 * Each store owner with a configured storeEmail gets only their own items.
 */
exports.onOrderCreated = functions.firestore
    .document('orders/{orderId}')
    .onCreate(async (snap, context) => {
        const order = snap.data()
        const orderId = context.params.orderId

        if (!order || !Array.isArray(order.items) || order.items.length === 0) return null

        // 1. Group the payload by recipient
        const byStore = {}
        for (const item of order.items) {
            const sid = item.storeId || '_'
            if (!byStore[sid]) byStore[sid] = []
            byStore[sid].push(item)
        }

        // 2. Resolve recipient addresses from Firestore
        const usersSnap = await admin.firestore().collection('users').get()
        const admins = usersSnap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((u) => u.storeId && u.role === 'admin')

        const siteUrl = 'https://your-project.web.app'
        const sends = []

        // 3. Queue one email per recipient -- do NOT await inside the loop
        for (const [sid, items] of Object.entries(byStore)) {
            if (sid === '_') continue

            const storeUser = admins.find((u) => u.storeId === sid)
            const to = storeUser && storeUser.storeEmail
            if (!to) {
                console.log(`[onOrderCreated] Store ${sid} has no email configured, skipping.`)
                continue
            }

            const subject = `New order — ${orderId}`
            const html = renderOrderEmail({ orderId, items, siteUrl })

            if (!transporter) {
                console.warn(`[onOrderCreated] Email not configured. Would send to ${to}:`, subject)
                continue
            }

            sends.push(
                transporter.sendMail({
                    from: `"Your Brand" <${emailUser}>`,
                    to,
                    subject,
                    html,
                })
                    .then(() => console.log(`[onOrderCreated] Sent to ${to} for order ${orderId}`))
                    // catch per-send: one bad address must not kill the others
                    .catch((err) => console.error(`[onOrderCreated] Email to ${to} failed:`, err)),
            )
        }

        await Promise.all(sends)

        // 4. Optional: a single digest to the superadmin
        if (transporter && SUPERADMIN_EMAIL) {
            await transporter.sendMail({
                from: `"Your Brand" <${emailUser}>`,
                to: SUPERADMIN_EMAIL,
                subject: `[SuperAdmin] New order — ${orderId}`,
                html: renderDigestEmail({ orderId, order, siteUrl }),
            }).catch((e) => console.error('[onOrderCreated] SuperAdmin email failed:', e))
        }

        return null
    })
```

### Four rules this encodes

1. **Return early on malformed docs** — triggers fire on every write, including
   partial ones written by other code paths.
2. **Never `await sendMail` inside the fan-out loop.** Push promises, then
   `Promise.all`. Serial awaits turn 10 recipients into 10x the latency and can
   hit the function timeout.
3. **`.catch()` on every individual send.** One invalid address should not abort
   the batch or mark the function as failed (which triggers a retry).
4. **Always `return null`** from a background trigger so the runtime knows you're done.

---

## 7. Other trigger shapes

```js
// Fire on a status transition (guard against no-op writes!)
exports.onOrderDelivered = functions.firestore
    .document('orders/{orderId}')
    .onUpdate(async (change, context) => {
        const before = change.before.data()
        const after = change.after.data()

        if (before.status === after.status) return null   // unrelated field changed
        if (after.status !== 'Delivered') return null
        if (!transporter || !SUPERADMIN_EMAIL) return null

        await transporter.sendMail({ /* ... */ })
            .catch((e) => console.error('[onOrderDelivered] failed:', e))
        return null
    })

// Send on demand from the client
exports.sendTestEmail = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Sign in required')
    }
    if (!transporter) {
        throw new functions.https.HttpsError('failed-precondition', 'Email not configured')
    }
    await transporter.sendMail({
        from: `"Your Brand" <${emailUser}>`,
        to: data.to,
        subject: data.subject,
        html: data.html,
    })
    return { success: true }
})
```

`onUpdate` fires on **every** write to the document. Without the
`before.status === after.status` guard you will send a duplicate email every time
any unrelated field changes.

---

## 8. HTML email template rules

Email clients are stuck in 2005. Keep templates dumb:

- **Inline styles only.** No `<style>` blocks, no external CSS, no Tailwind.
- **Tables for layout.** Flexbox and grid do not work in Outlook.
- **No JavaScript**, no web fonts, no `position`.
- Wrap in a `max-width: 560px; margin: 0 auto` container.
- Give every value a fallback: `${customer.name || '—'}`.
- Include a deep link back into your admin UI — that's the whole point of the mail.

```js
function renderOrderEmail({ orderId, items, siteUrl }) {
    const rows = items.map((i) => `
        <tr>
            <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0;">${esc(i.name)}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0;text-align:center;">${i.quantity || 1}</td>
        </tr>`).join('')

    return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
        <h2 style="color:#D66B3E;">New order</h2>
        <p><strong>Order:</strong> ${esc(orderId)}</p>
        <table style="width:100%;border-collapse:collapse;margin:12px 0;border:1px solid #e5e7eb;">
            <thead>
                <tr style="background:#f9fafb;">
                    <th style="padding:8px 10px;text-align:left;font-size:12px;color:#6b7280;">Product</th>
                    <th style="padding:8px 10px;text-align:center;font-size:12px;color:#6b7280;">Qty</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
        <a href="${siteUrl}/admin/orders/${encodeURIComponent(orderId)}"
           style="display:inline-block;background:#1e293b;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;">
            View order →
        </a>
    </div>`
}
```

### Escape user-supplied values

Any user-controlled string interpolated into the HTML (product titles, customer
names, addresses, notes) can break your markup or inject content. Add a helper:

```js
const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
```

---

## 9. Deploy and verify

```bash
# From the project root
npx firebase login
npx firebase use <your-project-id>

# Deploy only the function you changed (much faster than the whole codebase)
npx firebase deploy --only functions:onOrderCreated

# Deploy everything
npx firebase deploy --only functions

# Watch it run
npx firebase functions:log --only onOrderCreated
```

`firebase.json` needs a `functions` entry:

```json
{
  "functions": [
    { "source": "functions", "codebase": "default", "runtime": "nodejs20" }
  ]
}
```

### Local testing

```bash
npx firebase emulators:start --only functions,firestore
```

The emulator reads `functions/.env`, so a real email **will** be sent if
credentials are present. To dry-run, temporarily blank `EMAIL_USER` — the
null-guard falls back to `console.warn`.

To verify SMTP credentials in isolation before wiring up any trigger:

```bash
cd functions
node -e "require('dotenv').config(); const nm=require('nodemailer'); nm.createTransport({service:'gmail',auth:{user:process.env.EMAIL_USER,pass:process.env.EMAIL_PASS}}).verify().then(()=>console.log('SMTP OK')).catch(e=>console.error('FAIL',e.message))"
```

(`npm i -D dotenv` if it isn't already present — it's only needed for this local check.)

---

## 10. Gotchas

**Blaze plan required.** Cloud Functions need the pay-as-you-go plan. Outbound
network calls (SMTP included) are blocked on the free Spark plan — the symptom is
a connection timeout with no useful error.

**`firebase-functions` v6+ moved the v1 API.** The `functions.firestore.document()`
syntax above is the **v1** API. On v6 or later, either import it explicitly or
migrate to v2:

```js
// v1 syntax on firebase-functions v6+
const functions = require('firebase-functions/v1')

// or v2
const { onDocumentCreated } = require('firebase-functions/v2/firestore')
exports.onOrderCreated = onDocumentCreated('orders/{orderId}', async (event) => {
    const order = event.data.data()
    const orderId = event.params.orderId
    // ...
})
```

**Background triggers retry.** If the function throws, Cloud Functions may re-run
it — sending duplicate emails. That's why every `sendMail` has its own `.catch()`.
For genuine idempotency, write an `emailSentAt` field back to the document and
return early if it's already set.

**`sendMail` is slow (1–3s each).** Batching 50 recipients serially will blow the
default 60s timeout. Either fan out in parallel (as above) or raise the limits:
`.runWith({ timeoutSeconds: 300, memory: '512MB' })`.

**Gmail rate limits are per-day, not per-hour.** ~500/day for consumer Gmail.
Exceeding it locks SMTP for ~24h. Watch for `454 4.7.0 Too many login attempts`.

**Reading a whole collection to find recipients doesn't scale.**
`collection('users').get()` is fine at a few hundred docs. Past that, query
directly: `.where('role', '==', 'admin').where('storeId', 'in', storeIds)`.

**Firestore `in` queries cap at 10 (v1) / 30 (v2) values.** Chunk your lookups:

```js
for (let i = 0; i < ids.length; i += 10) {
    const batch = ids.slice(i, i + 10)
    const snap = await db.collection('products').where('__name__', 'in', batch).get()
    // ...
}
```

**Emails landing in spam?** Gmail SMTP through a personal account has no SPF/DKIM
alignment with your domain. Fine for internal notices; for customer mail, move to
an ESP with a verified sending domain.

### Upgrading to Secret Manager

When `.env` isn't good enough:

```js
const { defineSecret } = require('firebase-functions/params')
const emailPassSecret = defineSecret('EMAIL_PASS')

exports.onOrderCreated = functions
    .runWith({ secrets: [emailPassSecret] })
    .firestore.document('orders/{orderId}')
    .onCreate(async (snap, context) => {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.EMAIL_USER, pass: emailPassSecret.value() },
        })
        // ...
    })
```

```bash
npx firebase functions:secrets:set EMAIL_PASS
```

Note the transporter must move *inside* the handler, since `.value()` is only
available at runtime.

---

## 11. Prompt to paste into Claude Code on a new project

> Add transactional email to this Firebase project using Nodemailer over Gmail SMTP.
>
> 1. `npm install nodemailer` in `functions/`.
> 2. Create `functions/.env` with `EMAIL_USER`, `EMAIL_PASS`, `SUPERADMIN_EMAIL`
>    placeholders, and make sure `functions/.env` is in `.gitignore` and untracked.
> 3. In `functions/index.js`, add a module-scope Nodemailer transporter reading
>    those env vars, set to `null` when unconfigured so callers degrade to a
>    `console.warn` instead of throwing.
> 4. Add a Firestore `onCreate` trigger on `<collection>/{docId}` that resolves
>    recipient addresses from `<users collection>`, builds an inline-styled HTML
>    email per recipient, pushes each `sendMail` promise into an array with its own
>    `.catch()`, then `await Promise.all(...)` — never await inside the loop.
> 5. HTML-escape every user-supplied value interpolated into the template.
> 6. Return `null` from the trigger.
>
> Match the existing code style in `functions/index.js`. Do not deploy — I'll
> review first.

---

## 12. Reference implementation

In this repo, all of the above lives in `functions/index.js`:

| Concern | Location |
|---|---|
| Transporter config | `functions/index.js:864-873` |
| `onOrderCreated` — per-store fan-out | `functions/index.js:949` |
| Recipient lookup from `users` | `functions/index.js:980-1003` |
| Superadmin digest | `functions/index.js:1076-1101` |
| `onOrderDelivered` | `functions/index.js:1111` |
| `onOrderStatusChange` | `functions/index.js:1196` |
| `onNewChatMessage` | `functions/index.js:1309` |
