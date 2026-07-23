# All-Pro Opt-In Email Campaign

This campaign uses the existing `Leads` tab as the consent source. It imports only rows where `Marketing Opt-In` is explicitly `yes` (or another recorded affirmative value). It does not import Angi leads, recovered email addresses, ordinary estimate requests, or anyone marked `No`.

The current live Sheet audit on July 23, 2026 found one explicit `yes` row and seven explicit `No` rows in the `Leads` tab. Re-run the preview before every campaign because that count will change as new forms arrive.

## Why This Is A Short Email, Not A Flyer Attachment

A responsive text-first email is easier to read on a phone and avoids the attachment and image-heavy patterns that can hurt deliverability. It contains one estimate button, one homeowner-guide link, the business phone number, a visible unsubscribe link, and a reply-`REMOVE` option.

## Apps Script Setup

1. Replace the code in the existing All-Pro Form Handler project with the current `allpro-form-handler.gs` file.
2. Deploy a new version of the existing web app. Keep the same deployment URL and keep access set to `Anyone` so website forms and unsubscribe links work.
3. In **Project Settings > Script Properties**, add:
   - `MARKETING_POSTAL_ADDRESS`: a valid current street address, registered PO box, or registered private mailbox for All-Pro.
   - `MARKETING_BATCH_SIZE`: `5` for the first live batch.
   - `MARKETING_CAMPAIGN_ID`: `seasonal-project-planning-2026-07`.
   - `MARKETING_SEND_ENABLED`: `false` until the test is approved.
4. Run `setupMarketingCampaignSystem()` once and approve requested Gmail/Sheets permissions.
5. Run `previewSeasonalCampaign()`. Confirm the eligible count and masked addresses.
6. Run `sendSeasonalCampaignTest()`. Review the message in Tony's inbox on desktop and mobile and test every link.
7. Click the unsubscribe link in a fresh test subscriber record and confirm both `Marketing Subscribers` and the source `Leads` row are suppressed.
8. Change `MARKETING_SEND_ENABLED` to `true` only after the test passes, then run `sendSeasonalCampaignBatch()`.
9. Run `installLeadAutomationTriggers()` to check every morning for exact replies such as `REMOVE ME` or `UNSUBSCRIBE`. Those replies are suppressed and receive one short apology confirmation.

## Operating Rules

- Send one individual message per opted-in address. Never use a visible `To`/`CC` list or a blind mass BCC.
- Send no more than six messages per day and leave at least 90 minutes between individually reviewed sends.
- Keep every customer-facing message generic: offer help planning a budget, a free consultation or estimate, an invitation to reply with project photos, and one branded estimate link. Do not mention the person's former request, what Bill sold, or work All-Pro may have completed.
- Never enable a row merely because the person requested an estimate in the past.
- Do not delete unsubscribe rows. `Unsubscribed` is a permanent suppression record that prevents accidental re-import.
- Honor every opt-out immediately; the code also updates the source `Marketing Opt-In` cell to `No`.
- Review ambiguous negative replies manually. Automation acts only on a short standalone opt-out instruction.
- Do not attach purchased, scraped, Angi, recovered, or third-party lists.

## Deliverability Note

Apps Script checks the current MailApp quota and reserves ten recipients for normal lead alerts. A consumer Gmail account is currently documented at 100 Apps Script email recipients per day, but quota is not a recommended campaign size. For larger campaigns, use a reputable email service provider that supports SPF, DKIM, DMARC, bounce handling, and RFC 8058 `List-Unsubscribe` headers.

## Compliance Note

Commercial email must use accurate sender information and subject lines, identify the commercial nature of the message, include a valid physical postal address, provide a clear opt-out method, and honor opt-outs. This implementation is an operational safeguard, not legal advice. Review the FTC CAN-SPAM guide before the first send.
