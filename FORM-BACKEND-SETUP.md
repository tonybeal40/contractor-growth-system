# All-Pro Form Backend Setup

## What this does
Replaces FormSubmit.co dependency with a Google Apps Script endpoint you own.
Every lead goes to:
1. **Your Apps Script** → email to Bill + Tony + logged to Google Sheet (permanent record)
2. **FormSubmit** → automatic fallback if the custom endpoint ever fails

## Deploy in 5 minutes

### Step 1 — Create the Apps Script
1. Go to [script.google.com](https://script.google.com) → **New project**
2. Delete the empty `function myFunction()` placeholder
3. Paste the entire contents of `allpro-form-handler.gs` (this repo)
4. Rename the project: `All-Pro Form Handler`
5. Click **Save**

### Step 2 — Authorize it
1. Click **Run** → select `doGet` → click **Run**
2. Google will ask for permissions — click **Review permissions** → **Allow**
   - Gmail (to send emails)
   - Google Drive / Sheets (to log leads)

### Step 3 — Deploy as Web App
1. Click **Deploy** → **New deployment**
2. Click the gear ⚙ next to "Select type" → choose **Web app**
3. Settings:
   - **Description**: All-Pro Form Handler v1
   - **Execute as**: Me *(your Google account)*
   - **Who has access**: Anyone
4. Click **Deploy** → copy the **Web App URL**
   - Looks like: `https://script.google.com/macros/s/AKfycb.../exec`

### Step 4 — Wire it in
Open `formsubmit-lead-tracking.js` and find this line near the top:

```js
const CUSTOM_ENDPOINT = "";
```

Replace the empty string with your Web App URL:

```js
const CUSTOM_ENDPOINT = "https://script.google.com/macros/s/YOUR_ID_HERE/exec";
```

### Step 5 — Push to GitHub
```
git add formsubmit-lead-tracking.js
git commit -m "Wire custom form endpoint"
git push origin main
```

Done. Every form submission now hits your Apps Script first. If it fails for any reason, the form falls back to FormSubmit automatically — no lead dropped.

---

## Where leads are stored

| Destination | What goes there |
|---|---|
| Bill's Gmail (`williamosessionallpro@gmail.com`) | Every customer lead |
| Tony's Gmail (`tonybeal40@gmail.com`) | CC on every lead |
| Google Sheet "All-Pro Leads" → "Leads" tab | Every submission, every field, timestamp |

The Sheet is created automatically the first time a form is submitted. Find it in your Google Drive.

---

## Updating the script (after code changes)
If you need to change the email body or add fields:
1. Go to `script.google.com` → open **All-Pro Form Handler**
2. Click the **+** next to Files → **Script** → paste the updated `.gs` file (or edit in place)
3. `Ctrl+S` to save
4. **Deploy → Manage deployments → ✏️ pencil → New version → Deploy**
   - URL stays the same — no change needed in `formsubmit-lead-tracking.js`

### Activate the daily lead check

After pasting the current script, run `installLeadAutomationTriggers` once and
then run `sendDailyLeadHealthDigest` once as a delivery test. The installed
morning trigger summarizes the previous 24 hours of Sheet leads and flags email,
configured SMS, confirmation, or follow-up-board failures. See
`DAILY_MONITORING_SETUP.md` for the full checklist.

---

## Recovering old leads from Gmail (one-time)

All past FormSubmit emails are in Bill's Gmail inbox. Run this once to import them into the Sheet:

1. Open the **All-Pro Form Handler** project at `script.google.com`
2. Click **+** next to Files → **Script** → name it `allpro-gmail-recovery`
3. Paste the entire contents of `allpro-gmail-recovery.gs` (this repo)
4. `Ctrl+S` to save
5. **First run (preview only — no writes):**
   - Select function: `previewGmailLeads` → click ▶ Run
   - Open **Execution log** — you'll see the first 20 FormSubmit emails found
6. **Full recovery run:**
   - Select function: `recoverGmailLeads` → click ▶ Run
   - Approve Gmail read permission when prompted
   - When done: opens an alert with count — e.g. "✅ Recovery complete: 47 new leads imported"
7. Open your **All-Pro Leads** Google Sheet → **Recovered Leads** tab

✅ Safe to run multiple times — already-processed emails are skipped automatically.

---

## Troubleshooting

**Forms still go to FormSubmit only**
→ `CUSTOM_ENDPOINT` is still empty. Follow Step 4.

**Emails not arriving**
→ Check Apps Script execution log: `script.google.com` → your project → **Executions**

**Sheet not created**
→ Make sure you authorized Google Drive in Step 2. Re-run `doGet` to re-authorize.

**Rate limit from FormSubmit**
→ Once `CUSTOM_ENDPOINT` is set, FormSubmit is only used as fallback and won't be hit for normal submissions.
