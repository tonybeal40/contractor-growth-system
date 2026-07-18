import assert from "node:assert/strict";
import test from "node:test";

import worker, { classifyIntent, findMissingFields, normalizePayload, scoreLead } from "../src/index.js";

const origin = "https://allprometroeastconstruction.com";

function request(path, body, requestOrigin = origin) {
  return new Request("https://allprometroeastconstruction.com" + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": requestOrigin
    },
    body: JSON.stringify(body)
  });
}

function env(aiResponse, rateAllowed = true) {
  return {
    AI: {
      run: async () => ({ response: JSON.stringify(aiResponse) })
    },
    AI_RATE_LIMITER: {
      limit: async () => ({ success: rateAllowed })
    }
  };
}

const strongLead = {
  session_id: "lead-session-1",
  service: "Kitchen remodel",
  city: "Belleville",
  timeline: "As soon as possible",
  budget_range: "$25,000 or more",
  details: "We need a complete kitchen update with cabinets, counters, flooring, lighting, and a better working layout for our family."
};

test("normalizes and limits untrusted project fields", () => {
  const payload = normalizePayload({
    ...strongLead,
    details: "A\n\nproject\u0000with    spacing",
    extra: "ignored"
  });
  assert.equal(payload.details, "A project with spacing");
  assert.equal(Object.prototype.hasOwnProperty.call(payload, "extra"), false);
});

test("scores a near-term priority remodel as hot", () => {
  const result = scoreLead(normalizePayload(strongLead));
  assert.equal(result.priority, "Hot");
  assert.ok(result.score >= 80);
  assert.ok(result.reasons.includes("priority service city"));
});

test("classifies a homeowner project without treating it as spam", () => {
  const result = classifyIntent(normalizePayload(strongLead));
  assert.equal(result.lead_type, "homeowner_project");
  assert.equal(result.spam_risk, 0);
});

test("separates website sales pitches from homeowner leads", () => {
  const result = classifyIntent(normalizePayload({
    ...strongLead,
    details: "I noticed your website looks old and can redesign it to get you more leads."
  }));
  assert.equal(result.lead_type, "vendor_sales");
  assert.ok(result.spam_risk < 50);
});

test("reports missing intake fields", () => {
  assert.deepEqual(findMissingFields(normalizePayload({ service: "Kitchen remodel", city: "Belleville" })), [
    "timeline",
    "budget",
    "project details"
  ]);
});

test("returns a model-generated qualification with deterministic score", async () => {
  const response = await worker.fetch(
    request("/api/lead-concierge", strongLead),
    env({
      follow_up_question: "Will the new layout move plumbing or appliance locations?",
      summary: "Belleville homeowner planning a full kitchen remodel with layout and finish updates.",
      recommended_next_step: "Call to review scope and schedule an on-site estimate.",
      suggested_reply: "Thanks for reaching out about your Belleville kitchen. Please send photos and a good time to call."
    })
  );
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.ai, true);
  assert.equal(body.priority, "Hot");
  assert.match(body.follow_up_question, /plumbing/i);
  assert.match(body.suggested_reply, /Belleville kitchen/i);
  assert.equal(body.lead_type, "homeowner_project");
});

test("rejects cross-origin requests", async () => {
  const response = await worker.fetch(
    request("/api/lead-concierge", strongLead, "https://example.com"),
    env({})
  );
  assert.equal(response.status, 403);
});

test("accepts the www site origin and echoes it in CORS", async () => {
  const wwwOrigin = "https://www.allprometroeastconstruction.com";
  const response = await worker.fetch(
    request("/api/lead-concierge", strongLead, wwwOrigin),
    env({})
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), wwwOrigin);
});

test("returns a usable fallback if Workers AI is unavailable", async () => {
  const response = await worker.fetch(
    request("/api/lead-concierge", strongLead),
    { AI_RATE_LIMITER: { limit: async () => ({ success: true }) } }
  );
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.ai, false);
  assert.match(body.follow_up_question, /kitchen/i);
  assert.equal(body.priority, "Hot");
});

test("enforces the Worker rate limit", async () => {
  const response = await worker.fetch(
    request("/api/lead-concierge", strongLead),
    env({}, false)
  );
  assert.equal(response.status, 429);
});

test("rejects an oversized body even without a content-length header", async () => {
  const response = await worker.fetch(
    request("/api/lead-concierge", { ...strongLead, details: "x".repeat(13000) }),
    env({})
  );
  assert.equal(response.status, 413);
});
