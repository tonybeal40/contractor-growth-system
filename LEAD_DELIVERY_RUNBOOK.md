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

Version 3 is already deployed. Use these steps only for the next handler update:

1. Open Apps Script project `1cJ3gn-Ca0cBbaGOlVDMWAzc0ECVyMod-mErpHqpZRw1nmzeApvR3_7P1`.
2. Replace the editor contents with `allpro-form-handler.gs` from this repository.
3. Save the project.
4. Open **Project Settings** and add the Twilio Script Properties listed below.
5. Run `smsSetupStatus` and approve Google permissions. It must report `configured: true` before an SMS test.
6. Run `sendSmsTest`. Confirm the message reaches `618-292-5320`.
7. Run `phase2SelfTest`. Confirm the email, Sheet row, and SMS.
8. Open **Deploy > Manage deployments**, edit the existing web app, choose **New version**, and deploy without changing its URL.
9. Submit one controlled public form and confirm both inboxes plus the Sheet row.

## Twilio Script Properties

Store these values in Apps Script Project Settings. Never put them in GitHub or an HTML file.

| Property | Value |
| --- | --- |
| `TWILIO_ACCOUNT_SID` | Account SID beginning with `AC` |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token |
| `TWILIO_FROM_NUMBER` | Twilio SMS-capable number in E.164 format, such as `+16185551234` |
| `SMS_ALERT_TO` | `+16182925320` |

Twilio trial accounts can send only to verified recipient numbers. The Twilio sender must be SMS-capable and belong to the same account.

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
