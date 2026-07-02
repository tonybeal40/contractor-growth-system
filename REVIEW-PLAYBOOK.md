## Review Request Playbook

### 1. Immediate Ask (Post-job)
- Text/email each homeowner on the final day with a short note: “Thanks for trusting All-Pro Construction. Could you share 2 minutes for a Google/Angi/HomeAdvisor review?”
- Include direct links:
  - Google: `https://search.google.com/local/writereview?placeid=ChIJKzqCfZ8idogRP03O0_iO2U8`
  - Angi: `https://www.angi.com/{your-profile}`
  - HomeAdvisor: `https://www.homeadvisor.com/rated/{your-profile}`
- Add QR code on invoices linking to `https://www.allprometroeastconstruction.com/review.html`.

### 2. Review Landing Page (`reviews.html`)
- Promote on homepage, service pages, directory pages, and email signatures.
- Highlight two reviews in the JSON-LD (currently set) and update annually with new quotes.
- Keep the private feedback form on `review-request.html`; it posts through FormSubmit and is tracked by the site form-tracking script.

### 3. Schema + Display
- Use the `review` schema block for each quote added to the homepage/services (copy and JSON-LD).
- Embed review badges on service pages (stars + snippet) referencing the same 4.7 aggregate rating.
- Add video testimonials when possible and include `Review` schema referencing `video`.

### 4. Weekly Activity
- Every Monday, review new reviews and publish a `reviews.html` update with the latest quotes.
- Post weekly updates with select review highlights on Google Business Profile (use `GBP-AND-ADS.md` schedule).
- Respond to all new reviews publicly (thank, address issues) to show responsiveness.

Need me to auto-generate a PDF/printable card for customers with these links?
