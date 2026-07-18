# All-Pro Lead Engine Automation Setup

Last updated: July 17, 2026

## What This Build Adds

- Optional Workers AI enrichment for every suitable website estimate form.
- Deterministic fallback classification when AI is unavailable.
- Homeowner, vendor-sales, contractor-partner, review, and spam routing.
- Lead score, priority, urgency, missing-information list, project brief, next step, and a ready-to-send reply.
- High-visibility HTML alerts to Bill and Tony.
- Transactional customer confirmation emails when a valid email and estimate-contact consent are present.
- Automatic entries in `Follow Up Board` with duplicate protection.
- Escalating reminders for leads still marked `New` and `Bill Text Sent? = No`.
- Review-request emails only after the board row is marked `Won` and `Review Request Status = Ready`.
- Friday lead scorecards by service, city, source, and status.
- Optional Search Console query data in the Friday scorecard.
- Bill's List contractor-partner routing to Tony instead of Bill's homeowner-lead inbox.

## Safe Deployment Order

1. Deploy `workers/lead-concierge` to Cloudflare.
2. Publish the website JavaScript and updated money pages.
3. Replace the Apps Script editor contents with `allpro-form-handler.gs`.
4. Save, run the self-tests below, then create a new version of the existing web-app deployment. Do not create a different public URL.
5. Run one controlled website submission and verify email, Sheet, Follow Up Board, customer confirmation, and configured SMS.

## Apps Script One-Time Setup

Run these functions manually in this order:

1. `leadIntelligenceSelfTest`
2. `setupFollowUpBoard`
3. `installLeadAutomationTriggers`
4. `smsSetupStatus`
5. `sendSmsTest` after Twilio is configured
6. `phase2SelfTest`
7. `configureSearchConsoleDomainProperty`
8. `authorizeSearchConsole`
9. `sendWeeklyLeadReport`
10. `automationSetupStatus`

Expected triggers:

- `sendUncontactedLeadAlerts`: hourly
- `sendPendingReviewRequests`: daily around 9 AM
- `sendWeeklyLeadReport`: Friday around 8 AM

## Search Console Permission

In Apps Script, open **Project Settings** and enable **Show appsscript.json manifest file in editor**.

Merge this scope into the existing `oauthScopes` array; do not replace unrelated manifest fields:

```json
"https://www.googleapis.com/auth/webmasters.readonly"
```

The configured property is:

```text
sc-domain:allprometroeastconstruction.com
```

The Google account running the script must have access to that Search Console property. Search Console reporting is optional: form delivery continues if it is unavailable.

## Twilio Script Properties

Keep all values in **Apps Script > Project Settings > Script Properties**:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_API_KEY_SID`
- `TWILIO_API_KEY_SECRET`
- `TWILIO_FROM_NUMBER`
- `SMS_ALERT_TO=+16182925320`

The restricted key needs only Messaging `Messages: Create`. Never paste these values into GitHub, HTML, JavaScript, documentation, or a chat. Rotate any Twilio secret that was previously pasted into a conversation before production use.

## Follow Up Board Rules

- New homeowner requests enter as `New`.
- Website sales solicitations enter as `Vendor Pitch` and route to Tony only.
- Bill's List company applications enter as `Partner Inquiry` and route to Tony only.
- Mark `Bill Text Sent?` as `Yes` or change `Status` after contact to stop uncontacted-lead reminders.
- Recommended statuses: `New`, `Contacted`, `Estimate Set`, `Won`, `Lost`, or `No Fit`.
- To send a review request, set `Status` to `Won` and `Review Request Status` to `Ready`.
- Review requests ask for an honest review and never require a positive rating.

## Controlled Public Test

Use a deliverable email address and Tony's alert phone, but make the description unmistakable:

```text
Name: All-Pro Delivery Check
Phone: 618-292-5320
Email: tonybeal40+deliverycheck@gmail.com
City: Belleville
Service: Kitchen remodel
Details: CONTROLLED DELIVERY CHECK - SAFE TO DELETE - DO NOT CALL
Marketing opt-in: unchecked
```

Verify:

1. Bill receives the formatted lead alert.
2. Tony receives the operations copy.
3. Tony receives the Twilio alert when configured.
4. The customer-confirmation message reaches the test address.
5. `Leads` contains the enriched record.
6. `Follow Up Board` contains one deduplicated row.
7. Updating the board row stops reminders.

## Current Architecture

```text
Website form
  -> optional project-only Workers AI enrichment
  -> Google Apps Script primary delivery
     -> Bill/Tony lead alert
     -> Tony SMS alert
     -> customer confirmation
     -> Leads audit tab
     -> Follow Up Board
  -> FormSubmit browser fallback if Apps Script fails
```

No AI response is allowed to quote a price, promise availability, make permit claims, or guarantee an outcome. AI failure never blocks form submission.

