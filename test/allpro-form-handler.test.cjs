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

test("preserves website review rating, authenticity, and publication consent", () => {
  const data = {
    full_name: "Taylor Customer",
    city: "Belleville",
    project_type: "Bathroom remodel",
    rating: "5",
    details: "The project communication and finished shower were excellent.",
    permission_to_share_on_site: "yes",
    genuine_customer_confirmation: "yes",
    review_status: "Pending approval",
    form_name: "Review Request Testimonial"
  };
  context.applyLeadIntelligence(data, true);
  const lead = context.normalizedLead(data);
  const html = context.buildLeadEmailHtml(data, true);
  assert.equal(lead.leadType, "review");
  assert.equal(lead.reviewRating, "5");
  assert.equal(lead.reviewPermission, "yes");
  assert.equal(lead.reviewAuthenticity, "yes");
  assert.match(html, /Review rating/);
  assert.match(html, /Permission to publish/);
  assert.match(html, /Pending approval/);
});
