const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "allpro-form-handler.gs"), "utf8");
const context = {
  Boolean,
  Date,
  JSON,
  Math,
  Number,
  Object,
  RegExp,
  String,
  console,
  Utilities: {
    Charset: { UTF_8: "utf8" },
    DigestAlgorithm: { SHA_256: "sha256" },
    computeDigest(_algorithm, value) {
      return Array.from(crypto.createHash("sha256").update(String(value), "utf8").digest())
        .map((byte) => (byte > 127 ? byte - 256 : byte));
    }
  }
};
vm.createContext(context);
vm.runInContext(source, context, { filename: "allpro-form-handler.gs" });

function kitchenLead() {
  return {
    full_name: "Jamie Homeowner",
    phone: "618-555-0147",
    email: "jamie@example.com",
    service: "Kitchen remodel",
    city: "Belleville",
    timeline: "As soon as possible",
    budget_range: "$25,000 or more",
    details: "Complete kitchen update with cabinets, counters, flooring, lighting, and a more useful family layout.",
    estimate_contact_consent: "yes",
    lead_session_id: "test-kitchen-1"
  };
}

test("qualifies a priority kitchen request as a hot homeowner lead", () => {
  const data = kitchenLead();
  context.applyLeadIntelligence(data, false);
  assert.equal(data.lead_type, "homeowner_project");
  assert.equal(data.ai_priority, "Hot");
  assert.ok(Number(data.ai_lead_score) >= 80);
  assert.match(data.suggested_reply, /Bill with All-Pro/);
  assert.equal(data.lead_id, "web:test-kitchen-1");
});

test("routes a website sales pitch away from Bill", () => {
  const data = {
    full_name: "Sales Vendor",
    email: "sales@example.com",
    service: "Other",
    city: "Miami",
    details: "I noticed your website looks old and can redesign it to get you more leads.",
    lead_session_id: "test-vendor-1"
  };
  context.applyLeadIntelligence(data, false);
  assert.equal(data.lead_type, "vendor_sales");
  assert.equal(data.routing_lane, "Owner Review");
  assert.ok(Number(data.ai_lead_score) <= 10);
  assert.match(data.recommended_next_step, /Do not send to Bill/i);
});

test("keeps contractor listing requests in the partner lane", () => {
  const data = {
    business_name: "Example Electric",
    email: "owner@example-electric.com",
    listing_interest: "Free listing",
    details: "Interested in joining the Metro East pro network.",
    lead_session_id: "test-partner-1"
  };
  context.applyLeadIntelligence(data, false);
  assert.equal(data.lead_type, "contractor_partner");
  assert.equal(data.routing_lane, "Partner Review");
});

test("builds a noticeable email with qualification and reply sections", () => {
  const data = kitchenLead();
  context.applyLeadIntelligence(data, false);
  const subject = context.buildSubject(data, false);
  const html = context.buildLeadEmailHtml(data, false);
  assert.match(subject, /HOT ALL-PRO LEAD/);
  assert.match(html, /Lead qualification/);
  assert.match(html, /Ready-to-send customer reply/);
  assert.match(html, /Jamie Homeowner/);
});

test("requires a valid non-internal email and recorded consent for confirmations", () => {
  assert.equal(context.isValidLeadEmail("customer@example.com"), true);
  assert.equal(context.isValidLeadEmail("tonybeal40@gmail.com"), false);
  assert.equal(context.hasRecordedConsent("yes"), true);
  assert.equal(context.hasRecordedConsent(""), false);
});

test("sets a clear customer response window", () => {
  assert.equal(
    context.customerResponseWindowText(),
    "We will be in touch within 24 hours. Requests received on weekends or holidays may be answered on the next business day."
  );
});

test("expands the lead sheet before writing upgraded columns", () => {
  const insertions = [];
  const sheet = {
    getMaxColumns() { return 31; },
    insertColumnsAfter(column, count) { insertions.push([column, count]); }
  };
  context.ensureSheetColumnCapacity(sheet, 48);
  assert.deepEqual(insertions, [[31, 17]]);
});

test("prepares website reviews for project-match verification", () => {
  const data = {
    full_name: "Taylor Customer",
    email: "taylor@example.com",
    city: "Belleville",
    project_type: "Bathroom remodel",
    project_address: "123 Example Street",
    project_completion_month: "2026-06",
    project_reference: "INV-1042",
    rating: "5",
    details: "The project communication and finished shower were excellent.",
    permission_to_share_on_site: "yes",
    genuine_customer_confirmation: "yes",
    verification_process_acknowledgment: "yes",
    review_id: "review-forged-browser-value",
    lead_session_id: "review-test-1",
    form_name: "Review Request Testimonial"
  };
  context.prepareReviewSubmission(data);
  context.applyLeadIntelligence(data, true);
  const lead = context.normalizedLead(data);
  const html = context.buildLeadEmailHtml(data, true);
  assert.equal(lead.leadType, "review");
  assert.equal(lead.reviewRating, "5");
  assert.equal(lead.reviewPermission, "yes");
  assert.equal(lead.reviewAuthenticity, "yes");
  assert.equal(lead.reviewAcknowledgment, "yes");
  assert.equal(lead.reviewStatus, "Pending verification");
  assert.equal(lead.reviewVerificationStatus, "Pending project match");
  assert.equal(lead.reviewId, "review-test-1");
  assert.equal(lead.reviewProjectDate, "2026-06");
  assert.equal(lead.reviewProjectReference, "INV-1042");
  assert.match(html, /Review rating/);
  assert.match(html, /Permission to publish/);
  assert.match(html, /Pending verification/);
  assert.match(html, /Pending project match/);
  assert.match(html, /Private project address/);
});

test("logs website reviews to the dedicated pending verification queue", () => {
  const data = {
    full_name: "Morgan Homeowner",
    email: "morgan@example.com",
    phone: "618-555-0198",
    city: "O'Fallon",
    project_type: "Kitchen remodel",
    project_address: "456 Sample Avenue",
    project_completion_month: "2026-05",
    rating: "4",
    details: "The kitchen project was completed and the communication was clear.",
    permission_to_share_on_site: "yes",
    genuine_customer_confirmation: "yes",
    verification_process_acknowledgment: "yes",
    lead_session_id: "review-queue-test",
    form_name: "Review Request Testimonial",
    page_url: "https://allprometroeastconstruction.com/review-request.html"
  };
  context.prepareReviewSubmission(data);
  context.applyLeadIntelligence(data, true);

  let appended = null;
  context.ensureReviewQueue = () => ({
    getLastRow() { return appended ? 2 : 1; },
    appendRow(values) { appended = values; }
  });

  const result = context.syncReviewQueue(data);
  assert.equal(result.logged, true);
  assert.equal(result.reviewId, "review-queue-test");
  assert.equal(appended[1], "review-queue-test");
  assert.equal(appended[2], "Pending verification");
  assert.equal(appended[3], "Pending project match");
  assert.equal(appended[9], "456 Sample Avenue");
  assert.equal(appended[14], "4");
  assert.equal(appended[16], "yes");
});

test("neutralizes spreadsheet formulas in private review fields", () => {
  assert.equal(context.safeReviewSheetText("=IMPORTXML(\"https://example.com\")", 500), "'=IMPORTXML(\"https://example.com\")");
  assert.equal(context.safeReviewSheetText("  +1-618-555-0100", 500), "'  +1-618-555-0100");
  assert.equal(context.safeReviewSheetText("Normal review text", 500), "Normal review text");
});

test("publishes only approved verified reviews without private matching fields", () => {
  const row = [
    new Date("2026-07-22T12:00:00Z"), "review-public-1", "Approved for publication",
    "Verified All-Pro Project", "Invoice / work order", new Date("2026-07-22T13:00:00Z"),
    "Morgan Homeowner", "private@example.com", "618-555-0198", "456 Sample Avenue",
    "O'Fallon", "Kitchen remodel", "2026-05", "INV-PRIVATE", "5",
    "All-Pro communicated clearly and completed our kitchen project with care.",
    "yes", "yes", "yes", "Review Request Page", "https://example.com", "Private note", ""
  ];
  const review = context.toPublicWebsiteReview(row);
  assert.equal(review.reviewer, "Morgan H.");
  assert.equal(review.rating, 5);
  assert.equal(review.badge, "Verified All-Pro Project");
  assert.equal(review.city, "O'Fallon");
  assert.equal(JSON.stringify(review).includes("private@example.com"), false);
  assert.equal(JSON.stringify(review).includes("456 Sample Avenue"), false);
  assert.equal(JSON.stringify(review).includes("INV-PRIVATE"), false);
  row[2] = "Pending verification";
  assert.equal(context.toPublicWebsiteReview(row), null);
});

test("requires explicit marketing consent and an active subscriber", () => {
  const eligible = {
    email: "customer@example.com",
    consentValue: "yes",
    status: "Active",
    token: "a".repeat(64),
    lastCampaignId: "",
    lastSentAt: ""
  };
  assert.equal(context.isMarketingSubscriberEligible(eligible, "campaign-1"), true);
  assert.equal(context.isMarketingSubscriberEligible({ ...eligible, consentValue: "No" }, "campaign-1"), false);
  assert.equal(context.isMarketingSubscriberEligible({ ...eligible, status: "Unsubscribed" }, "campaign-1"), false);
  assert.equal(context.isMarketingSubscriberEligible({ ...eligible, lastCampaignId: "campaign-1" }, "campaign-1"), false);
  assert.equal(context.isMarketingSubscriberEligible({
    ...eligible,
    lastSentAt: new Date("2026-07-01T12:00:00Z")
  }, "campaign-2", 28, new Date("2026-07-23T12:00:00Z")), false);
  assert.equal(context.isMarketingSubscriberEligible({
    ...eligible,
    lastSentAt: new Date("2026-06-01T12:00:00Z")
  }, "campaign-2", 28, new Date("2026-07-23T12:00:00Z")), true);
});

test("builds seasonal campaign with consultation links and unsubscribe", () => {
  const settings = {
    estimateUrl: "https://allprometroeastconstruction.com/get-quote.html",
    guideUrl: "https://allprometroeastconstruction.com/metro-east-home-service-guide.html",
    reviewUrl: "https://allprometroeastconstruction.com/review",
    phone: "618-581-0676",
    postalAddress: "123 Business Street, Exampleville, IL 60000"
  };
  const content = context.buildSeasonalMarketingEmail(
    { firstName: "Jamie", service: "Kitchen remodeling", city: "Belleville" },
    settings,
    "https://script.google.com/example?unsubscribe=1"
  );
  assert.match(content.subject, /Jamie, a quick check-in from Bill/i);
  assert.match(content.plain, /Kitchen remodeling in Belleville/);
  assert.match(content.plain, /honest review/);
  assert.match(content.plain, /Unsubscribe:/);
  assert.match(content.html, /Request a free estimate/);
  assert.match(content.html, /Bill here with All-Pro/);
});

test("only treats clear standalone replies as automatic opt-outs", () => {
  assert.equal(context.isExplicitOptOutReply("REMOVE ME"), true);
  assert.equal(context.isExplicitOptOutReply("Please unsubscribe."), true);
  assert.equal(context.isExplicitOptOutReply("I like the estimate, but please stop by Friday."), false);
});

test("daily lead monitor identifies only actionable delivery failures", () => {
  const healthy = context.leadDeliveryIssueLabels({
    email: "customer@example.com",
    emailStatus: "sent",
    smsStatus: "not configured",
    confirmationStatus: "sent",
    boardStatus: "logged",
    deliveryNotes: ""
  });
  assert.deepEqual(Array.from(healthy), []);

  const failed = context.leadDeliveryIssueLabels({
    email: "customer@example.com",
    emailStatus: "failed",
    smsStatus: "failed",
    confirmationStatus: "not sent",
    boardStatus: "not logged",
    deliveryNotes: "sheet timeout"
  });
  assert.equal(failed.length, 5);
  assert.match(failed.join(" | "), /owner email: failed/);
  assert.match(failed.join(" | "), /SMS: failed/);
  assert.match(failed.join(" | "), /customer confirmation: not sent/);
  assert.match(failed.join(" | "), /follow-up board: not logged/);
});
