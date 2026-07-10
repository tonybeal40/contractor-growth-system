# Phase 2: Apps Script Primary Lead Engine

Date: 2026-07-09

Objective: make the Google Apps Script endpoint the primary lead engine for All-Pro forms. The endpoint should log leads to the Google Sheet and send Bill/Tony/SMS notifications. FormSubmit stays active until this is proven.

## Current Verification

Test run on 2026-07-09:

- Direct POST to deployed Apps Script returned `{"ok":true}`.
- The test row appeared in `All-Pro Leads` -> `Leads`.
- No matching Gmail notification appeared.

Conclusion:

The deployed Apps Script is still the older Sheet-only version or does not have the new MailApp notification path authorized. Do not switch forms away from FormSubmit yet.

## Files Ready In Repo

- `allpro-form-handler.gs`
  - Now includes `sendLeadNotification`.
  - Now includes Tony SMS gateway copies.
  - Now includes `phase2SelfTest()` for authorization and verification.
- `formsubmit-lead-tracking.js`
  - Still dual-submits: Apps Script first, then FormSubmit.
  - This is the safe mode until the Apps Script notification path is proven.

## Manual Redeploy Steps

1. Open the existing Apps Script project connected to `All-Pro Leads`.
2. Open the editor.
3. Replace the current code with the full contents of `allpro-form-handler.gs`.
4. Save.
5. In the function dropdown, select `phase2SelfTest`.
6. Click Run.
7. Approve permissions for Sheets and Mail.
8. Confirm:
   - a self-test row appears in `Leads`
   - Bill receives email
   - Tony receives Gmail copy
   - Tony receives at least one SMS gateway alert
9. Go to Deploy -> Manage deployments.
10. Edit the existing web app deployment.
11. Select New version.
12. Keep:
    - Execute as: Me
    - Who has access: Anyone
13. Deploy.
14. Keep the same web app URL:

```text
https://script.google.com/macros/s/AKfycbwXlYCGiy_SCFsZE5lnujH3iKeslueXoTQ54DLFdt-UDvP7ldixk12-WG5owCgy9oLMIQ/exec
```

## Post-Redeploy Test

Run these tests after deployment:

1. Direct endpoint POST.
2. `contact.html` live form.
3. `get-quote.html` live form.
4. `nextdoor.html` live form.
5. `estimator.html` live form.

Each test must confirm:

- Row appears in `Leads`.
- Real lead fields are in the right columns.
- Email notification arrives.
- SMS copy arrives.
- Thank-you redirect works.

## Only After Tests Pass

Then we can move from safe dual-submit mode to primary Apps Script mode:

```text
Website form -> Apps Script -> Sheet + email/SMS + thank-you
```

Until then, keep:

```text
Website form -> Apps Script logger -> FormSubmit email fallback
```

## Failure Handling

If Apps Script email fails:

- Keep FormSubmit as the production email path.
- Use Apps Script only as the Sheet logger.
- Do not change live form actions.

If Sheet logging fails:

- Keep FormSubmit email.
- Fix Apps Script before any form-action migration.

If both work:

- Update `formsubmit-lead-tracking.js` to support Apps Script primary mode.
- Migrate one form first, likely `contact.html`.
- Test before migrating the rest.
