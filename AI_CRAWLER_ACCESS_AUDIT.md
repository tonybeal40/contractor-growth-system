# All-Pro AI Crawler Access Audit

Last verified: July 15, 2026

## Cloudflare Policy

- The legacy account-wide `Block AI bots` rule is off because it was returning
  HTTP 403 to search-focused crawlers as well as training crawlers.
- Search and user-requested assistant crawlers are allowed.
- Training-only `GPTBot` and `ClaudeBot` are individually blocked in AI Crawl
  Control.
- The September 15 mixed-purpose preference remains set to allow search access.

The following Cloudflare AI Crawl Control rows had `Block Crawler` switched off:

- Claude-SearchBot
- OAI-SearchBot
- PerplexityBot
- ChatGPT-User
- Applebot
- Perplexity-User
- DuckAssistBot

The `GPTBot` and `ClaudeBot` rows have `Block Crawler` switched on. This keeps
OpenAI and Anthropic search/user retrieval available without opening the site to
their training-only crawlers.

## Cloudflare Activity Check

The last-24-hours table showed successful access for Claude-SearchBot,
OAI-SearchBot, ChatGPT-User, Googlebot, and BingBot.

Live HTTP checks on July 15, 2026 returned `200` for OAI-SearchBot,
ChatGPT-User, PerplexityBot, Perplexity-User, Claude-SearchBot, Claude-User,
Googlebot, bingbot, DuckAssistBot, and Applebot. The same priority remodel URL
returned `403` for GPTBot and ClaudeBot, matching the intended policy.

## Site Directives

`robots.txt` explicitly allows the search and assistant user agents above and
disallows GPTBot, ClaudeBot, and Google-Extended. `llms.txt` contains audited
business facts and links to the priority Belleville and O'Fallon kitchen and
bathroom pages.

## Recheck Procedure

1. Open Cloudflare > AI Crawl Control > Security.
2. Confirm the search and assistant rows remain switched off under `Block Crawler`.
3. Confirm GPTBot and ClaudeBot remain switched on under `Block Crawler`.
4. Review 7-day allowed and unsuccessful request counts.
5. Test `robots.txt`, `llms.txt`, and the four priority remodel URLs with a normal browser request.
