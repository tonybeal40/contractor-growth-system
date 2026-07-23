# Contractor Growth Engine

This is the reusable, white-label product behind the All-Pro growth work. It builds a small contractor website from verified client facts without copying All-Pro customer data, reviews, photos, credentials, or internal lead records.

The legacy `demo-template/` remains for historical reference. Do not use it for new clients. It contains one-off assumptions and is not an idempotent build system.

## What It Builds

- conversion-focused homepage
- one useful page per configured service
- one genuinely local page per configured city
- estimate form with source tracking, honeypot, and consent fields
- privacy, terms, 404, `robots.txt`, `sitemap.xml`, and `llms.txt`
- LocalBusiness/Service/FAQ/Breadcrumb structured data from supplied facts
- shared responsive design system and lightweight JavaScript

The builder does not promise rankings, leads, revenue, ratings, licenses, or years in business. Optional trust claims appear only when the client supplies and approves them.

## Build A Client Site

1. Copy `config.example.json` outside this folder and replace every example value.
2. Replace every bundled demo photo. Use either a client-owned/licensed `https://` URL or a file placed directly in this package's `assets/` folder and referenced as `assets/filename.webp`.
3. Confirm the form endpoint and success URL with a real submission.
4. Run:

```powershell
python product/contractor-growth-engine/build.py path/to/client-config.json
```

The site is written to `product/contractor-growth-engine/dist/<client-slug>/`. Source files are never changed.

## Required Proof Before Launch

- written client approval for name, phone, email, service areas, services, and credentials
- ownership or license for every image
- a real form test received in the client's inbox/CRM
- working call links on a phone
- unique city notes based on actual service knowledge or completed work
- privacy/terms reviewed for the client's real data flow
- analytics and business-profile access granted through OAuth or manager invitations, never shared passwords

See `CLIENT_ONBOARDING.md` and `COMMERCIALIZATION.md` before selling or publishing a build.

## Tests

```powershell
python -m unittest discover product/contractor-growth-engine/tests -v
```
