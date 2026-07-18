# All-Pro Lead Concierge Worker

This Cloudflare Worker powers the homeowner project concierge on All-Pro's highest-intent pages.

It performs one narrow revenue task while returning a richer project brief:

1. receives structured project details from the browser;
2. asks Workers AI for one useful missing question and a callback summary;
3. applies deterministic lead scoring for service, city, timing, budget, and detail;
4. classifies homeowner, vendor-sales, contractor-partner, and spam intent;
5. returns urgency, missing fields, a short project brief, next step, and suggested reply;
6. lets the existing website form route deliver the completed lead to Apps Script, Google Sheets, email, and configured SMS.

The website has a guided fallback, so a Workers AI outage cannot prevent a homeowner from submitting a request.

## Commands

```powershell
npm test
npx wrangler login
npx wrangler deploy
```

On Windows, `deploy-cloudflare.cmd` runs the login and production deployment in one guided window.

Production endpoint:

```text
https://lead-api.allprometroeastconstruction.com
```

Health route:

```text
https://lead-api.allprometroeastconstruction.com/health
```

The dedicated Cloudflare Custom Domain keeps the API independent of the GitHub Pages origin and avoids route conflicts on the main hostname.

The Worker accepts browser POST requests only from the All-Pro production origins, caps request size, sanitizes project text, and rate-limits each visitor by Cloudflare IP with a session fallback. Contact fields are not sent to Workers AI.
