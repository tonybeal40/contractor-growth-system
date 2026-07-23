# All-Pro Daily Monitoring

Two independent checks protect the lead path.

## 1. GitHub production health check

`.github/workflows/daily-health.yml` runs every day at 13:15 UTC, which is
8:15 AM Central during daylight time and 7:15 AM Central during standard time.
It can also be run manually from GitHub Actions.

The workflow verifies:

- the homepage and priority Belleville, O'Fallon, Highland, review, match, and estimate pages;
- one H1, title, meta description, production canonical, phone route, form action, and form routing script;
- the sitemap, `robots.txt`, and `llms.txt` priority references;
- the live Google Apps Script form-handler health response;
- the live Cloudflare lead-concierge health response;
- the full static SEO, public-claim, form-handler, Worker, local-lead-engine, and product-engine tests.

A failed scheduled workflow appears in GitHub Actions and uses the repository's
normal GitHub Actions failure notifications. Each run keeps a Markdown and JSON
health report for 30 days.

## 2. Google Sheet lead-delivery digest

The repository copy of `allpro-form-handler.gs` includes
`sendDailyLeadHealthDigest()`. It reads only the previous 24 hours from the
`Leads` tab and emails Tony, with Bill copied, at about 8 AM in the Apps Script
project time zone.

The digest reports:

- how many leads reached the Sheet;
- customer name, phone, email, city, and service;
- owner email status;
- configured SMS failures;
- customer-confirmation status;
- follow-up-board logging status;
- delivery notes and remaining daily mail quota.

### Activate after an Apps Script code update

1. Replace the Apps Script editor contents with the current
   `allpro-form-handler.gs` from this repository and save it.
2. Select and run `installLeadAutomationTriggers` once. Approve permissions if
   Google asks. This replaces only the All-Pro automation triggers managed by
   that function.
3. Select and run `sendDailyLeadHealthDigest` once. Confirm the test digest
   arrives at `tonybeal40@gmail.com` with Bill copied.
4. Use **Deploy > Manage deployments > Edit > New version > Deploy** so the
   existing public web-app URL continues to use the latest form code.
5. Open **Triggers** and confirm these handlers are present:
   `sendUncontactedLeadAlerts`, `sendPendingReviewRequests`,
   `sendWeeklyLeadReport`, `processMarketingOptOutReplies`, and
   `sendDailyLeadHealthDigest`.

GitHub can confirm that the public form endpoint responds, but it cannot read a
private Google Sheet without storing Google credentials. The Apps Script digest
is therefore the authoritative check for missed lead-delivery records.
