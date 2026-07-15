# All-Pro AI Crawler Access Audit

Last verified: July 15, 2026

## Cloudflare Policy

- AI training crawlers: blocked on all pages.
- Mixed-purpose crawlers after Cloudflare's September 15 policy change: continue to be allowed.
- AI search and user-requested assistant crawlers: not blocked.

The following Cloudflare AI Crawl Control rows had `Block Crawler` switched off:

- Claude-SearchBot
- OAI-SearchBot
- PerplexityBot
- ChatGPT-User
- Applebot
- Perplexity-User
- DuckAssistBot

Training-focused crawler rows such as GPTBot remain blocked by the account-wide training policy. This keeps search and user-requested retrieval available without opening the site to every training crawler.

## Cloudflare Activity Check

The last-24-hours table showed successful access for Claude-SearchBot, OAI-SearchBot, ChatGPT-User, Googlebot, and BingBot. PerplexityBot showed no successful requests in that window.

Command-line requests that merely copy a verified crawler's user agent can receive HTTP 403 because Cloudflare also checks whether the source is the crawler's verified network. Those spoofed tests do not prove that the real crawler is blocked. The authoritative checks are the individual Cloudflare block switches and Cloudflare's allowed-request counts.

## Site Directives

`robots.txt` explicitly allows the search and assistant user agents above. `llms.txt` contains only audited business facts and links to the priority Belleville and O'Fallon kitchen and bathroom pages.

## Recheck Procedure

1. Open Cloudflare > AI Crawl Control > Security.
2. Confirm the search and assistant rows remain switched off under `Block Crawler`.
3. Confirm training crawlers remain blocked.
4. Review 7-day allowed and unsuccessful request counts.
5. Test `robots.txt`, `llms.txt`, and the four priority remodel URLs with a normal browser request.
