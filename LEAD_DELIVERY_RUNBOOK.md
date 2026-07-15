# All-Pro Lead Delivery Runbook

Last reviewed: July 15, 2026

## Delivery Paths

Each customer form uses one verified primary handler with a fallback:

1. Google Apps Script emails Bill at `williamosessionallpro@gmail.com`, copies Tony at `tonybeal40@gmail.com`, logs the lead to the `Leads` tab, and sends an SMS when Twilio is configured.
2. FormSubmit remains only as a browser fallback if the Apps Script endpoint fails.

Inside Apps Script, email, SMS, and Sheet logging run independently so one failure does not stop the others. FormSubmit returned HTTP 500 during the July 15 controlled check, so it is not the primary delivery path.

## Google Sheet

- Spreadsheet ID: `1xcc0xo4UeN3EaZUMNn_qFJ-xgX6ZPg7l7sTMSLsT6GE`
- Expected tab: `Leads`
- Apps Script web app: `https://script.google.com/macros/s/AKfycbwXlYCGiy_SCFsZE5lnujH3iKeslueXoTQ54DLFdt-UDvP7ldixk12-WG5owCgy9oLMIQ/exec`
- Active deployment: Version 3, deployed July 15, 2026

## Deploy the Current Apps Script

The repository handler now includes a high-visibility HTML lead card while retaining a plain-text fallback. It normalizes different form field names and places name, phone, email, service, city, address, budget, timeline, description, source, consent, submission time, and session ID into consistent sections. The automatic `Leads` log also expands to 26 columns so those same project and consent details remain available in the spreadsheet.

Version 3 is the currently verified live deployment. Deploy the repository handler as a new version to activate the formatted email card:

1. Open Apps Script project `1cJ3gn-Ca0cBbaGOlVDMWAzc0ECVyMod-mErpHqpZRw1nmzeApvR3_7P1`.
2. Replace the editor contents with `allpro-form-handler.gs` from this repository.
3. Save the project.
4. Open **Project Settings** and add the Twilio Script Properties listed below.
5. Run `smsSetupStatus` and approve Google permissions. It must report `configured: true` before an SMS test.
6. Run `sendSmsTest`. Confirm the message reaches `618-292-5320`.
7. Run `phase2SelfTest`. Confirm the email, Sheet row, and SMS.
8. Open **Deploy > Manage deployments**, edit the existing web app, choose **New version**, and deploy without changing its URL.
9. Submit one controlled public form and confirm both inboxes plus the Sheet row.

The new email subject starts with `NEW ALL-PRO LEAD` and includes the homeowner name, service, city, and phone. The HTML version includes one-tap call and email buttons; the plain-text version carries the same core information if an email client blocks HTML.

## Twilio Script Properties

Store these values in Apps Script Project Settings. Never put them in GitHub or an HTML file.

| Property | Value |
| --- | --- |
| `TWILIO_ACCOUNT_SID` | Account SID beginning with `AC` |
| `TWILIO_API_KEY_SID` | Restricted API Key SID beginning with `SK` |
| `TWILIO_API_KEY_SECRET` | One-time secret for the restricted key; never place it in source control |
| `TWILIO_FROM_NUMBER` | Twilio SMS-capable number in E.164 format, such as `+16185551234` |
| `SMS_ALERT_TO` | `+16182925320` |

The restricted key needs only `twilio/messaging/messages/create`. `TWILIO_AUTH_TOKEN` remains supported as a legacy fallback, but the restricted API key is preferred. Twilio trial accounts can send only to verified recipient numbers. The Twilio sender must be SMS-capable and belong to the same account.

## Controlled Public Test

Use clearly identified but deliverable information:

- Name: `All-Pro Delivery Check`
- Email: `tonybeal40+deliverycheck@gmail.com`
- Phone: `618-292-5320`
- City: `Belleville`
- Service: `Other`
- Details: `CONTROLLED DELIVERY CHECK - SAFE TO DELETE - DO NOT CALL`
- Marketing opt-in: leave unchecked

Confirm these results:

1. Apps Script email reaches Bill's inbox.
2. Owner copy reaches Tony's inbox.
3. A new row appears in the `Leads` tab.
4. Twilio SMS reaches `618-292-5320`.

## July 15, 2026 Verification

- Controlled ID: `20260715-v3-1784098061221`
- Apps Script response: email sent; Sheet logged; no delivery errors
- Gmail: message addressed to Bill with Tony copied
- Sheet: row 20 contains the correct name, phone, email, service, city, source, session ID, and `Email Status: sent`
- SMS: not configured; the handler reports the three missing Twilio properties

Email plus Sheet delivery is confirmed. Full email plus Sheet plus SMS delivery is not complete until the Twilio properties are supplied and `sendSmsTest` reaches Tony's private alert number.

## Lead Inventory

`Follow Up Board` is the clean master action list. On July 15, 2026 it was reconciled against FormSubmit messages in Gmail from June 4 onward and contained 11 genuine homeowner/project leads plus one vendor pitch. `Leads` is the automatic handler log, while `Recovered Leads` contains historical recovery output and may include duplicate or incomplete extraction rows.
