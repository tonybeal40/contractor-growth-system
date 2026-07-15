# All-Pro Lead Concierge Worker

This Cloudflare Worker powers the homeowner project concierge on All-Pro's highest-intent pages.

It performs one narrow revenue task:

1. receives structured project details from the browser;
2. asks Workers AI for one useful missing question and a callback summary;
3. applies deterministic lead scoring for service, city, timing, budget, and detail;
4. returns a short project brief to the browser;
5. lets the existing website form route deliver the completed lead to Google Sheets and email.

The website has a guided fallback, so a Workers AI outage cannot prevent a homeowner from submitting a request.

## Commands

```powershell
npm test
npx wrangler login
npx wrangler deploy
```

On Windows, `deploy-cloudflare.cmd` runs the login and production deployment in one guided window.

Production route:

```text
https://allprometroeastconstruction.com/api/lead-concierge
```

Health route:

```text
https://allprometroeastconstruction.com/api/lead-concierge/health
```

The Worker accepts browser POST requests only from `https://allprometroeastconstruction.com`, caps request size, sanitizes project text, and rate-limits each visitor by Cloudflare IP with a session fallback.
