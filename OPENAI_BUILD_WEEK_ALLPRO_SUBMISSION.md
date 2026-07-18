# OpenAI Build Week Draft: All-Pro Metro East Lead Concierge

## One-Line Pitch

An AI-assisted local-contractor lead system that turns incomplete website inquiries into organized, consent-aware project briefs without allowing AI failure to lose a lead.

## Problem

Small contractors often receive vague form emails while working in the field. Details are inconsistent, vendor solicitations look like customer leads, follow-up is delayed, and opportunities disappear across inboxes and spreadsheets.

## Product

The All-Pro Lead Concierge:

1. guides a homeowner through service, city, timeline, budget, scope, and contact details;
2. asks one useful project-specific follow-up question;
3. creates a short contractor callback brief;
4. scores urgency and fit using transparent deterministic rules;
5. separates homeowners, vendor pitches, and contractor-partner applications;
6. sends a formatted email, SMS alert, and customer confirmation;
7. writes the request into Google Sheets and a working follow-up board;
8. reminds the team when a lead remains untouched;
9. produces a weekly demand report.

## Architecture

```text
Static GitHub Pages website
  -> Cloudflare Worker + Workers AI
  -> Google Apps Script
     -> Gmail / MailApp
     -> Twilio
     -> Google Sheets CRM
  -> FormSubmit fallback
```

The current production qualification endpoint is:

```text
https://lead-api.allprometroeastconstruction.com
```

## Reliability And Safety

- The AI request contains project context, not contact fields.
- Deterministic scoring and reply generation remain available if AI fails.
- The browser falls back to the existing form path if Apps Script is unavailable.
- Apps Script email, SMS, Sheet logging, and board sync are isolated so one failed delivery does not stop the others.
- AI cannot quote prices, guarantee schedules, or make permit promises.
- Marketing consent is separate and optional.
- Review requests are manually armed and ask for an honest review.
- Vendor pitches do not alert Bill as homeowner jobs.

## Demo Flow

1. Open a Belleville kitchen-remodel page.
2. Select kitchen remodel, Belleville, near-term timing, and a working budget.
3. Enter a realistic project description.
4. Show the AI-generated missing question and project brief.
5. Submit a controlled test.
6. Show the formatted Bill/Tony email, customer confirmation, `Leads` audit row, and `Follow Up Board` row.
7. Show a vendor-sales submission routing to Tony only.
8. Show an untouched lead appearing in the reminder digest.

## Honest Impact Metrics To Capture

- Completed estimate requests
- Percentage with usable phone, city, service, and scope
- Median time from submission to first contact
- Leads still `New` after 30 minutes
- Estimates set and jobs won
- Vendor solicitations separated from customer jobs

Do not submit invented conversion or revenue figures. Use only verified test evidence and real operational counts.

## Submission Checklist

- Record a short end-to-end demo.
- Include the public website and Worker health URL.
- Redact customer contact information and all credentials.
- Explain the non-AI fallback.
- Explain consent, review-request, and vendor-routing safeguards.
- Include the architecture and repository link.

