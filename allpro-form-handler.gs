/**
 * All-Pro Metro East Construction — Custom Form Handler
 * Google Apps Script Web App
 *
 * Receives POST from the website, sends lead email, logs every lead to a
 * Google Sheet, and optionally sends a Twilio SMS alert.
 *
 * DEPLOY STEPS (do this once):
 *  1. Go to https://script.google.com → New Project → paste this file
 *  2. Run → doPost (once, to authorize Gmail + Sheets)
 *  3. Deploy → New Deployment → Web App
 *     - Execute as: Me (your Google account)
 *     - Who has access: Anyone
 *  4. Copy the Web App URL (looks like https://script.google.com/macros/s/XXXX/exec)
 *  5. Open formsubmit-lead-tracking.js and paste the URL into CUSTOM_ENDPOINT
 *  6. Push to GitHub — done.
 *
 * PHASE 2 DEPLOY:
 *  1. Paste this full file into the existing All-Pro Apps Script project.
 *  2. Run phase2SelfTest once and approve permissions.
 *  3. Deploy → Manage deployments → Edit existing web app → New version.
 *  4. Keep the same Web App URL.
 *  5. Add Twilio credentials in Project Settings > Script Properties if SMS
 *     alerts are wanted. See smsSetupStatus() below.
 *  6. Test a live form and confirm Sheet + email + configured SMS delivery.
 */

// ── Internal / test emails — never log these ─────────────────────────────────
var INTERNAL_EMAILS = [
  "tonybeal40@gmail.com",
  "williamosessionallpro@gmail.com",
  "allprometroeast@gmail.com",
  "joshbarber23@yahoo.com"
];

function isInternalOrTest(data) {
  if (!data) return true; // null data — skip
  // Block internal email addresses
  var email = String(data["email"] || data.email || "").trim().toLowerCase();
  for (var i = 0; i < INTERNAL_EMAILS.length; i++) {
    if (email === INTERNAL_EMAILS[i]) return true;
  }
  // Block test/dummy submissions
  var name = String(data["name"] || data.name || "").trim().toLowerCase();
  var formName = String(data["form_name"] || data.form_name || "").trim().toLowerCase();
  if (/^test/.test(name) || /^test/.test(formName)) return true;
  if (name === "seo health check" || formName === "seo health check") return true;
  // Block rows with no real contact info at all
  var phone = String(data["phone"] || data.phone || "").replace(/\D/g, "");
  var hasContact = (email && email.indexOf("@") > -1 && INTERNAL_EMAILS.indexOf(email) === -1)
                || (phone.length >= 10)
                || (name.length > 1);
  return !hasContact;
}
var CONFIG = {
  leadEmail:   "williamosessionallpro@gmail.com",  // Bill receives the primary lead email
  ownerEmail:  "tonybeal40@gmail.com",             // Tony receives the operations copy
  smsAlertTo:  "+16182925320",                    // Private lead alerts only
  sheetName:   "All-Pro Leads",                    // Google Sheet tab name
  reviewEmail: "tonybeal40@gmail.com",             // Reviews go to Tony only
  siteOrigin:  "https://allprometroeastconstruction.com",
  thankYouUrl: "https://allprometroeastconstruction.com/thank-you.html?src=form",
  reviewUrl:   "https://allprometroeastconstruction.com/review",
  sendCustomerConfirmation: true,
  followUpReminderMinutes: 30
};

// Affiliate destinations are allowlisted here. Never trust an email address
// supplied by a browser form as a delivery destination.
var AFFILIATE_ROUTES = {
  "josh-barber": {
    id: "josh-barber",
    name: "Josh Barber",
    email: "JoshBarber23@yahoo.com",
    phone: "618-402-8775",
    lane: "Highland Area"
  }
};

function resolveAffiliateRoute(data) {
  var id = pickLeadValue(data || {}, ["affiliate_id"], "").toLowerCase();
  return id && AFFILIATE_ROUTES[id] ? AFFILIATE_ROUTES[id] : null;
}

// ── CORS pre-flight ───────────────────────────────────────────────────────────
function doGet(e) {
  var params = e && e.parameter ? e.parameter : {};
  if (params.action === "unsubscribe") {
    return handleMarketingUnsubscribe(params);
  }
  if (params.action === "verified-reviews") {
    return ContentService
      .createTextOutput(JSON.stringify(buildPublishedReviewFeed()))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: "All-Pro Form Handler" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function phase2SelfTest() {
  var data = {
    name: "Phase 2 Apps Script Self Test",
    phone: "618-292-5320",
    email: "tonybeal40+phase2selftest@gmail.com",
    city: "Belleville",
    service: "Phase 2 Lead Engine Verification",
    message: "PHASE 2 APPS SCRIPT SELF TEST SAFE TO DELETE - verifies Apps Script email, Sheet logging, and configured Twilio SMS.",
    form_name: "Phase 2 Apps Script Self Test",
    form_slug: "phase-2-apps-script-self-test",
    page_url: "https://allprometroeastconstruction.com/phase-2-apps-script-self-test",
    page_path: "/phase-2-apps-script-self-test",
    lead_source: "apps-script-self-test",
    first_touch_source: "apps-script-self-test",
    lead_session_id: "lead-phase2-self-test-" + new Date().getTime(),
    submission_time_local: new Date().toLocaleString(),
    estimate_contact_consent: "yes",
    email_marketing_opt_in: "no"
  };
  applyLeadIntelligence(data, false);
  var subject = buildSubject(data, false);
  sendLeadNotification(data, subject, false);
  var sms = sendSmsAlert(data);
  var delivery = {
    email: { sent: true },
    sms: sms,
    confirmation: sendCustomerConfirmation(data),
    followUpBoard: { logged: false },
    errors: []
  };
  delivery.followUpBoard = syncFollowUpBoard(data, delivery);
  logToSheet(data, subject, delivery);
  return { ok: true, subject: subject, sms: sms, confirmation: delivery.confirmation, followUpBoard: delivery.followUpBoard };
}

function deliveryDiagnostics() {
  return {
    ok: true,
    mailQuotaRemaining: MailApp.getRemainingDailyQuota(),
    sms: smsSetupStatus(),
    spreadsheetId: "1xcc0xo4UeN3EaZUMNn_qFJ-xgX6ZPg7l7sTMSLsT6GE",
    leadEmail: CONFIG.leadEmail,
    copyEmail: CONFIG.ownerEmail,
    affiliateRoutes: Object.keys(AFFILIATE_ROUTES),
    searchConsole: searchConsoleSetupStatus(),
    automationTriggers: ScriptApp.getProjectTriggers().map(function(trigger) { return trigger.getHandlerFunction(); })
  };
}

// ── Main handler ──────────────────────────────────────────────────────────────
function doPost(e) {
  var headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  try {
    var data = parsePayload(e);
    var projectPhoto = extractProjectPhoto(data);

    // Honeypot — discard spam
    if (data["_honey"] && data["_honey"].trim() !== "") {
      return jsonResponse({ ok: true, note: "honeypot" }, headers);
    }

    // Blacklist check
    var combined = Object.values(data).join(" ").toLowerCase();
    var blacklist = ["viagra", "casino", "payday loan", "crypto investment", "seo service"];
    for (var i = 0; i < blacklist.length; i++) {
      if (combined.indexOf(blacklist[i]) > -1) {
        return jsonResponse({ ok: true, note: "blacklisted" }, headers);
      }
    }

    // Skip internal emails and test submissions
    if (isInternalOrTest(data)) {
      Logger.log("Skipping internal/test submission: " + JSON.stringify(data).substring(0, 200));
      return jsonResponse({ ok: true, note: "internal" }, headers);
    }

    var isReview = isReviewSubmission(data);
    if (isReview) prepareReviewSubmission(data);
    applyLeadIntelligence(data, isReview);
    var subject  = buildSubject(data, isReview);

    var delivery = {
      email: { sent: false },
      sms: { sent: false, configured: false },
      confirmation: { sent: false, eligible: false },
      sheet: { logged: false },
      followUpBoard: { logged: false },
      reviewQueue: { logged: false },
      errors: []
    };

    // Email, SMS, and Sheet logging are independent so one outage cannot
    // prevent the other delivery paths from running.
    try { sendLeadNotification(data, subject, isReview, projectPhoto.blob); } catch(mailErr) {
      console.warn("Lead email failed (non-fatal):", mailErr);
      delivery.errors.push("email: " + safeError(mailErr));
    }
    if (delivery.errors.length === 0) {
      delivery.email.sent = true;
    }

    if (!isReview && data["lead_type"] === "homeowner_project") {
      try { delivery.sms = sendSmsAlert(data); } catch(smsErr) {
        console.warn("Lead SMS failed (non-fatal):", smsErr);
        delivery.errors.push("sms: " + safeError(smsErr));
      }
    }

    if (!isReview) {
      try { delivery.confirmation = sendCustomerConfirmation(data); } catch(confirmErr) {
        console.warn("Customer confirmation failed (non-fatal):", confirmErr);
        delivery.errors.push("confirmation: " + safeError(confirmErr));
      }
    }

    try {
      delivery.followUpBoard = syncFollowUpBoard(data, delivery);
    } catch(boardErr) {
      console.warn("Follow Up Board sync failed (non-fatal):", boardErr);
      delivery.errors.push("follow-up-board: " + safeError(boardErr));
    }

    if (isReview) {
      try {
        delivery.reviewQueue = syncReviewQueue(data);
      } catch(reviewQueueErr) {
        console.warn("Website Reviews queue sync failed (non-fatal):", reviewQueueErr);
        delivery.errors.push("review-queue: " + safeError(reviewQueueErr));
      }
    }

    // Log to the durable intake tab after board sync so every delivery status
    // is captured in the same row.
    try {
      logToSheet(data, subject, delivery);
      delivery.sheet.logged = true;
    } catch(sheetErr) {
      console.warn("Sheet log failed (non-fatal):", sheetErr);
      delivery.errors.push("sheet: " + safeError(sheetErr));
    }

    return jsonResponse({
      ok: delivery.email.sent || delivery.sheet.logged,
      redirect: buildThankYouUrl(data),
      delivery: delivery,
      lead_id: data["lead_id"] || ""
    }, headers);

  } catch (err) {
    console.error("doPost error:", err);
    return jsonResponse({ ok: false, error: err.toString() }, headers, 500);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parsePayload(e) {
  if (!e) return {};
  // Try JSON body first, then regular form-encoded POST fields.
  if (e.postData && e.postData.contents) {
    var raw = String(e.postData.contents || "");
    var type = String(e.postData.type || "").toLowerCase();
    if (type.indexOf("application/json") > -1 || raw.trim().charAt(0) === "{") {
      try { return JSON.parse(raw); } catch(_) {}
    }
  }
  var params = e.parameter || {};
  return params;
}

function extractProjectPhoto(data) {
  var encoded = String(data["project_photo_base64"] || "").trim();
  delete data["project_photo_base64"];
  if (!encoded) return { blob: null };

  var maxBytes = 5 * 1024 * 1024;
  var mimeType = String(data["project_photo_type"] || "").trim().toLowerCase();
  var originalName = String(data["project_photo_name"] || data["project_photo"] || "project-photo").trim();
  var safeName = originalName.replace(/[^a-zA-Z0-9._ -]/g, "_").substring(0, 100) || "project-photo";

  if (mimeType.indexOf("image/") !== 0) {
    data["project_photo_status"] = "Upload rejected: unsupported image type";
    return { blob: null };
  }

  // Base64 is about one-third larger than its decoded file. Reject oversized
  // payloads before decoding so a bad request cannot consume excess memory.
  if (encoded.length > Math.ceil(maxBytes * 4 / 3) + 8) {
    data["project_photo_status"] = "Upload rejected: photo exceeds 5 MB";
    return { blob: null };
  }

  try {
    var bytes = Utilities.base64Decode(encoded);
    if (bytes.length > maxBytes) {
      data["project_photo_status"] = "Upload rejected: photo exceeds 5 MB";
      return { blob: null };
    }
    data["project_photo_status"] = "Attached to lead email: " + safeName;
    return { blob: Utilities.newBlob(bytes, mimeType, safeName) };
  } catch (photoErr) {
    data["project_photo_status"] = "Upload could not be decoded";
    console.warn("Project photo decode failed (non-fatal):", photoErr);
    return { blob: null };
  }
}

function isReviewSubmission(data) {
  var formName = (data["form_name"] || data["_subject"] || "").toLowerCase();
  var pagePath = (data["page_path"] || "").toLowerCase();
  return formName.indexOf("review") > -1 || pagePath.indexOf("reviews") > -1;
}

function pickLeadValue(data, keys, fallback) {
  for (var i = 0; i < keys.length; i++) {
    var value = data[keys[i]];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return fallback || "";
}

function buildReviewId(data) {
  var sessionId = pickLeadValue(data || {}, ["lead_session_id", "concierge_session_id"], "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .substring(0, 72);
  if (sessionId) return sessionId.indexOf("review-") === 0 ? sessionId : "review-" + sessionId;
  return "review-" + new Date().getTime() + "-" + Math.floor(Math.random() * 1000000);
}

function prepareReviewSubmission(data) {
  data["review_id"] = buildReviewId(data);
  data["review_status"] = "Pending verification";
  data["verification_status"] = "Pending project match";
  data["verification_method"] = "";
  return data;
}

function isValidLeadEmail(value) {
  var email = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && INTERNAL_EMAILS.indexOf(email) === -1;
}

function hasRecordedConsent(value) {
  return /^(?:yes|true|checked|agree|agreed|on|1)$/i.test(String(value || "").trim());
}

function classifyLeadSubmission(data, isReview) {
  if (isReview) return { type: "review", spamRisk: 0, reasons: [] };
  var text = Object.keys(data || {}).map(function(key) {
    return key === "project_photo_base64" ? "" : String(data[key] || "");
  }).join(" ").toLowerCase();
  var spam = /viagra|casino|payday\s+loan|crypto\s+investment|guest\s+post|backlinks?\s+for\s+sale/i;
  var vendor = /website\s*(design|redesign|development)|seo\s*(service|agency|audit)|digital\s+marketing|lead\s+generation\s+(service|agency)|social\s+media\s+marketing|noticed\s+your\s+(site|website)|built\s+(you|a)\s+(new\s+)?(site|website)|get\s+you\s+(more\s+)?leads/i;
  var partner = /free\s+listing|contractor\s+partner|business\s+listing|listing\s+interest|pro\s+network|join\s+(bill|our)/i;
  if (spam.test(text)) return { type: "spam", spamRisk: 95, reasons: ["high-confidence spam phrase"] };
  if (vendor.test(text)) return { type: "vendor_sales", spamRisk: 15, reasons: ["vendor sales language"] };
  if (partner.test(text) || pickLeadValue(data, ["listing_interest", "company_fit_notes", "license_insurance_notes"], "")) {
    return { type: "contractor_partner", spamRisk: 5, reasons: [] };
  }
  return { type: "homeowner_project", spamRisk: 0, reasons: [] };
}

function inferLeadUrgency(data) {
  var text = [
    pickLeadValue(data, ["timeline", "preferred_timing"], ""),
    pickLeadValue(data, ["details", "message", "description", "project_details", "notes"], "")
  ].join(" ").toLowerCase();
  if (/emergency|urgent|asap|right away|as soon|water damage|unsafe|active leak/.test(text)) return "urgent";
  if (/this month|0-30|within 30|1-3 month|this season/.test(text)) return "active";
  return text.trim() ? "planning" : "unknown";
}

function missingLeadFields(data) {
  var missing = [];
  if (!pickLeadValue(data, ["phone", "phone_number", "mobile", "contact_phone"], "")) missing.push("phone");
  if (!pickLeadValue(data, ["email", "email_address", "replyto", "_replyto", "contact_email"], "")) missing.push("email");
  if (!pickLeadValue(data, ["city", "location", "service_area"], "")) missing.push("city");
  if (!pickLeadValue(data, ["service", "service_needed", "project", "project_type", "job_type"], "")) missing.push("service");
  if (!pickLeadValue(data, ["details", "message", "description", "project_details", "notes"], "")) missing.push("project details");
  return missing;
}

function deterministicLeadScore(data, classification, urgency) {
  var service = pickLeadValue(data, ["service", "service_needed", "project", "project_type", "job_type"], "").toLowerCase();
  var city = pickLeadValue(data, ["city", "location", "service_area"], "").toLowerCase();
  var budget = pickLeadValue(data, ["budget_range", "budget", "estimated_range"], "").toLowerCase();
  var details = pickLeadValue(data, ["details", "message", "description", "project_details", "notes"], "");
  var score = 5;
  var reasons = [];
  if (/kitchen|bathroom|shower/.test(service)) {
    score += 30;
    reasons.push("priority remodel service");
  } else if (/deck|outdoor|concrete|patio|fence|landscap/.test(service)) {
    score += 22;
    reasons.push("strong project service");
  } else if (service) {
    score += 12;
    reasons.push("service selected");
  }
  if (/belleville|o['’]?fallon|ofallon/.test(city)) {
    score += 25;
    reasons.push("priority service city");
  } else if (city) {
    score += 14;
    reasons.push("location provided");
  }
  if (urgency === "urgent") {
    score += 20;
    reasons.push("near-term need");
  } else if (urgency === "active") {
    score += 12;
    reasons.push("active planning timeline");
  }
  if (/25,?000|\$25k|over 25|40,?000|50,?000/.test(budget)) {
    score += 15;
    reasons.push("larger stated budget");
  } else if (/10,?000|15,?000|10k|15k/.test(budget)) {
    score += 10;
    reasons.push("project budget provided");
  } else if (budget) {
    score += 4;
  }
  if (details.length >= 80) {
    score += 5;
    reasons.push("useful project detail");
  }
  if (classification.type !== "homeowner_project") {
    score = Math.min(score, classification.type === "contractor_partner" ? 35 : 10);
  }
  return { score: Math.min(100, score), reasons: reasons };
}

function deterministicLeadSummary(data) {
  var service = pickLeadValue(data, ["service", "service_needed", "project", "project_type", "job_type"], "Home project");
  var city = pickLeadValue(data, ["city", "location", "service_area"], "Metro East");
  var details = pickLeadValue(data, ["details", "message", "description", "project_details", "notes"], "");
  var timeline = pickLeadValue(data, ["timeline", "preferred_timing"], "");
  var summary = service + " in " + city;
  if (timeline) summary += "; timing: " + timeline;
  if (details) summary += ". " + details;
  return summary.replace(/\s+/g, " ").trim().substring(0, 600);
}

function deterministicNextStep(data, classification, missing, urgency) {
  if (classification.type === "vendor_sales") return "Owner review only. Do not send to Bill as a homeowner job lead.";
  if (classification.type === "contractor_partner") return "Tony reviews the business details and decides whether to invite this company into Bill's List.";
  if (classification.type === "spam") return "Suppress outreach and retain only the intake audit record.";
  var prefix = urgency === "urgent" ? "Call promptly. " : "Call or text the homeowner. ";
  if (missing.length) return prefix + "Confirm " + missing.slice(0, 3).join(", ") + " and schedule a written estimate when the scope fits.";
  return prefix + "Review photos and scope, then schedule a written estimate when the project fits.";
}

function deterministicSuggestedReply(data, classification) {
  if (classification.type !== "homeowner_project") return "";
  var route = resolveAffiliateRoute(data);
  var representative = route ? route.name : "Bill";
  var name = pickLeadValue(data, ["name", "full_name", "customer_name", "contact_name"], "");
  var firstName = name ? name.split(/\s+/)[0] : "there";
  var service = pickLeadValue(data, ["service", "service_needed", "project", "project_type", "job_type"], "home project");
  var city = pickLeadValue(data, ["city", "location", "service_area"], "");
  return (
    "Hi " + firstName + ", this is " + representative + " with All-Pro. Thanks for reaching out about your " +
    service.toLowerCase() + (city ? " project in " + city : " project") +
    ". Please send any helpful photos and the best time to call so we can review the scope and next steps."
  ).substring(0, 480);
}

function applyLeadIntelligence(data, isReview) {
  var classification = classifyLeadSubmission(data, isReview);
  var urgency = inferLeadUrgency(data);
  var missing = missingLeadFields(data);
  var deterministic = deterministicLeadScore(data, classification, urgency);
  var suppliedScore = parseInt(pickLeadValue(data, ["ai_lead_score"], ""), 10);
  var score = isNaN(suppliedScore) ? deterministic.score : Math.max(0, Math.min(100, suppliedScore));
  if (classification.type !== "homeowner_project") score = Math.min(score, classification.type === "contractor_partner" ? 35 : 10);
  var priority = score >= 80 ? "Hot" : (score >= 55 ? "Warm" : "Standard");

  data["lead_type"] = classification.type;
  data["spam_risk"] = String(classification.spamRisk);
  data["spam_reasons"] = classification.reasons.join(", ");
  data["lead_urgency"] = urgency;
  data["missing_fields"] = missing.join(", ");
  data["ai_lead_score"] = String(score);
  data["ai_priority"] = priority;
  data["qualification_reasons"] = pickLeadValue(data, ["qualification_reasons"], deterministic.reasons.join(", "));
  data["ai_summary"] = pickLeadValue(data, ["ai_summary", "project_summary"], deterministicLeadSummary(data));
  data["recommended_next_step"] = pickLeadValue(data, ["recommended_next_step"], deterministicNextStep(data, classification, missing, urgency));
  data["suggested_reply"] = pickLeadValue(data, ["suggested_reply"], deterministicSuggestedReply(data, classification));
  data["qualification_mode"] = pickLeadValue(data, ["qualification_mode"], "deterministic");
  if (classification.type === "vendor_sales") data["routing_lane"] = "Owner Review";
  else if (classification.type === "contractor_partner") data["routing_lane"] = "Partner Review";
  else if (classification.type === "spam") data["routing_lane"] = "Suppressed";
  else data["routing_lane"] = pickLeadValue(data, ["routing_lane"], "All-Pro First");
  data["lead_id"] = buildLeadId(data);
  return data;
}

function escapeEmailHtml(value) {
  return String(value === undefined || value === null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function multilineEmailHtml(value) {
  return escapeEmailHtml(value).replace(/\r?\n/g, "<br>");
}

function buildSubject(data, isReview) {
  var route   = resolveAffiliateRoute(data);
  var leadType = pickLeadValue(data, ["lead_type"], "homeowner_project");
  var priority = pickLeadValue(data, ["ai_priority"], "Standard").toUpperCase();
  var prefix;
  if (isReview) prefix = "⭐ NEW ALL-PRO REVIEW";
  else if (leadType === "vendor_sales") prefix = "VENDOR PITCH · OWNER REVIEW";
  else if (leadType === "contractor_partner") prefix = "BILL'S LIST PARTNER INQUIRY";
  else if (leadType === "spam") prefix = "SUPPRESSED INTAKE";
  else prefix = "🚨 " + priority + " " + (route ? route.name.toUpperCase() : "ALL-PRO") + " LEAD";
  var name    = pickLeadValue(data, ["name", "full_name", "customer_name", "contact_name", "owner_name", "contact_person", "business_name"], "Name not entered");
  var service = pickLeadValue(data, ["service", "service_needed", "project", "project_type", "job_type", "work_type", "service_category", "main_service"], "Project details");
  var city    = pickLeadValue(data, ["city", "location", "service_area", "cities_served", "cities_covered"], "Metro East");
  var phone   = pickLeadValue(data, ["phone", "phone_number", "mobile", "contact_phone", "public_phone", "business_phone"], "");
  var parts   = [prefix, name, service, city];
  if (phone) parts.push(phone);
  return parts.join(" · ");
}

function normalizedLead(data) {
  var route = resolveAffiliateRoute(data);
  var description = pickLeadValue(data, ["details", "message", "description", "notes", "review", "project_details", "company_fit_notes", "proof_links", "license_insurance_notes"], "");
  var summary = pickLeadValue(data, ["project_summary"], "");
  var photoPlan = pickLeadValue(data, ["photos_ready"], "");
  var photoStatus = pickLeadValue(data, ["project_photo_status", "project_photo_name", "project_photo"], "");
  var photos = photoPlan;
  if (photoStatus) photos += (photos ? "; " : "") + photoStatus;
  if (!description) description = summary;
  return {
    name: pickLeadValue(data, ["name", "full_name", "customer_name", "contact_name", "owner_name", "contact_person", "business_name"], "Name not entered"),
    company: pickLeadValue(data, ["business_name", "company", "company_name"], ""),
    phone: pickLeadValue(data, ["phone", "phone_number", "mobile", "contact_phone", "public_phone", "business_phone"], "Not entered"),
    email: pickLeadValue(data, ["email", "email_address", "replyto", "_replyto", "contact_email", "business_email"], "Not entered"),
    service: pickLeadValue(data, ["service", "service_needed", "project", "project_type", "job_type", "work_type", "service_category", "main_service"], "Not selected"),
    city: pickLeadValue(data, ["city", "location", "service_area", "cities_served", "cities_covered"], "Not entered"),
    address: pickLeadValue(data, ["address", "property_address", "project_address"], ""),
    website: pickLeadValue(data, ["website", "website_or_profile", "profile_url"], ""),
    listingInterest: pickLeadValue(data, ["listing_interest"], ""),
    description: description || "No description entered.",
    projectSummary: summary,
    estimateDetails: pickLeadValue(data, ["estimate_details"], ""),
    budget: pickLeadValue(data, ["budget_range", "budget", "estimated_range"], "Not entered"),
    timeline: pickLeadValue(data, ["timeline", "preferred_timing"], "Not entered"),
    contactMethod: pickLeadValue(data, ["best_contact", "contact_method", "preferred_contact"], "Not entered"),
    quoteIntent: pickLeadValue(data, ["quote_intent"], "Not entered"),
    photos: photos || "Not entered",
    propertyType: pickLeadValue(data, ["property_type"], "Not entered"),
    formName: pickLeadValue(data, ["form_name", "form_type", "page_path"], "Unknown form"),
    pageUrl: pickLeadValue(data, ["page_url", "landing_page"], ""),
    source: pickLeadValue(data, ["lead_source", "source", "first_touch_source"], "direct"),
    firstTouch: pickLeadValue(data, ["first_touch_source"], ""),
    utmSource: pickLeadValue(data, ["utm_source"], ""),
    utmCampaign: pickLeadValue(data, ["utm_campaign"], ""),
    referrer: pickLeadValue(data, ["referrer", "first_referrer"], ""),
    submitted: pickLeadValue(data, ["submission_time_local"], new Date().toLocaleString()),
    sessionId: pickLeadValue(data, ["lead_session_id"], "n/a"),
    contactConsent: pickLeadValue(data, ["estimate_contact_consent", "contact_consent", "contractor_contact_consent", "consent"], "Not recorded"),
    marketingConsent: pickLeadValue(data, ["email_marketing_opt_in"], "No"),
    salesRep: route ? route.name : "",
    affiliateId: route ? route.id : "",
    representativePhone: route ? route.phone : "",
    representativeEmail: route ? route.email : "",
    routingLane: route ? route.lane : pickLeadValue(data, ["routing_lane"], ""),
    leadId: pickLeadValue(data, ["lead_id"], ""),
    leadType: pickLeadValue(data, ["lead_type"], "homeowner_project"),
    leadScore: pickLeadValue(data, ["ai_lead_score"], ""),
    priority: pickLeadValue(data, ["ai_priority"], "Standard"),
    urgency: pickLeadValue(data, ["lead_urgency"], "unknown"),
    spamRisk: pickLeadValue(data, ["spam_risk"], "0"),
    spamReasons: pickLeadValue(data, ["spam_reasons"], ""),
    aiSummary: pickLeadValue(data, ["ai_summary", "project_summary"], ""),
    aiQuestion: pickLeadValue(data, ["ai_follow_up_question"], ""),
    nextStep: pickLeadValue(data, ["recommended_next_step"], ""),
    suggestedReply: pickLeadValue(data, ["suggested_reply"], ""),
    missingFields: pickLeadValue(data, ["missing_fields"], ""),
    qualificationMode: pickLeadValue(data, ["qualification_mode"], "deterministic"),
    reviewRating: pickLeadValue(data, ["rating", "review_rating"], ""),
    reviewPermission: pickLeadValue(data, ["permission_to_share_on_site"], "No"),
    reviewAuthenticity: pickLeadValue(data, ["genuine_customer_confirmation"], "Not recorded"),
    reviewAcknowledgment: pickLeadValue(data, ["verification_process_acknowledgment"], "Not recorded"),
    reviewStatus: pickLeadValue(data, ["review_status"], "Pending verification"),
    reviewVerificationStatus: pickLeadValue(data, ["verification_status"], "Pending project match"),
    reviewVerificationMethod: pickLeadValue(data, ["verification_method"], ""),
    reviewId: pickLeadValue(data, ["review_id"], ""),
    reviewProjectDate: pickLeadValue(data, ["project_completion_month", "project_date"], "Not entered"),
    reviewProjectReference: pickLeadValue(data, ["project_reference", "invoice_number", "work_order_number"], "Not entered"),
    reviewProjectAddress: pickLeadValue(data, ["project_address", "property_address", "address"], "Not entered")
  };
}

function buildEmailBody(data) {
  var lead = normalizedLead(data);
  var lines = [
    "NEW ALL-PRO WEBSITE LEAD",
    "========================",
    "",
    "CONTACT",
    "Assigned representative: " + (lead.salesRep || "All-Pro team"),
    "Representative phone: " + (lead.representativePhone || "Not assigned"),
    "Representative email: " + (lead.representativeEmail || "Not assigned"),
    "Name: " + lead.name,
    "Company: " + (lead.company || "Not entered"),
    "Phone: " + lead.phone,
    "Email: " + lead.email,
    "Preferred contact: " + lead.contactMethod,
    "",
    "PROJECT",
    "Service: " + lead.service,
    "City: " + lead.city,
    "Address: " + (lead.address || "Not entered"),
    "Website/profile: " + (lead.website || "Not entered"),
    "Listing interest: " + (lead.listingInterest || "Not entered"),
    "Budget: " + lead.budget,
    "Timeline: " + lead.timeline,
    "Quote intent: " + lead.quoteIntent,
    "Photos: " + lead.photos,
    "Property type: " + lead.propertyType,
    "",
    "DESCRIPTION",
    lead.description
  ];
  if (lead.projectSummary && lead.projectSummary !== lead.description) {
    lines.push("", "Project summary: " + lead.projectSummary);
  }
  if (lead.estimateDetails) {
    lines.push("Estimate details: " + lead.estimateDetails);
  }
  if (lead.leadType === "review") {
    lines.push(
      "Review rating: " + (lead.reviewRating || "Not entered") + (lead.reviewRating ? " / 5" : ""),
      "Permission to publish: " + lead.reviewPermission,
      "Genuine customer confirmation: " + lead.reviewAuthenticity,
      "Verification process acknowledged: " + lead.reviewAcknowledgment,
      "Review status: " + lead.reviewStatus,
      "Verification status: " + lead.reviewVerificationStatus,
      "Verification method: " + (lead.reviewVerificationMethod || "Not selected"),
      "Review ID: " + (lead.reviewId || "Not assigned"),
      "Project completion month: " + lead.reviewProjectDate,
      "Private project address: " + lead.reviewProjectAddress,
      "Private invoice/work-order reference: " + lead.reviewProjectReference
    );
  }
  lines.push(
    "",
    "QUALIFICATION",
    "Lead type: " + lead.leadType,
    "Priority: " + lead.priority + (lead.leadScore ? " (" + lead.leadScore + "/100)" : ""),
    "Urgency: " + lead.urgency,
    "Spam risk: " + lead.spamRisk + "%",
    "Missing information: " + (lead.missingFields || "none"),
    "Summary: " + (lead.aiSummary || lead.description),
    "Recommended next step: " + (lead.nextStep || "Review and contact the homeowner."),
    "",
    "READY-TO-SEND REPLY",
    lead.suggestedReply || "No reply draft generated."
  );
  lines.push(
    "",
    "SOURCE & CONSENT",
    "Routing lane: " + (lead.routingLane || "All-Pro First"),
    "Affiliate ID: " + (lead.affiliateId || "none"),
    "Form: " + lead.formName,
    "Source: " + lead.source,
    "First touch: " + (lead.firstTouch || lead.source),
    "Page: " + (lead.pageUrl || "Not recorded"),
    "UTM source: " + (lead.utmSource || "none"),
    "UTM campaign: " + (lead.utmCampaign || "none"),
    "Contact consent: " + lead.contactConsent,
    "Marketing opt-in: " + lead.marketingConsent,
    "Submitted: " + lead.submitted,
    "Session ID: " + lead.sessionId,
    "Lead ID: " + lead.leadId,
    "Qualification mode: " + lead.qualificationMode
  );
  return lines.join("\n");
}

function emailInfoRow(label, value, highlight) {
  if (!value) return "";
  var background = highlight ? "#fff7ed" : "#ffffff";
  return '<tr><td style="width:34%;padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#5f6b66;font-size:13px;font-weight:700;background:' + background + ';">' +
    escapeEmailHtml(label) + '</td><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#1f2933;font-size:15px;font-weight:' +
    (highlight ? "800" : "600") + ';background:' + background + ';">' + multilineEmailHtml(value) + '</td></tr>';
}

function buildLeadEmailHtml(data, isReview) {
  var lead = normalizedLead(data);
  var accent = isReview ? "#b45309" : (lead.leadType === "vendor_sales" ? "#64748b" : "#c96a26");
  var header = isReview ? "NEW CUSTOMER REVIEW" :
    (lead.leadType === "vendor_sales" ? "VENDOR PITCH - OWNER REVIEW" :
    (lead.leadType === "contractor_partner" ? "BILL'S LIST PARTNER INQUIRY" :
    (lead.salesRep ? "NEW " + lead.salesRep.toUpperCase() + " LEAD" : "NEW WEBSITE LEAD")));
  var phoneDigits = lead.phone.replace(/\D/g, "");
  var phoneHref = phoneDigits.length >= 10 ? "tel:+" + (phoneDigits.length === 10 ? "1" : "") + phoneDigits : "";
  var emailHref = lead.email !== "Not entered" ? "mailto:" + encodeURIComponent(lead.email) : "";
  var actions = [];
  if (phoneHref) {
    actions.push('<a href="' + phoneHref + '" style="display:inline-block;margin:4px 8px 4px 0;padding:13px 18px;background:#2f5d50;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:800;font-size:15px;">Call ' + escapeEmailHtml(lead.phone) + '</a>');
  }
  if (emailHref) {
    actions.push('<a href="' + emailHref + '" style="display:inline-block;margin:4px 8px 4px 0;padding:13px 18px;background:#1f2933;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:800;font-size:15px;">Email ' + escapeEmailHtml(lead.name) + '</a>');
  }

  var reviewRows = isReview ? [
    emailInfoRow("Review rating", lead.reviewRating ? lead.reviewRating + " / 5" : "Not entered", true),
    emailInfoRow("Permission to publish", lead.reviewPermission, true),
    emailInfoRow("Genuine customer confirmation", lead.reviewAuthenticity, false),
    emailInfoRow("Verification process acknowledged", lead.reviewAcknowledgment, false),
    emailInfoRow("Review status", lead.reviewStatus, true),
    emailInfoRow("Verification status", lead.reviewVerificationStatus, true),
    emailInfoRow("Verification method", lead.reviewVerificationMethod || "Not selected", false),
    emailInfoRow("Review ID", lead.reviewId || "Not assigned", false),
    emailInfoRow("Project completion month", lead.reviewProjectDate, false),
    emailInfoRow("Private project address", lead.reviewProjectAddress, false),
    emailInfoRow("Private invoice/work-order reference", lead.reviewProjectReference, false)
  ].join("") : "";

  var projectRows = reviewRows + [
    emailInfoRow("Assigned representative", lead.salesRep || "All-Pro team", true),
    emailInfoRow("Representative phone", lead.representativePhone, false),
    emailInfoRow("Representative email", lead.representativeEmail, false),
    emailInfoRow("Company", lead.company, false),
    emailInfoRow("Service", lead.service, true),
    emailInfoRow("City", lead.city, true),
    emailInfoRow("Address", lead.address || "Not entered", false),
    emailInfoRow("Website / profile", lead.website, false),
    emailInfoRow("Listing interest", lead.listingInterest, false),
    emailInfoRow("Budget", lead.budget, false),
    emailInfoRow("Timeline", lead.timeline, false),
    emailInfoRow("Quote intent", lead.quoteIntent, false),
    emailInfoRow("Photos", lead.photos, false),
    emailInfoRow("Property type", lead.propertyType, false)
  ].join("");

  var sourceRows = [
    emailInfoRow("Routing lane", lead.routingLane || "All-Pro First", false),
    emailInfoRow("Affiliate ID", lead.affiliateId || "none", false),
    emailInfoRow("Form", lead.formName, false),
    emailInfoRow("Lead source", lead.source, false),
    emailInfoRow("First touch", lead.firstTouch || lead.source, false),
    emailInfoRow("UTM source", lead.utmSource || "none", false),
    emailInfoRow("UTM campaign", lead.utmCampaign || "none", false),
    emailInfoRow("Contact consent", lead.contactConsent, false),
    emailInfoRow("Marketing opt-in", lead.marketingConsent, false),
    emailInfoRow("Submitted", lead.submitted, false),
    emailInfoRow("Session ID", lead.sessionId, false),
    emailInfoRow("Lead ID", lead.leadId, false),
    emailInfoRow("Qualification mode", lead.qualificationMode, false)
  ].join("");

  var qualificationRows = [
    emailInfoRow("Lead type", lead.leadType, false),
    emailInfoRow("Priority", lead.priority + (lead.leadScore ? " (" + lead.leadScore + "/100)" : ""), true),
    emailInfoRow("Urgency", lead.urgency, false),
    emailInfoRow("Spam risk", lead.spamRisk + "%", false),
    emailInfoRow("Missing information", lead.missingFields || "none", false),
    emailInfoRow("Recommended next step", lead.nextStep || "Review the request.", true)
  ].join("");

  return [
    '<!doctype html><html><body style="margin:0;padding:0;background:#f3f5f4;font-family:Arial,Helvetica,sans-serif;color:#1f2933;">',
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0;">New All-Pro lead from ' + escapeEmailHtml(lead.name) + ': ' + escapeEmailHtml(lead.service) + ' in ' + escapeEmailHtml(lead.city) + '.</div>',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f5f4;padding:20px 8px;"><tr><td align="center">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border:1px solid #dfe5e2;border-radius:8px;overflow:hidden;">',
    '<tr><td style="padding:20px 24px;background:#1f2933;border-top:7px solid ' + accent + ';">',
    '<div style="color:#f7f3ea;font-size:12px;font-weight:800;letter-spacing:1.2px;">ALL-PRO CONSTRUCTION &amp; LANDSCAPE</div>',
    '<div style="margin-top:7px;color:#ffffff;font-size:26px;font-weight:900;">' + header + '</div>',
    '<div style="margin-top:6px;color:#d8e4df;font-size:15px;">' + escapeEmailHtml(lead.service) + ' in ' + escapeEmailHtml(lead.city) + '</div>',
    !isReview ? '<div style="display:inline-block;margin-top:10px;padding:5px 9px;background:' + accent + ';color:#ffffff;border-radius:4px;font-size:12px;font-weight:900;">' + escapeEmailHtml(lead.priority.toUpperCase()) + ' · ' + escapeEmailHtml(lead.leadScore || "0") + '/100</div>' : '',
    '</td></tr>',
    '<tr><td style="padding:22px 24px 8px;">',
    '<div style="font-size:12px;font-weight:800;color:' + accent + ';letter-spacing:1px;">CONTACT THIS LEAD</div>',
    '<div style="margin:6px 0 2px;font-size:25px;font-weight:900;color:#1f2933;">' + escapeEmailHtml(lead.name) + '</div>',
    lead.company && lead.company !== lead.name ? '<div style="margin-top:3px;font-size:16px;font-weight:800;color:#44524c;">' + escapeEmailHtml(lead.company) + '</div>' : '',
    '<div style="font-size:18px;font-weight:800;color:#2f5d50;">' + escapeEmailHtml(lead.phone) + '</div>',
    '<div style="margin-top:4px;font-size:15px;color:#44524c;">' + escapeEmailHtml(lead.email) + '</div>',
    '<div style="margin-top:14px;">' + actions.join("") + '</div>',
    '</td></tr>',
    '<tr><td style="padding:14px 24px 0;"><div style="font-size:17px;font-weight:900;color:#1f2933;margin-bottom:8px;">Project details</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">' + projectRows + '</table></td></tr>',
    '<tr><td style="padding:20px 24px 0;"><div style="font-size:17px;font-weight:900;color:#1f2933;margin-bottom:8px;">Homeowner description</div><div style="padding:16px;background:#f7f3ea;border-left:5px solid ' + accent + ';font-size:15px;line-height:1.6;color:#26332e;">' + multilineEmailHtml(lead.description) + '</div></td></tr>',
    lead.projectSummary && lead.projectSummary !== lead.description ? '<tr><td style="padding:14px 24px 0;"><strong>Project summary:</strong><br><span style="line-height:1.5;">' + multilineEmailHtml(lead.projectSummary) + '</span></td></tr>' : '',
    lead.estimateDetails ? '<tr><td style="padding:14px 24px 0;"><strong>Estimator details:</strong><br><span style="line-height:1.5;">' + multilineEmailHtml(lead.estimateDetails) + '</span></td></tr>' : '',
    !isReview ? '<tr><td style="padding:20px 24px 0;"><div style="font-size:17px;font-weight:900;color:#1f2933;margin-bottom:8px;">Lead qualification</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">' + qualificationRows + '</table></td></tr>' : '',
    !isReview && lead.aiSummary ? '<tr><td style="padding:20px 24px 0;"><div style="font-size:17px;font-weight:900;color:#1f2933;margin-bottom:8px;">Project brief</div><div style="padding:16px;background:#eef5f2;border-left:5px solid #2f5d50;font-size:15px;line-height:1.6;color:#26332e;">' + multilineEmailHtml(lead.aiSummary) + '</div></td></tr>' : '',
    !isReview && lead.suggestedReply ? '<tr><td style="padding:20px 24px 0;"><div style="font-size:17px;font-weight:900;color:#1f2933;margin-bottom:8px;">Ready-to-send customer reply</div><div style="padding:16px;background:#fff7ed;border:1px solid #fed7aa;font-size:15px;line-height:1.6;color:#26332e;">' + multilineEmailHtml(lead.suggestedReply) + '</div></td></tr>' : '',
    '<tr><td style="padding:20px 24px 0;"><div style="font-size:17px;font-weight:900;color:#1f2933;margin-bottom:8px;">Source and consent</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">' + sourceRows + '</table></td></tr>',
    lead.pageUrl ? '<tr><td style="padding:16px 24px 0;font-size:13px;color:#5f6b66;word-break:break-all;"><strong>Submitted from:</strong> <a href="' + escapeEmailHtml(lead.pageUrl) + '" style="color:#2f5d50;">' + escapeEmailHtml(lead.pageUrl) + '</a></td></tr>' : '',
    '<tr><td style="padding:22px 24px;background:#f7f3ea;font-size:13px;line-height:1.5;color:#52605a;">This alert was generated by the verified All-Pro website form handler. Replying to this email replies to the homeowner when an email address was provided.</td></tr>',
    '</table></td></tr></table></body></html>'
  ].join("");
}

function sendLeadNotification(data, subject, isReview, projectPhotoBlob) {
  var body = buildEmailBody(data);
  var htmlBody = buildLeadEmailHtml(data, isReview);
  var replyTo = pickLeadValue(data, ["email", "email_address", "replyto", "_replyto", "contact_email", "business_email"], "");
  var route = resolveAffiliateRoute(data);
  var leadType = pickLeadValue(data, ["lead_type"], "homeowner_project");
  var ownerOnly = leadType === "vendor_sales" || leadType === "contractor_partner" || leadType === "spam";
  var to = isReview || ownerOnly ? CONFIG.reviewEmail : CONFIG.leadEmail;
  var cc = ownerOnly ? "" : uniqueEmailCsv([CONFIG.ownerEmail, route ? route.email : ""], to);
  var options = {
    to: to,
    subject: subject,
    body: body,
    htmlBody: htmlBody,
    name: isReview ? "ALL-PRO REVIEW ALERT" : (route ? "ALL-PRO " + route.name.toUpperCase() + " LEAD ALERT" : "ALL-PRO NEW LEAD ALERT")
  };
  if (cc) options.cc = cc;
  if (replyTo && leadType === "homeowner_project") options.replyTo = replyTo;
  if (projectPhotoBlob) options.attachments = [projectPhotoBlob];
  MailApp.sendEmail(options);
}

function sendCustomerConfirmation(data) {
  var lead = normalizedLead(data);
  var result = { sent: false, eligible: false, reason: "" };
  if (!CONFIG.sendCustomerConfirmation) {
    result.reason = "disabled";
    return result;
  }
  if (lead.leadType !== "homeowner_project") {
    result.reason = "not-homeowner-project";
    return result;
  }
  if (!isValidLeadEmail(lead.email)) {
    result.reason = "no-valid-email";
    return result;
  }
  if (!hasRecordedConsent(lead.contactConsent)) {
    result.reason = "contact-consent-not-recorded";
    return result;
  }

  result.eligible = true;
  var route = resolveAffiliateRoute(data);
  var representative = route ? route.name : "Bill";
  var representativePhone = route ? route.phone : "618-581-0676";
  var responseWindow = customerResponseWindowText();
  var subject = "We received your All-Pro estimate request";
  var body = [
    "Hi " + (lead.name === "Name not entered" ? "there" : lead.name.split(/\s+/)[0]) + ",",
    "",
    "Thanks for contacting All-Pro about your " + lead.service + " project in " + lead.city + ".",
    representative + " will review the information you sent and contact you about the next step.",
    responseWindow,
    "",
    "Project summary: " + (lead.aiSummary || lead.description),
    "",
    "You can reply to this email with photos or additional details.",
    "Call All-Pro: " + representativePhone,
    "",
    "All-Pro Construction & Landscape",
    CONFIG.siteOrigin
  ].join("\n");
  var html = [
    '<!doctype html><html><body style="margin:0;background:#f3f5f4;font-family:Arial,Helvetica,sans-serif;color:#1f2933;">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:20px 8px;background:#f3f5f4;"><tr><td align="center">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #dfe5e2;border-radius:8px;overflow:hidden;">',
    '<tr><td style="padding:22px 24px;background:#1f2933;border-top:7px solid #c96a26;color:#ffffff;"><div style="font-size:12px;font-weight:800;">ALL-PRO CONSTRUCTION &amp; LANDSCAPE</div><div style="margin-top:7px;font-size:24px;font-weight:900;">We received your request</div></td></tr>',
    '<tr><td style="padding:24px;font-size:16px;line-height:1.6;">',
    '<p style="margin-top:0;">Hi ' + escapeEmailHtml(lead.name === "Name not entered" ? "there" : lead.name.split(/\s+/)[0]) + ',</p>',
    '<p>Thanks for contacting All-Pro about your <strong>' + escapeEmailHtml(lead.service) + '</strong> project in <strong>' + escapeEmailHtml(lead.city) + '</strong>.</p>',
    '<p>' + escapeEmailHtml(representative) + ' will review your information and contact you about the next step.</p>',
    '<div style="margin:18px 0;padding:15px;background:#eef5f2;border-left:5px solid #2f5d50;font-weight:800;color:#26332e;">' + escapeEmailHtml(responseWindow) + '</div>',
    '<div style="margin:18px 0;padding:15px;background:#f7f3ea;border-left:5px solid #2f5d50;">' + multilineEmailHtml(lead.aiSummary || lead.description) + '</div>',
    '<p>You can reply to this email with photos or additional project details.</p>',
    '<p><a href="tel:' + escapeEmailHtml(normalizeE164(representativePhone)) + '" style="display:inline-block;padding:12px 17px;background:#2f5d50;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:800;">Call ' + escapeEmailHtml(representativePhone) + '</a></p>',
    '<p style="margin-bottom:0;font-size:13px;color:#5f6b66;">This is a confirmation for the estimate request you submitted. It is not a marketing subscription.</p>',
    '</td></tr></table></td></tr></table></body></html>'
  ].join("");

  MailApp.sendEmail({
    to: lead.email,
    subject: subject,
    body: body,
    htmlBody: html,
    name: "All-Pro Estimate Requests",
    replyTo: route ? route.email : CONFIG.leadEmail
  });
  result.sent = true;
  return result;
}

function customerResponseWindowText() {
  return "We will be in touch within 24 hours. Requests received on weekends or holidays may be answered on the next business day.";
}

/**
 * Script Properties required for Twilio SMS:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_API_KEY_SID          (restricted key with Messages: Create)
 *   TWILIO_API_KEY_SECRET
 *   TWILIO_FROM_NUMBER          (E.164, such as +16185551234)
 * Optional:
 *   SMS_ALERT_TO                (defaults to CONFIG.smsAlertTo)
 *   TWILIO_AUTH_TOKEN           (legacy fallback when no API key is configured)
 *
 * Keep credentials in Apps Script Project Settings, never in this file.
 */
function smsSetupStatus() {
  var props = PropertiesService.getScriptProperties();
  var accountSid = String(props.getProperty("TWILIO_ACCOUNT_SID") || "").trim();
  var apiKeySid = String(props.getProperty("TWILIO_API_KEY_SID") || "").trim();
  var apiKeySecret = String(props.getProperty("TWILIO_API_KEY_SECRET") || "").trim();
  var authToken = String(props.getProperty("TWILIO_AUTH_TOKEN") || "").trim();
  var from = normalizeE164(props.getProperty("TWILIO_FROM_NUMBER"));
  var hasApiKey = Boolean(apiKeySid && apiKeySecret);
  var missing = [];
  if (!accountSid) missing.push("TWILIO_ACCOUNT_SID");
  if (!hasApiKey && !authToken) {
    missing.push("TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET (or TWILIO_AUTH_TOKEN)");
  }
  if (!from) missing.push("TWILIO_FROM_NUMBER");
  return {
    configured: missing.length === 0,
    missing: missing,
    authMode: hasApiKey ? "restricted-api-key" : (authToken ? "auth-token" : "none"),
    alertTo: normalizeE164(props.getProperty("SMS_ALERT_TO") || CONFIG.smsAlertTo)
  };
}

function sendSmsAlert(data) {
  var status = smsSetupStatus();
  if (!status.configured) {
    Logger.log("Twilio SMS not configured. Missing: " + status.missing.join(", "));
    return { sent: false, configured: false, missing: status.missing };
  }

  var props = PropertiesService.getScriptProperties();
  var accountSid = String(props.getProperty("TWILIO_ACCOUNT_SID") || "").trim();
  var apiKeySid = String(props.getProperty("TWILIO_API_KEY_SID") || "").trim();
  var apiKeySecret = String(props.getProperty("TWILIO_API_KEY_SECRET") || "").trim();
  var authToken = String(props.getProperty("TWILIO_AUTH_TOKEN") || "").trim();
  var authUser = apiKeySid && apiKeySecret ? apiKeySid : accountSid;
  var authPassword = apiKeySid && apiKeySecret ? apiKeySecret : authToken;
  var from = normalizeE164(props.getProperty("TWILIO_FROM_NUMBER"));
  var to = status.alertTo;
  if (!from || !to) throw new Error("Twilio From and SMS alert To numbers must use E.164 format.");

  var endpoint = "https://api.twilio.com/2010-04-01/Accounts/" +
    encodeURIComponent(accountSid) + "/Messages.json";
  var response = UrlFetchApp.fetch(endpoint, {
    method: "post",
    payload: {
      To: to,
      From: from,
      Body: buildSmsBody(data)
    },
    headers: {
      Authorization: "Basic " + Utilities.base64Encode(authUser + ":" + authPassword)
    },
    muteHttpExceptions: true
  });

  var code = response.getResponseCode();
  var raw = response.getContentText();
  var parsed = {};
  try { parsed = JSON.parse(raw); } catch (_) {}
  if (code < 200 || code >= 300) {
    throw new Error("Twilio SMS failed (HTTP " + code + "): " +
      String(parsed.message || raw || "Unknown Twilio error").substring(0, 300));
  }
  return {
    sent: true,
    configured: true,
    authMode: status.authMode,
    sid: parsed.sid || "",
    status: parsed.status || "queued"
  };
}

function buildSmsBody(data) {
  var route = resolveAffiliateRoute(data);
  var lead = normalizedLead(data);
  return [
    "NEW " + lead.priority.toUpperCase() + " " + (route ? route.name.toUpperCase() : "ALL-PRO") + " LEAD",
    lead.name + " | " + lead.phone,
    lead.service + " | " + lead.city,
    "Next: " + (lead.nextStep || "Call or text the homeowner."),
    "Lead ID: " + lead.leadId
  ].join("\n").substring(0, 480);
}

function normalizeE164(value) {
  var raw = String(value || "").trim();
  if (!raw) return "";
  var digits = raw.replace(/\D/g, "");
  if (digits.length === 10) digits = "1" + digits;
  return digits.length >= 11 && digits.length <= 15 ? "+" + digits : "";
}

function sendSmsTest() {
  var status = smsSetupStatus();
  if (!status.configured) return { ok: false, sms: status };
  var result = sendSmsAlert({
    name: "All-Pro delivery check",
    phone: "618-292-5320",
    service: "SMS lead alert test",
    city: "Belleville",
    form_name: "Apps Script manual test"
  });
  return { ok: result.sent === true, sms: result };
}

function uniqueEmailCsv(values, excludeCsv) {
  var seen = {};
  var output = [];
  var exclude = String(excludeCsv || "").toLowerCase().split(",");
  for (var e = 0; e < exclude.length; e++) {
    var excluded = exclude[e].trim();
    if (excluded) seen[excluded] = true;
  }
  for (var i = 0; i < values.length; i++) {
    var email = String(values[i] || "").trim();
    var key = email.toLowerCase();
    if (email && key.indexOf("@") > -1 && !seen[key]) {
      seen[key] = true;
      output.push(email);
    }
  }
  return output.join(",");
}

function buildThankYouUrl(data) {
  var slug = (data["form_slug"] || data["form_name"] || "website")
    .toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  return CONFIG.thankYouUrl + "&form=" + encodeURIComponent(slug);
}

function buildLeadId(data) {
  var sessionId = pickLeadValue(data, ["lead_session_id", "concierge_session_id"], "");
  if (sessionId) return "web:" + sessionId.substring(0, 90);
  var fingerprint = [
    pickLeadValue(data, ["phone", "phone_number", "mobile", "contact_phone"], "").replace(/\D/g, ""),
    pickLeadValue(data, ["email", "email_address", "contact_email"], "").toLowerCase(),
    pickLeadValue(data, ["service", "service_needed", "project", "project_type"], "").toLowerCase(),
    pickLeadValue(data, ["submission_time_utc", "submission_time_local"], new Date().toISOString())
  ].join("|");
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, fingerprint, Utilities.Charset.UTF_8);
  var hex = bytes.map(function(value) {
    var normalized = value < 0 ? value + 256 : value;
    return ("0" + normalized.toString(16)).slice(-2);
  }).join("");
  return "web:" + hex.substring(0, 24);
}

function getLeadSpreadsheet() {
  var targetId = "1xcc0xo4UeN3EaZUMNn_qFJ-xgX6ZPg7l7sTMSLsT6GE";
  try { return SpreadsheetApp.openById(targetId); } catch (openErr) {}
  try {
    var active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (activeErr) {}
  throw new Error("All-Pro Leads spreadsheet is unavailable for this account.");
}

function ensureFollowUpBoard() {
  var ss = getLeadSpreadsheet();
  var sheet = ss.getSheetByName("Follow Up Board");
  var baseHeaders = [
    "Received", "Name", "Phone", "Email", "City", "Service",
    "Project Summary", "Source", "Status", "Priority", "Bill Text Sent?",
    "Next Step", "Notes", "Gmail Thread ID"
  ];
  var automationHeaders = ["Last Reminder", "Reminder Count", "Review Request Status", "Customer Confirmation"];
  if (!sheet) {
    sheet = ss.insertSheet("Follow Up Board");
    sheet.getRange(1, 1, 1, baseHeaders.length + automationHeaders.length)
      .setValues([baseHeaders.concat(automationHeaders)])
      .setFontWeight("bold");
    sheet.setFrozenRows(1);
  } else {
    var current = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), baseHeaders.length)).getValues()[0];
    if (!current[0]) {
      sheet.getRange(1, 1, 1, baseHeaders.length).setValues([baseHeaders]).setFontWeight("bold");
    }
    for (var i = 0; i < automationHeaders.length; i++) {
      var col = baseHeaders.length + i + 1;
      if (!sheet.getRange(1, col).getValue()) {
        sheet.getRange(1, col).setValue(automationHeaders[i]).setFontWeight("bold");
      }
    }
  }
  return sheet;
}

function setupFollowUpBoard() {
  var sheet = ensureFollowUpBoard();
  var maxRows = Math.max(sheet.getMaxRows() - 1, 1);
  var statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["New", "Contacted", "Estimate Set", "Won", "Lost", "No Fit", "Vendor Pitch", "Partner Inquiry"], true)
    .setAllowInvalid(true)
    .build();
  var priorityRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["High", "Medium", "Low"], true)
    .setAllowInvalid(true)
    .build();
  var yesNoRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["No", "Yes"], true)
    .setAllowInvalid(true)
    .build();
  var reviewRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Ready", "Sent", "Skip"], true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange(2, 9, maxRows, 1).setDataValidation(statusRule);
  sheet.getRange(2, 10, maxRows, 1).setDataValidation(priorityRule);
  sheet.getRange(2, 11, maxRows, 1).setDataValidation(yesNoRule);
  sheet.getRange(2, 17, maxRows, 1).setDataValidation(reviewRule);
  sheet.setColumnWidth(7, 420);
  sheet.setColumnWidth(12, 380);
  sheet.setColumnWidth(13, 340);
  return { ok: true, sheet: sheet.getName(), columns: 18 };
}

function ensureReviewQueue() {
  var ss = getLeadSpreadsheet();
  var sheet = ss.getSheetByName("Website Reviews");
  var headers = [
    "Submitted", "Review ID", "Review Status", "Verification Status",
    "Verification Method", "Verified At", "Reviewer Name", "Email (Private)",
    "Phone (Private)", "Project Address (Private)", "City", "Project Type",
    "Completion Month", "Invoice / Work Order (Private)", "Rating", "Review Text",
    "Permission to Publish", "Genuine Confirmation", "Verification Acknowledgment",
    "Source", "Page URL", "Publication Notes", "Published URL"
  ];

  if (!sheet) {
    sheet = ss.insertSheet("Website Reviews");
    sheet.setFrozenRows(1);
  }
  ensureSheetColumnCapacity(sheet, headers.length);
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  if (headerRange.getValues()[0].join("|") !== headers.join("|")) {
    headerRange.setValues([headers]).setFontWeight("bold");
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 160);
    sheet.setColumnWidth(2, 220);
    sheet.setColumnWidth(8, 240);
    sheet.setColumnWidth(10, 280);
    sheet.setColumnWidth(16, 520);
    sheet.setColumnWidth(22, 360);
  }

  var maxRows = Math.max(sheet.getMaxRows() - 1, 1);
  var reviewStatusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Pending verification", "Approved for publication", "Not publishable", "Removed"], true)
    .setAllowInvalid(false)
    .build();
  var verificationRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Pending project match", "Verified All-Pro Project", "Unable to verify", "Rejected as fraudulent"], true)
    .setAllowInvalid(false)
    .build();
  var methodRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["", "Customer contact + project address", "Invoice / work order", "Scheduling record", "Project communications", "Project photos", "Multiple records"], true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange(2, 3, maxRows, 1).setDataValidation(reviewStatusRule);
  sheet.getRange(2, 4, maxRows, 1).setDataValidation(verificationRule);
  sheet.getRange(2, 5, maxRows, 1).setDataValidation(methodRule);
  return sheet;
}

function safeReviewSheetText(value, maxLength) {
  var text = String(value === undefined || value === null ? "" : value);
  if (maxLength && text.length > maxLength) text = text.substring(0, maxLength);
  if (/^\s*[=+\-@]/.test(text)) text = "'" + text;
  return text;
}

function publicReviewName(value) {
  var parts = String(value || "").trim().split(/\s+/).filter(function(part) { return part; });
  if (!parts.length) return "All-Pro customer";
  if (parts.length === 1) return parts[0].substring(0, 80);
  return parts[0].substring(0, 80) + " " + parts[parts.length - 1].charAt(0).toUpperCase() + ".";
}

function toPublicWebsiteReview(row) {
  if (!row || row.length < 23) return null;
  if (String(row[2] || "") !== "Approved for publication") return null;
  if (String(row[3] || "") !== "Verified All-Pro Project") return null;
  if (!hasRecordedConsent(row[16]) || !hasRecordedConsent(row[17]) || !hasRecordedConsent(row[18])) return null;
  var rating = parseInt(row[14], 10);
  var reviewText = String(row[15] || "").trim();
  if (!reviewText || rating < 1 || rating > 5) return null;
  var verifiedDate = "";
  if (row[5] instanceof Date && !isNaN(row[5].getTime())) {
    verifiedDate = row[5].toISOString().substring(0, 10);
  } else {
    verifiedDate = String(row[5] || "").substring(0, 10);
  }
  return {
    reviewer: publicReviewName(row[6]),
    city: String(row[10] || "Metro East").substring(0, 160),
    projectType: String(row[11] || "Home project").substring(0, 240),
    completionMonth: String(row[12] || "").substring(0, 10),
    rating: rating,
    review: reviewText.substring(0, 5000),
    verifiedDate: verifiedDate,
    badge: "Verified All-Pro Project"
  };
}

function buildPublishedReviewFeed() {
  var sheet = getLeadSpreadsheet().getSheetByName("Website Reviews");
  if (!sheet || sheet.getLastRow() < 2) return { ok: true, count: 0, reviews: [] };
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 23).getValues();
  var reviews = [];
  for (var i = rows.length - 1; i >= 0 && reviews.length < 100; i--) {
    var review = toPublicWebsiteReview(rows[i]);
    if (review) reviews.push(review);
  }
  return { ok: true, count: reviews.length, reviews: reviews };
}

function syncReviewQueue(data) {
  var lead = normalizedLead(data);
  if (lead.leadType !== "review") {
    return { logged: false, skipped: true, reason: lead.leadType };
  }

  var sheet = ensureReviewQueue();
  var reviewId = lead.reviewId || buildReviewId(data);
  data["review_id"] = reviewId;
  if (sheet.getLastRow() > 1) {
    var duplicate = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1)
      .createTextFinder(reviewId)
      .matchEntireCell(true)
      .findNext();
    if (duplicate) return { logged: false, duplicate: true, reviewId: reviewId };
  }

  sheet.appendRow([
    new Date(),
    safeReviewSheetText(reviewId, 100),
    safeReviewSheetText(lead.reviewStatus, 80),
    safeReviewSheetText(lead.reviewVerificationStatus, 80),
    safeReviewSheetText(lead.reviewVerificationMethod, 100),
    "",
    safeReviewSheetText(lead.name === "Name not entered" ? "" : lead.name, 200),
    safeReviewSheetText(lead.email === "Not entered" ? "" : lead.email, 320),
    safeReviewSheetText(lead.phone === "Not entered" ? "" : lead.phone, 80),
    safeReviewSheetText(lead.reviewProjectAddress === "Not entered" ? "" : lead.reviewProjectAddress, 500),
    safeReviewSheetText(lead.city === "Not entered" ? "" : lead.city, 160),
    safeReviewSheetText(lead.service === "Not selected" ? "" : lead.service, 240),
    safeReviewSheetText(lead.reviewProjectDate === "Not entered" ? "" : lead.reviewProjectDate, 80),
    safeReviewSheetText(lead.reviewProjectReference === "Not entered" ? "" : lead.reviewProjectReference, 200),
    safeReviewSheetText(lead.reviewRating, 20),
    safeReviewSheetText(lead.description === "No description entered." ? "" : lead.description, 5000),
    safeReviewSheetText(lead.reviewPermission, 40),
    safeReviewSheetText(lead.reviewAuthenticity, 40),
    safeReviewSheetText(lead.reviewAcknowledgment, 40),
    safeReviewSheetText(lead.source, 240),
    safeReviewSheetText(lead.pageUrl, 1000),
    "",
    ""
  ]);
  return { logged: true, row: sheet.getLastRow(), reviewId: reviewId };
}

function verifyWebsiteReview(reviewId, verificationMethod, publicationNotes) {
  var id = String(reviewId || "").trim();
  if (!id) throw new Error("Review ID is required.");
  var method = String(verificationMethod || "Multiple records").trim();
  var allowedMethods = [
    "Customer contact + project address", "Invoice / work order", "Scheduling record",
    "Project communications", "Project photos", "Multiple records"
  ];
  if (allowedMethods.indexOf(method) === -1) throw new Error("Choose an approved verification method.");
  var sheet = ensureReviewQueue();
  if (sheet.getLastRow() < 2) throw new Error("No website reviews are waiting.");
  var match = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1)
    .createTextFinder(id)
    .matchEntireCell(true)
    .findNext();
  if (!match) throw new Error("Review ID not found: " + id);
  var row = match.getRow();
  var rowValues = sheet.getRange(row, 1, 1, 23).getValues()[0];
  if (!hasRecordedConsent(rowValues[16])) throw new Error("Publication permission is required.");
  if (!hasRecordedConsent(rowValues[17])) throw new Error("Genuine customer confirmation is required.");
  if (!hasRecordedConsent(rowValues[18])) throw new Error("Verification acknowledgment is required.");
  if (!String(rowValues[15] || "").trim()) throw new Error("Review text is required.");
  var rating = parseInt(rowValues[14], 10);
  if (rating < 1 || rating > 5) throw new Error("A rating from 1 to 5 is required.");
  sheet.getRange(row, 3).setValue("Approved for publication");
  sheet.getRange(row, 4).setValue("Verified All-Pro Project");
  sheet.getRange(row, 5).setValue(method);
  sheet.getRange(row, 6).setValue(new Date());
  sheet.getRange(row, 22).setValue(safeReviewSheetText(publicationNotes, 2000));
  return { ok: true, row: row, reviewId: id, status: "Verified All-Pro Project" };
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("All-Pro Reviews")
    .addItem("Open Review Queue", "openWebsiteReviewQueue")
    .addSeparator()
    .addItem("Verify Selected Review", "verifySelectedWebsiteReview")
    .addItem("Mark Selected Unable to Verify", "markSelectedWebsiteReviewUnableToVerify")
    .addToUi();
  SpreadsheetApp.getUi()
    .createMenu("All-Pro Marketing")
    .addItem("Set Up Marketing Queue", "setupMarketingCampaignSystem")
    .addItem("Preview Eligible Subscribers", "previewSeasonalCampaign")
    .addSeparator()
    .addItem("Send Test to Tony", "sendSeasonalCampaignTest")
    .addItem("Send Approved Batch", "sendSeasonalCampaignBatch")
    .addToUi();
}

function openWebsiteReviewQueue() {
  var sheet = ensureReviewQueue();
  sheet.activate();
  SpreadsheetApp.getActive().toast("Website Reviews queue is ready.", "All-Pro Reviews", 5);
}

function selectedWebsiteReview_() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var row = sheet.getActiveRange().getRow();
  if (sheet.getName() !== "Website Reviews" || row < 2) {
    throw new Error("Select a review row in the Website Reviews tab first.");
  }
  var reviewId = String(sheet.getRange(row, 2).getValue() || "").trim();
  if (!reviewId) throw new Error("The selected row does not have a Review ID.");
  return { sheet: sheet, row: row, reviewId: reviewId };
}

function verifySelectedWebsiteReview() {
  var selected = selectedWebsiteReview_();
  var ui = SpreadsheetApp.getUi();
  var methodResponse = ui.prompt(
    "Verify selected review",
    "Enter one verification method: Customer contact + project address; Invoice / work order; Scheduling record; Project communications; Project photos; or Multiple records.",
    ui.ButtonSet.OK_CANCEL
  );
  if (methodResponse.getSelectedButton() !== ui.Button.OK) return;
  var notesResponse = ui.prompt(
    "Private verification note",
    "Add a short internal note about the matched record. This note is not published.",
    ui.ButtonSet.OK_CANCEL
  );
  if (notesResponse.getSelectedButton() !== ui.Button.OK) return;
  verifyWebsiteReview(selected.reviewId, methodResponse.getResponseText(), notesResponse.getResponseText());
  SpreadsheetApp.getActive().toast("Review marked Verified All-Pro Project.", "All-Pro Reviews", 6);
}

function markSelectedWebsiteReviewUnableToVerify() {
  var selected = selectedWebsiteReview_();
  var ui = SpreadsheetApp.getUi();
  var response = ui.prompt(
    "Unable to verify selected review",
    "Add a private note explaining why the project could not be matched.",
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK) return;
  selected.sheet.getRange(selected.row, 3).setValue("Not publishable");
  selected.sheet.getRange(selected.row, 4).setValue("Unable to verify");
  selected.sheet.getRange(selected.row, 5, 1, 2).clearContent();
  selected.sheet.getRange(selected.row, 22).setValue(safeReviewSheetText(response.getResponseText(), 2000));
  SpreadsheetApp.getActive().toast("Review marked Unable to verify.", "All-Pro Reviews", 6);
}

function syncFollowUpBoard(data, delivery) {
  var lead = normalizedLead(data);
  if (lead.leadType === "review" || lead.leadType === "spam") {
    return { logged: false, skipped: true, reason: lead.leadType };
  }
  var sheet = ensureFollowUpBoard();
  var leadId = lead.leadId || buildLeadId(data);
  var duplicate = sheet.getRange(2, 14, Math.max(sheet.getLastRow() - 1, 1), 1)
    .createTextFinder(leadId)
    .matchEntireCell(true)
    .findNext();
  if (duplicate) {
    return { logged: false, duplicate: true, row: duplicate.getRow(), leadId: leadId };
  }

  var status = lead.leadType === "vendor_sales" ? "Vendor Pitch" :
    (lead.leadType === "contractor_partner" ? "Partner Inquiry" : "New");
  var priority = lead.priority === "Hot" ? "High" : (lead.priority === "Warm" ? "Medium" : "Low");
  var notes = [
    "Lead type: " + lead.leadType,
    "Score: " + (lead.leadScore || "0") + "/100",
    "Urgency: " + lead.urgency,
    lead.missingFields ? "Missing: " + lead.missingFields : "",
    "Marketing opt-in: " + lead.marketingConsent
  ].filter(function(value) { return Boolean(value); }).join(" | ").substring(0, 900);
  var confirmation = delivery && delivery.confirmation && delivery.confirmation.sent ? "sent" :
    (delivery && delivery.confirmation ? delivery.confirmation.reason || "not sent" : "not checked");

  sheet.appendRow([
    new Date(),
    lead.name === "Name not entered" ? "" : lead.name,
    lead.phone === "Not entered" ? "" : lead.phone,
    lead.email === "Not entered" ? "" : lead.email,
    lead.city === "Not entered" ? "" : lead.city,
    lead.service === "Not selected" ? "" : lead.service,
    lead.aiSummary || lead.description,
    [lead.formName, lead.source].filter(function(value) { return value && value !== "Unknown form"; }).join(" / "),
    status,
    priority,
    "No",
    lead.nextStep,
    notes,
    leadId,
    "",
    0,
    "",
    confirmation
  ]);
  return { logged: true, row: sheet.getLastRow(), leadId: leadId };
}

function logToSheet(data, subject, delivery) {
  var ss = getLeadSpreadsheet();

  var sheet = ss.getSheetByName("Leads");
  if (!sheet) {
    sheet = ss.insertSheet("Leads");
    sheet.setFrozenRows(1);
  }

  var headers = [
    "Timestamp", "Subject", "Name", "Phone", "Email", "Service", "City",
    "Message", "Page URL", "Lead Source", "First Touch", "UTM Source",
    "UTM Campaign", "Session ID", "Form Name", "Email Status", "SMS Status",
    "Delivery Notes", "Address", "Budget", "Timeline", "Preferred Contact",
    "Quote Intent", "Photos", "Contact Consent", "Marketing Opt-In",
    "Sales Rep", "Affiliate ID", "Rep Phone", "Rep Email", "Routing Lane",
    "Lead ID", "Lead Type", "Lead Score", "Priority", "Urgency", "Spam Risk",
    "AI Summary", "Recommended Next Step", "Suggested Reply", "Missing Fields",
    "Qualification Mode", "Customer Confirmation", "Follow Up Board",
    "Review Rating", "Permission to Publish", "Genuine Review Confirmation",
    "Review Status"
  ];
  ensureSheetColumnCapacity(sheet, headers.length);
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  if (headerRange.getValues()[0].join("|") !== headers.join("|")) {
    headerRange.setValues([headers]).setFontWeight("bold");
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 160);  // Timestamp
    sheet.setColumnWidth(2, 420);  // Subject
    sheet.setColumnWidth(8, 520);  // Message
    sheet.setColumnWidth(9, 300);  // Page URL
    sheet.setColumnWidth(18, 320); // Delivery notes
    sheet.setColumnWidth(19, 260); // Address
    sheet.setColumnWidth(38, 420); // AI summary
    sheet.setColumnWidth(39, 420); // Recommended next step
    sheet.setColumnWidth(40, 520); // Suggested reply
  }

  delivery = delivery || {};
  var emailStatus = delivery.email && delivery.email.sent ? "sent" : "failed";
  var smsStatus = "not configured";
  if (delivery.sms && delivery.sms.sent) smsStatus = "sent";
  else if (delivery.sms && delivery.sms.configured) smsStatus = "failed";
  var deliveryNotes = (delivery.errors || []).join(" | ").substring(0, 500);
  var confirmationStatus = delivery.confirmation && delivery.confirmation.sent ? "sent" :
    (delivery.confirmation ? delivery.confirmation.reason || "not sent" : "not checked");
  var boardStatus = delivery.followUpBoard && delivery.followUpBoard.logged ? "logged" :
    (delivery.followUpBoard && delivery.followUpBoard.duplicate ? "duplicate" :
    (delivery.followUpBoard ? delivery.followUpBoard.reason || "not logged" : "not checked"));
  var lead = normalizedLead(data);
  var phone = lead.phone === "Not entered" ? "" : lead.phone;
  var email = lead.email === "Not entered" ? "" : lead.email;
  var service = lead.service === "Not selected" ? "" : lead.service;
  var city = lead.city === "Not entered" ? "" : lead.city;
  var budget = lead.budget === "Not entered" ? "" : lead.budget;
  var timeline = lead.timeline === "Not entered" ? "" : lead.timeline;
  var contactMethod = lead.contactMethod === "Not entered" ? "" : lead.contactMethod;
  var quoteIntent = lead.quoteIntent === "Not entered" ? "" : lead.quoteIntent;
  var photos = lead.photos === "Not entered" ? "" : lead.photos;

  sheet.appendRow([
    new Date(),
    subject || "",
    lead.name === "Name not entered" ? "" : lead.name,
    phone,
    email,
    service,
    city,
    lead.description === "No description entered." ? "" : lead.description.substring(0, 5000),
    lead.pageUrl,
    lead.source,
    lead.firstTouch,
    lead.utmSource,
    lead.utmCampaign,
    lead.sessionId === "n/a" ? "" : lead.sessionId,
    lead.formName === "Unknown form" ? "" : lead.formName,
    emailStatus,
    smsStatus,
    deliveryNotes,
    lead.address,
    budget,
    timeline,
    contactMethod,
    quoteIntent,
    photos,
    lead.contactConsent === "Not recorded" ? "" : lead.contactConsent,
    lead.marketingConsent,
    lead.salesRep,
    lead.affiliateId,
    lead.representativePhone,
    lead.representativeEmail,
    lead.routingLane,
    lead.leadId,
    lead.leadType,
    lead.leadScore,
    lead.priority,
    lead.urgency,
    lead.spamRisk,
    lead.aiSummary,
    lead.nextStep,
    lead.suggestedReply,
    lead.missingFields,
    lead.qualificationMode,
    confirmationStatus,
    boardStatus,
    lead.reviewRating,
    lead.reviewPermission,
    lead.reviewAuthenticity,
    lead.reviewStatus
  ]);
}

function ensureSheetColumnCapacity(sheet, requiredColumns) {
  var currentColumns = sheet.getMaxColumns();
  if (currentColumns < requiredColumns) {
    sheet.insertColumnsAfter(currentColumns, requiredColumns - currentColumns);
  }
}

function parseBoardDate(value) {
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) return value;
  var parsed = new Date(String(value || ""));
  return isNaN(parsed.getTime()) ? null : parsed;
}

function sendUncontactedLeadAlerts() {
  var sheet = ensureFollowUpBoard();
  if (sheet.getLastRow() < 2) return { ok: true, reminders: 0, reason: "no-leads" };
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 18).getValues();
  var now = new Date();
  var thresholds = [CONFIG.followUpReminderMinutes, 240, 1440];
  var due = [];

  values.forEach(function(row, index) {
    var status = String(row[8] || "").trim().toLowerCase();
    var billTextSent = String(row[10] || "").trim().toLowerCase();
    var reminderCount = Math.max(0, parseInt(row[15] || 0, 10) || 0);
    var received = parseBoardDate(row[0]);
    var leadId = String(row[13] || "");
    if (status !== "new" || billTextSent === "yes" || !received || reminderCount >= thresholds.length || leadId.indexOf("web:") !== 0) return;
    var ageMinutes = (now.getTime() - received.getTime()) / 60000;
    if (ageMinutes < thresholds[reminderCount]) return;
    due.push({
      rowNumber: index + 2,
      reminderCount: reminderCount,
      name: String(row[1] || "Name not entered"),
      phone: String(row[2] || "No phone"),
      email: String(row[3] || ""),
      city: String(row[4] || "Metro East"),
      service: String(row[5] || "Project"),
      summary: String(row[6] || ""),
      priority: String(row[9] || "Low"),
      nextStep: String(row[11] || "Call or text the homeowner."),
      leadId: leadId
    });
  });

  if (!due.length) return { ok: true, reminders: 0, reason: "none-due" };
  var plain = ["ALL-PRO FOLLOW-UP NEEDED", "========================", ""];
  var cards = [];
  due.forEach(function(lead) {
    plain.push(
      lead.priority + " priority: " + lead.name,
      lead.phone + (lead.email ? " | " + lead.email : ""),
      lead.service + " | " + lead.city,
      lead.summary,
      "Next: " + lead.nextStep,
      "Lead ID: " + lead.leadId,
      ""
    );
    cards.push(
      '<div style="margin:0 0 14px;padding:16px;border:1px solid #dfe5e2;border-left:6px solid #c96a26;background:#ffffff;">' +
      '<div style="font-size:12px;font-weight:900;color:#c96a26;">' + escapeEmailHtml(lead.priority.toUpperCase()) + ' PRIORITY</div>' +
      '<div style="margin-top:4px;font-size:20px;font-weight:900;color:#1f2933;">' + escapeEmailHtml(lead.name) + '</div>' +
      '<div style="margin-top:4px;font-weight:800;color:#2f5d50;">' + escapeEmailHtml(lead.phone) + '</div>' +
      '<div style="margin-top:8px;"><strong>' + escapeEmailHtml(lead.service) + '</strong> · ' + escapeEmailHtml(lead.city) + '</div>' +
      '<div style="margin-top:8px;line-height:1.5;">' + multilineEmailHtml(lead.summary) + '</div>' +
      '<div style="margin-top:10px;padding:10px;background:#f7f3ea;"><strong>Next:</strong> ' + multilineEmailHtml(lead.nextStep) + '</div>' +
      '</div>'
    );
  });
  var html = '<!doctype html><html><body style="margin:0;padding:20px;background:#f3f5f4;font-family:Arial,Helvetica,sans-serif;color:#1f2933;">' +
    '<div style="max-width:680px;margin:0 auto;"><h1 style="font-size:24px;">Follow-up needed</h1>' +
    '<p>These leads are still marked <strong>New</strong> and <strong>Bill Text Sent? = No</strong>.</p>' + cards.join("") +
    '<p style="font-size:13px;color:#5f6b66;">Update the Follow Up Board after contact to stop reminders.</p></div></body></html>';
  MailApp.sendEmail({
    to: CONFIG.leadEmail,
    cc: CONFIG.ownerEmail,
    subject: "FOLLOW-UP NEEDED · " + due.length + " NEW ALL-PRO LEAD" + (due.length === 1 ? "" : "S"),
    body: plain.join("\n"),
    htmlBody: html,
    name: "All-Pro Lead Follow-Up"
  });
  due.forEach(function(lead) {
    sheet.getRange(lead.rowNumber, 15).setValue(now);
    sheet.getRange(lead.rowNumber, 16).setValue(lead.reminderCount + 1);
  });
  return { ok: true, reminders: due.length };
}

function sendReviewRequestEmail(name, email, service, city) {
  var firstName = String(name || "there").split(/\s+/)[0];
  var context = [service, city].filter(function(value) { return Boolean(value); }).join(" in ");
  var body = [
    "Hi " + firstName + ",",
    "",
    "Thank you for choosing All-Pro" + (context ? " for your " + context + " project" : "") + ".",
    "If you have a moment, please share an honest review of your experience:",
    CONFIG.reviewUrl,
    "",
    "Your feedback helps local homeowners make a more informed choice.",
    "",
    "All-Pro Construction & Landscape",
    "618-581-0676"
  ].join("\n");
  var html = '<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#1f2933;line-height:1.6;">' +
    '<div style="max-width:600px;margin:0 auto;padding:24px;border:1px solid #dfe5e2;">' +
    '<h1 style="font-size:24px;">Thank you for choosing All-Pro</h1>' +
    '<p>Hi ' + escapeEmailHtml(firstName) + ',</p><p>We appreciate the opportunity to help with your project.</p>' +
    '<p>Please share an honest review of your experience. Your feedback helps other Metro East homeowners make an informed choice.</p>' +
    '<p><a href="' + escapeEmailHtml(CONFIG.reviewUrl) + '" style="display:inline-block;padding:13px 18px;background:#c96a26;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:800;">Write an All-Pro review</a></p>' +
    '<p style="font-size:13px;color:#5f6b66;">This request does not require a positive review. Please share your genuine experience.</p>' +
    '</div></body></html>';
  MailApp.sendEmail({
    to: email,
    subject: "Would you share your All-Pro experience?",
    body: body,
    htmlBody: html,
    name: "All-Pro Customer Care",
    replyTo: CONFIG.ownerEmail
  });
}

function sendPendingReviewRequests() {
  var sheet = ensureFollowUpBoard();
  if (sheet.getLastRow() < 2) return { ok: true, sent: 0, reason: "no-leads" };
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 18).getValues();
  var sent = 0;
  var errors = [];
  values.forEach(function(row, index) {
    var status = String(row[8] || "").trim().toLowerCase();
    var reviewStatus = String(row[16] || "").trim().toLowerCase();
    var email = String(row[3] || "").trim();
    if (status !== "won" || reviewStatus !== "ready" || !isValidLeadEmail(email)) return;
    try {
      sendReviewRequestEmail(row[1], email, row[5], row[4]);
      sheet.getRange(index + 2, 17).setValue("Sent " + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "M/d/yyyy h:mm a"));
      sent++;
    } catch (err) {
      errors.push("row " + (index + 2) + ": " + safeError(err));
    }
  });
  return { ok: errors.length === 0, sent: sent, errors: errors };
}

function incrementCount(map, value) {
  var key = String(value || "Unknown").trim() || "Unknown";
  map[key] = (map[key] || 0) + 1;
}

function topCounts(map, limit) {
  return Object.keys(map).map(function(key) { return [key, map[key]]; })
    .sort(function(a, b) { return b[1] - a[1]; })
    .slice(0, limit || 5);
}

function searchConsoleSetupStatus() {
  var siteUrl = String(PropertiesService.getScriptProperties().getProperty("SEARCH_CONSOLE_SITE_URL") || "").trim();
  return {
    configured: Boolean(siteUrl),
    siteUrl: siteUrl,
    requiredScope: "https://www.googleapis.com/auth/webmasters.readonly"
  };
}

function configureSearchConsoleDomainProperty() {
  PropertiesService.getScriptProperties().setProperty(
    "SEARCH_CONSOLE_SITE_URL",
    "sc-domain:allprometroeastconstruction.com"
  );
  return searchConsoleSetupStatus();
}

function authorizeSearchConsole() {
  var scope = "https://www.googleapis.com/auth/webmasters.readonly";
  ScriptApp.requireScopes(ScriptApp.AuthMode.FULL, [scope]);
  return { ok: true, authorizedScope: scope, setup: searchConsoleSetupStatus() };
}

function fetchSearchConsoleSummary(days) {
  var setup = searchConsoleSetupStatus();
  if (!setup.configured) return { configured: false, rows: [], note: "SEARCH_CONSOLE_SITE_URL is not set" };
  var lagDays = 3;
  var endDate = new Date(Date.now() - lagDays * 86400000);
  var startDate = new Date(endDate.getTime() - Math.max(days || 7, 1) * 86400000);
  var timezone = Session.getScriptTimeZone();
  var endpoint = "https://www.googleapis.com/webmasters/v3/sites/" +
    encodeURIComponent(setup.siteUrl) + "/searchAnalytics/query";
  var response = UrlFetchApp.fetch(endpoint, {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    payload: JSON.stringify({
      startDate: Utilities.formatDate(startDate, timezone, "yyyy-MM-dd"),
      endDate: Utilities.formatDate(endDate, timezone, "yyyy-MM-dd"),
      dimensions: ["query"],
      rowLimit: 10,
      dataState: "final"
    }),
    muteHttpExceptions: true
  });
  var code = response.getResponseCode();
  var payload = {};
  try { payload = JSON.parse(response.getContentText()); } catch (_) {}
  if (code < 200 || code >= 300) {
    throw new Error("Search Console API HTTP " + code + ": " + String(payload.error && payload.error.message || response.getContentText()).substring(0, 260));
  }
  return {
    configured: true,
    rows: (payload.rows || []).map(function(row) {
      return {
        query: row.keys && row.keys[0] || "",
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0
      };
    })
  };
}

function sendWeeklyLeadReport() {
  var sheet = ensureFollowUpBoard();
  var values = sheet.getLastRow() < 2 ? [] : sheet.getRange(2, 1, sheet.getLastRow() - 1, 18).getValues();
  var cutoff = Date.now() - 7 * 86400000;
  var weekly = values.filter(function(row) {
    var received = parseBoardDate(row[0]);
    return received && received.getTime() >= cutoff;
  });
  var services = {}, cities = {}, sources = {}, statuses = {};
  weekly.forEach(function(row) {
    incrementCount(cities, row[4]);
    incrementCount(services, row[5]);
    incrementCount(sources, row[7]);
    incrementCount(statuses, row[8]);
  });
  var search = { configured: false, rows: [], note: "not checked" };
  try { search = fetchSearchConsoleSummary(7); } catch (err) { search.note = safeError(err); }

  function listText(title, rows) {
    return [title].concat(rows.length ? rows.map(function(item) { return "- " + item[0] + ": " + item[1]; }) : ["- none"]).join("\n");
  }
  var plain = [
    "ALL-PRO WEEKLY LEAD REPORT",
    "==========================",
    "New board entries: " + weekly.length,
    "",
    listText("Top services", topCounts(services, 5)),
    "",
    listText("Top cities", topCounts(cities, 5)),
    "",
    listText("Top sources", topCounts(sources, 5)),
    "",
    listText("Lead status", topCounts(statuses, 10))
  ];
  if (search.rows.length) {
    plain.push("", "Top Google queries");
    search.rows.forEach(function(row) {
      plain.push("- " + row.query + ": " + row.clicks + " clicks, " + row.impressions + " impressions, position " + row.position.toFixed(1));
    });
  } else {
    plain.push("", "Search Console: " + (search.note || "No query data returned"));
  }
  MailApp.sendEmail({
    to: CONFIG.ownerEmail,
    cc: CONFIG.leadEmail,
    subject: "All-Pro weekly lead scorecard · " + weekly.length + " new entries",
    body: plain.join("\n"),
    name: "All-Pro Lead Engine"
  });
  return { ok: true, leads: weekly.length, searchConsole: search.configured, searchRows: search.rows.length };
}

function leadDigestCell(row, headers, label) {
  var index = headerPosition(headers, label);
  return index > -1 ? row[index] : "";
}

function leadDeliveryIssueLabels(record) {
  var issues = [];
  var emailStatus = String(record.emailStatus || "").trim().toLowerCase();
  var smsStatus = String(record.smsStatus || "").trim().toLowerCase();
  var confirmationStatus = String(record.confirmationStatus || "").trim().toLowerCase();
  var boardStatus = String(record.boardStatus || "").trim().toLowerCase();
  if (emailStatus !== "sent") issues.push("owner email: " + (emailStatus || "missing status"));
  if (smsStatus === "failed") issues.push("SMS: failed");
  if (record.email && confirmationStatus !== "sent") {
    issues.push("customer confirmation: " + (confirmationStatus || "missing status"));
  }
  if (boardStatus !== "logged" && boardStatus !== "duplicate") {
    issues.push("follow-up board: " + (boardStatus || "missing status"));
  }
  if (record.deliveryNotes) issues.push("delivery notes: " + String(record.deliveryNotes).substring(0, 180));
  return issues;
}

function recentLeadDeliveryRecords(hoursBack) {
  var sheet = getLeadSpreadsheet().getSheetByName("Leads");
  if (!sheet || sheet.getLastRow() < 2) return [];
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  var cutoff = Date.now() - Math.max(1, Number(hoursBack) || 24) * 3600000;
  return rows.map(function(row, index) {
    var received = parseBoardDate(leadDigestCell(row, headers, "Timestamp"));
    if (!received || received.getTime() < cutoff) return null;
    var record = {
      rowNumber: index + 2,
      received: received,
      name: String(leadDigestCell(row, headers, "Name") || "Name not entered"),
      phone: String(leadDigestCell(row, headers, "Phone") || "Not entered"),
      email: String(leadDigestCell(row, headers, "Email") || ""),
      service: String(leadDigestCell(row, headers, "Service") || "Not selected"),
      city: String(leadDigestCell(row, headers, "City") || "Not entered"),
      leadId: String(leadDigestCell(row, headers, "Lead ID") || ""),
      emailStatus: String(leadDigestCell(row, headers, "Email Status") || ""),
      smsStatus: String(leadDigestCell(row, headers, "SMS Status") || ""),
      deliveryNotes: String(leadDigestCell(row, headers, "Delivery Notes") || ""),
      confirmationStatus: String(leadDigestCell(row, headers, "Customer Confirmation") || ""),
      boardStatus: String(leadDigestCell(row, headers, "Follow Up Board") || "")
    };
    record.issues = leadDeliveryIssueLabels(record);
    return record;
  }).filter(function(record) { return Boolean(record); });
}

function formatLeadDigestDate(value) {
  return Utilities.formatDate(value, Session.getScriptTimeZone(), "M/d/yyyy h:mm a");
}

function sendDailyLeadHealthDigest() {
  var records = recentLeadDeliveryRecords(24);
  var problemRecords = records.filter(function(record) { return record.issues.length > 0; });
  var quota = MailApp.getRemainingDailyQuota();
  var sheetUrl = "https://docs.google.com/spreadsheets/d/1xcc0xo4UeN3EaZUMNn_qFJ-xgX6ZPg7l7sTMSLsT6GE/edit";
  var subjectPrefix = problemRecords.length ? "[ACTION NEEDED] " : "";
  var subject = subjectPrefix + "All-Pro daily lead check: " + records.length + " lead" + (records.length === 1 ? "" : "s") + ", " + problemRecords.length + " delivery issue" + (problemRecords.length === 1 ? "" : "s");
  var plain = [
    "ALL-PRO DAILY LEAD CHECK",
    "========================",
    "Window: previous 24 hours",
    "Leads logged: " + records.length,
    "Delivery issues: " + problemRecords.length,
    "Mail quota remaining before this digest: " + quota,
    "Lead Sheet: " + sheetUrl,
    ""
  ];
  if (!records.length) plain.push("No website leads were logged in the previous 24 hours.");
  records.forEach(function(record, index) {
    plain.push(
      (index + 1) + ". " + record.name + " | " + record.service + " | " + record.city,
      "   Received: " + formatLeadDigestDate(record.received),
      "   Phone: " + record.phone + (record.email ? " | Email: " + record.email : ""),
      "   Delivery: " + (record.issues.length ? record.issues.join("; ") : "email, confirmation and follow-up logging passed"),
      ""
    );
  });

  var leadRows = records.map(function(record) {
    var issueText = record.issues.length ? escapeEmailHtml(record.issues.join("; ")) : "All recorded delivery checks passed";
    var issueColor = record.issues.length ? "#8a2d1b" : "#2f5d50";
    return '<tr><td style="padding:14px;border-top:1px solid #dfe5e2;vertical-align:top;"><strong>' + escapeEmailHtml(record.name) + '</strong><br>' + escapeEmailHtml(record.service) + ' in ' + escapeEmailHtml(record.city) + '<br><span style="color:#52606d;">' + escapeEmailHtml(formatLeadDigestDate(record.received)) + '</span></td><td style="padding:14px;border-top:1px solid #dfe5e2;vertical-align:top;">' + escapeEmailHtml(record.phone) + (record.email ? '<br><a href="mailto:' + escapeEmailHtml(record.email) + '" style="color:#2f5d50;">' + escapeEmailHtml(record.email) + '</a>' : '') + '</td><td style="padding:14px;border-top:1px solid #dfe5e2;vertical-align:top;color:' + issueColor + ';font-weight:700;">' + issueText + '</td></tr>';
  }).join("");
  if (!leadRows) leadRows = '<tr><td colspan="3" style="padding:18px;border-top:1px solid #dfe5e2;">No website leads were logged in the previous 24 hours.</td></tr>';
  var html = '<!doctype html><html><body style="margin:0;background:#f3f5f4;font-family:Arial,Helvetica,sans-serif;color:#1f2933;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:20px 10px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:760px;background:#fff;border:1px solid #dfe5e2;"><tr><td style="padding:22px;background:#1f2933;color:#fff;"><div style="font-size:12px;font-weight:800;color:#f2b27d;">ALL-PRO OPERATIONS</div><h1 style="margin:6px 0 0;font-size:26px;letter-spacing:0;">Daily lead health check</h1></td></tr><tr><td style="padding:20px;"><p style="margin:0 0 18px;font-size:17px;"><strong>' + records.length + '</strong> lead(s) logged and <strong style="color:' + (problemRecords.length ? '#8a2d1b' : '#2f5d50') + ';">' + problemRecords.length + '</strong> delivery issue(s) in the previous 24 hours.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #dfe5e2;border-collapse:collapse;"><thead><tr style="background:#f7f3ea;text-align:left;"><th style="padding:12px;">Lead</th><th style="padding:12px;">Contact</th><th style="padding:12px;">Delivery</th></tr></thead><tbody>' + leadRows + '</tbody></table><p style="margin:20px 0 0;"><a href="' + sheetUrl + '" style="display:inline-block;padding:13px 18px;background:#c96a26;color:#fff;text-decoration:none;font-weight:800;border-radius:5px;">Open All-Pro Leads</a></p><p style="color:#52606d;font-size:13px;">Mail quota remaining before this digest: ' + quota + '.</p></td></tr></table></td></tr></table></body></html>';
  MailApp.sendEmail({
    to: CONFIG.ownerEmail,
    cc: CONFIG.leadEmail,
    subject: subject,
    body: plain.join("\n"),
    htmlBody: html,
    name: "All-Pro Lead Monitor"
  });
  PropertiesService.getScriptProperties().setProperty("LAST_DAILY_LEAD_HEALTH_AT", new Date().toISOString());
  return { ok: problemRecords.length === 0, leads: records.length, issues: problemRecords.length, quotaBeforeSend: quota };
}

function installLeadAutomationTriggers() {
  var handlers = ["sendUncontactedLeadAlerts", "sendPendingReviewRequests", "sendWeeklyLeadReport", "processMarketingOptOutReplies", "sendDailyLeadHealthDigest"];
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (handlers.indexOf(trigger.getHandlerFunction()) > -1) ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger("sendUncontactedLeadAlerts").timeBased().everyHours(1).create();
  ScriptApp.newTrigger("sendPendingReviewRequests").timeBased().everyDays(1).atHour(9).create();
  ScriptApp.newTrigger("sendWeeklyLeadReport").timeBased().onWeekDay(ScriptApp.WeekDay.FRIDAY).atHour(8).create();
  ScriptApp.newTrigger("processMarketingOptOutReplies").timeBased().everyDays(1).atHour(7).create();
  ScriptApp.newTrigger("sendDailyLeadHealthDigest").timeBased().everyDays(1).atHour(8).create();
  setupFollowUpBoard();
  return automationSetupStatus();
}

function automationSetupStatus() {
  return {
    ok: true,
    triggers: ScriptApp.getProjectTriggers().map(function(trigger) {
      return { handler: trigger.getHandlerFunction(), source: String(trigger.getTriggerSource()) };
    }),
    sms: smsSetupStatus(),
    searchConsole: searchConsoleSetupStatus(),
    followUpBoard: ensureFollowUpBoard().getName()
  };
}

function leadIntelligenceSelfTest() {
  var homeowner = {
    full_name: "Lead Intelligence Test",
    phone: "618-555-0100",
    email: "homeowner@example.com",
    service: "Kitchen remodel",
    city: "Belleville",
    timeline: "As soon as possible",
    budget_range: "$25,000 or more",
    details: "Complete kitchen update with cabinets, counters, flooring, lighting, and a better family layout.",
    estimate_contact_consent: "yes",
    lead_session_id: "self-test-homeowner"
  };
  var vendor = {
    full_name: "Vendor Test",
    email: "vendor@example.com",
    city: "Miami",
    service: "Other",
    details: "I noticed your website and can redesign it to get you more leads.",
    lead_session_id: "self-test-vendor"
  };
  applyLeadIntelligence(homeowner, false);
  applyLeadIntelligence(vendor, false);
  if (homeowner.lead_type !== "homeowner_project" || homeowner.ai_priority !== "Hot") {
    throw new Error("Homeowner intelligence self-test failed");
  }
  if (vendor.lead_type !== "vendor_sales") throw new Error("Vendor classification self-test failed");
  return { ok: true, homeowner: homeowner, vendor: vendor };
}

// -- Opt-in seasonal email campaign -----------------------------------------

var MARKETING_SUBSCRIBER_HEADERS = [
  "Subscriber ID", "Email", "First Name", "Full Name", "City", "Service Interest",
  "Source Sheet", "Source Row", "Consent Value", "Consent Recorded At", "Status",
  "Unsubscribed At", "Unsubscribe Reason", "Unsubscribe Token", "Last Campaign ID",
  "Last Sent At", "Send Count", "Last Error", "Notes", "Opt-Out Acknowledged At"
];

var MARKETING_LOG_HEADERS = [
  "Sent At", "Campaign ID", "Subscriber ID", "Email", "Status", "Subject", "Error"
];

function marketingSettings() {
  var properties = PropertiesService.getScriptProperties();
  var batchSize = parseInt(properties.getProperty("MARKETING_BATCH_SIZE") || "5", 10);
  if (isNaN(batchSize)) batchSize = 5;
  return {
    enabled: String(properties.getProperty("MARKETING_SEND_ENABLED") || "false").toLowerCase() === "true",
    batchSize: Math.max(1, Math.min(batchSize, 25)),
    postalAddress: String(properties.getProperty("MARKETING_POSTAL_ADDRESS") || "").trim(),
    campaignId: String(properties.getProperty("MARKETING_CAMPAIGN_ID") || "seasonal-project-planning-2026-07").trim(),
    senderName: "All-Pro Construction & Landscape",
    estimateUrl: CONFIG.siteOrigin + "/get-quote.html",
    guideUrl: CONFIG.siteOrigin + "/metro-east-home-service-guide.html",
    phone: "618-581-0676"
  };
}

function ensureMarketingSheet(name, headers) {
  var ss = getLeadSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    ensureSheetColumnCapacity(sheet, headers.length);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
    sheet.setFrozenRows(1);
  } else {
    ensureSheetColumnCapacity(sheet, headers.length);
    var current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    var hasHeader = current.some(function(value) { return String(value || "").trim() !== ""; });
    if (!hasHeader) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
      sheet.setFrozenRows(1);
    } else if (current.join("|") !== headers.join("|")) {
      throw new Error(name + " headers do not match the approved campaign layout. No data was changed.");
    }
  }
  return sheet;
}

function ensureMarketingSubscriberSheet() {
  var sheet = ensureMarketingSheet("Marketing Subscribers", MARKETING_SUBSCRIBER_HEADERS);
  sheet.setColumnWidth(2, 240);
  sheet.setColumnWidth(4, 220);
  sheet.setColumnWidth(6, 220);
  sheet.setColumnWidth(13, 240);
  sheet.setColumnWidth(18, 300);
  var maxRows = Math.max(sheet.getMaxRows() - 1, 1);
  var statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Active", "Unsubscribed", "Suppressed", "Invalid"], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 11, maxRows, 1).setDataValidation(statusRule);
  return sheet;
}

function ensureMarketingLogSheet() {
  var sheet = ensureMarketingSheet("Marketing Campaign Log", MARKETING_LOG_HEADERS);
  sheet.setColumnWidth(2, 240);
  sheet.setColumnWidth(4, 240);
  sheet.setColumnWidth(6, 360);
  sheet.setColumnWidth(7, 320);
  return sheet;
}

function headerPosition(headers, label) {
  for (var i = 0; i < headers.length; i++) {
    if (String(headers[i] || "").trim().toLowerCase() === String(label).trim().toLowerCase()) return i;
  }
  return -1;
}

function safeMarketingCellText(value, maxLength) {
  var text = String(value === undefined || value === null ? "" : value).trim();
  if (maxLength && text.length > maxLength) text = text.substring(0, maxLength);
  if (/^[=+\-@]/.test(text)) text = "'" + text;
  return text;
}

function normalizeMarketingEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function marketingSubscriberId(email) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, normalizeMarketingEmail(email), Utilities.Charset.UTF_8);
  var hex = bytes.map(function(value) {
    var normalized = value < 0 ? value + 256 : value;
    return ("0" + normalized.toString(16)).slice(-2);
  }).join("");
  return "subscriber:" + hex.substring(0, 24);
}

function syncMarketingSubscribers() {
  var ss = getLeadSpreadsheet();
  var source = ss.getSheetByName("Leads");
  if (!source || source.getLastRow() < 2) return { ok: true, added: 0, refreshed: 0, eligibleSourceRows: 0 };
  var sourceHeaders = source.getRange(1, 1, 1, source.getLastColumn()).getValues()[0];
  var emailColumn = headerPosition(sourceHeaders, "Email");
  var consentColumn = headerPosition(sourceHeaders, "Marketing Opt-In");
  if (emailColumn < 0 || consentColumn < 0) throw new Error("Leads must contain Email and Marketing Opt-In columns.");

  var nameColumn = headerPosition(sourceHeaders, "Name");
  var cityColumn = headerPosition(sourceHeaders, "City");
  var serviceColumn = headerPosition(sourceHeaders, "Service");
  var timestampColumn = headerPosition(sourceHeaders, "Timestamp");
  var rows = source.getRange(2, 1, source.getLastRow() - 1, source.getLastColumn()).getValues();
  var subscribers = ensureMarketingSubscriberSheet();
  var existingValues = subscribers.getLastRow() < 2 ? [] : subscribers.getRange(2, 1, subscribers.getLastRow() - 1, MARKETING_SUBSCRIBER_HEADERS.length).getValues();
  var byEmail = {};
  existingValues.forEach(function(row, index) {
    var email = normalizeMarketingEmail(row[1]);
    if (email) byEmail[email] = { rowNumber: index + 2, values: row };
  });

  var added = 0;
  var refreshed = 0;
  var eligibleSourceRows = 0;
  rows.forEach(function(row, index) {
    var email = normalizeMarketingEmail(row[emailColumn]);
    var consent = row[consentColumn];
    if (!hasRecordedConsent(consent) || !isValidLeadEmail(email)) return;
    eligibleSourceRows++;
    var fullName = nameColumn > -1 ? safeMarketingCellText(row[nameColumn], 160) : "";
    var firstName = fullName ? fullName.split(/\s+/)[0] : "there";
    var city = cityColumn > -1 ? safeMarketingCellText(row[cityColumn], 120) : "";
    var service = serviceColumn > -1 ? safeMarketingCellText(row[serviceColumn], 180) : "";
    var consentAt = timestampColumn > -1 ? row[timestampColumn] : "";
    var existing = byEmail[email];
    if (existing) {
      subscribers.getRange(existing.rowNumber, 3, 1, 8).setValues([[
        firstName, fullName, city, service, "Leads", index + 2, String(consent), consentAt
      ]]);
      refreshed++;
      return;
    }
    var token = Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
    subscribers.appendRow([
      marketingSubscriberId(email), email, firstName, fullName, city, service,
      "Leads", index + 2, String(consent), consentAt, "Active", "", "", token,
      "", "", 0, "", "Imported from an explicit website marketing opt-in", ""
    ]);
    byEmail[email] = { rowNumber: subscribers.getLastRow() };
    added++;
  });
  return { ok: true, added: added, refreshed: refreshed, eligibleSourceRows: eligibleSourceRows };
}

function setupMarketingCampaignSystem() {
  ensureMarketingSubscriberSheet();
  ensureMarketingLogSheet();
  var sync = syncMarketingSubscribers();
  return { ok: true, sync: sync, settings: marketingSetupStatus() };
}

function marketingRowToRecord(row, rowNumber) {
  return {
    rowNumber: rowNumber,
    subscriberId: String(row[0] || ""),
    email: normalizeMarketingEmail(row[1]),
    firstName: String(row[2] || "there").trim() || "there",
    fullName: String(row[3] || ""),
    city: String(row[4] || ""),
    service: String(row[5] || ""),
    sourceSheet: String(row[6] || ""),
    sourceRow: parseInt(row[7] || 0, 10) || 0,
    consentValue: String(row[8] || ""),
    status: String(row[10] || ""),
    token: String(row[13] || ""),
    lastCampaignId: String(row[14] || ""),
    sendCount: parseInt(row[16] || 0, 10) || 0,
    acknowledgedAt: row[19] || ""
  };
}

function isMarketingSubscriberEligible(record, campaignId) {
  return Boolean(
    record &&
    isValidLeadEmail(record.email) &&
    hasRecordedConsent(record.consentValue) &&
    String(record.status || "").toLowerCase() === "active" &&
    record.token &&
    String(record.lastCampaignId || "") !== String(campaignId || "")
  );
}

function maskMarketingEmail(email) {
  var parts = normalizeMarketingEmail(email).split("@");
  if (parts.length !== 2) return "invalid";
  var local = parts[0];
  return local.substring(0, Math.min(2, local.length)) + "***@" + parts[1];
}

function marketingSetupStatus() {
  var settings = marketingSettings();
  var sheet = ensureMarketingSubscriberSheet();
  var values = sheet.getLastRow() < 2 ? [] : sheet.getRange(2, 1, sheet.getLastRow() - 1, MARKETING_SUBSCRIBER_HEADERS.length).getValues();
  var eligible = values.map(function(row, index) { return marketingRowToRecord(row, index + 2); })
    .filter(function(record) { return isMarketingSubscriberEligible(record, settings.campaignId); });
  return {
    enabled: settings.enabled,
    batchSize: settings.batchSize,
    postalAddressConfigured: Boolean(settings.postalAddress),
    webAppUrlConfigured: Boolean(ScriptApp.getService().getUrl()),
    campaignId: settings.campaignId,
    eligibleCount: eligible.length,
    eligible: eligible.slice(0, 25).map(function(record) { return maskMarketingEmail(record.email); }),
    mailQuotaRemaining: MailApp.getRemainingDailyQuota()
  };
}

function previewSeasonalCampaign() {
  syncMarketingSubscribers();
  return marketingSetupStatus();
}

function buildSeasonalMarketingEmail(record, settings, unsubscribeUrl) {
  var firstName = String(record.firstName || "there").trim() || "there";
  var subject = "Planning a cleanup or indoor project this year?";
  var plain = [
    "Hi " + firstName + ",",
    "",
    "This is an advertisement from All-Pro Construction & Landscape.",
    "",
    "If you are planning a last-minute property cleanup, fall or winter work, or an indoor kitchen, bathroom, or repair project, we would be glad to help you sort out the next step and see where the work may fit on our schedule.",
    "",
    "Free project consultation:",
    "- Talk by phone",
    "- Schedule an on-site conversation",
    "- Reply with photos and questions about the property",
    "",
    "Request an estimate: " + settings.estimateUrl,
    "Read our homeowner project guide: " + settings.guideUrl,
    "Call All-Pro: " + settings.phone,
    "",
    "All-Pro Construction & Landscape",
    settings.postalAddress,
    "",
    "Unsubscribe: " + unsubscribeUrl,
    "You can also reply REMOVE and we will suppress future marketing email."
  ].join("\n");
  var html = '<!doctype html><html><body style="margin:0;padding:0;background:#f3f5f4;font-family:Arial,Helvetica,sans-serif;color:#1f2933;">' +
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Free project consultation for seasonal cleanup, remodeling, and repairs.</div>' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f5f4;"><tr><td align="center" style="padding:24px 12px;">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #dfe5e2;">' +
    '<tr><td style="padding:10px 24px;background:#1f2933;color:#ffffff;font-size:12px;font-weight:700;">ADVERTISEMENT FROM ALL-PRO CONSTRUCTION &amp; LANDSCAPE</td></tr>' +
    '<tr><td style="padding:30px 24px 18px;"><div style="font-size:13px;font-weight:800;color:#2f5d50;">METRO EAST PROJECT PLANNING</div>' +
    '<h1 style="margin:8px 0 14px;font-size:30px;line-height:1.15;letter-spacing:0;">Need help planning the next project?</h1>' +
    '<p style="margin:0 0 16px;line-height:1.65;">Hi ' + escapeEmailHtml(firstName) + ',</p>' +
    '<p style="margin:0 0 16px;line-height:1.65;">If you are considering a last-minute property cleanup, fall or winter work, or an indoor kitchen, bathroom, or repair project, All-Pro can help you sort out the scope and see where it may fit on the schedule.</p>' +
    '<div style="margin:22px 0;padding:18px;border-left:5px solid #2f5d50;background:#f7f3ea;"><strong>Free project consultation</strong><br><span style="line-height:1.65;">Talk by phone, meet at the property, or reply with photos and questions. We will focus on the problem you want solved and the next useful step.</span></div>' +
    '<p style="margin:22px 0;"><a href="' + escapeEmailHtml(settings.estimateUrl) + '" style="display:inline-block;padding:14px 20px;background:#c96a26;color:#ffffff;text-decoration:none;font-weight:800;border-radius:5px;">Request a free estimate</a></p>' +
    '<p style="margin:0 0 10px;line-height:1.6;"><a href="' + escapeEmailHtml(settings.guideUrl) + '" style="color:#2f5d50;font-weight:800;">Read the Metro East homeowner project guide</a></p>' +
    '<p style="margin:0 0 22px;line-height:1.6;"><strong>Call:</strong> <a href="tel:6185810676" style="color:#2f5d50;">' + escapeEmailHtml(settings.phone) + '</a></p>' +
    '</td></tr><tr><td style="padding:22px 24px;background:#f7f3ea;color:#52606d;font-size:12px;line-height:1.6;">' +
    '<strong>All-Pro Construction &amp; Landscape</strong><br>' + escapeEmailHtml(settings.postalAddress) + '<br><br>' +
    'You received this because you opted in to occasional All-Pro project emails. ' +
    '<a href="' + escapeEmailHtml(unsubscribeUrl) + '" style="color:#2f5d50;font-weight:800;">Unsubscribe</a> or reply REMOVE.' +
    '</td></tr></table></td></tr></table></body></html>';
  return { subject: subject, plain: plain, html: html };
}

function requireMarketingSendReadiness(settings) {
  if (!settings.postalAddress) throw new Error("Set MARKETING_POSTAL_ADDRESS to a valid business postal address before sending.");
  var webAppUrl = String(ScriptApp.getService().getUrl() || "").trim();
  if (!webAppUrl) throw new Error("Deploy this Apps Script as a web app before sending so unsubscribe links work.");
  return webAppUrl;
}

function sendSeasonalCampaignTest() {
  var settings = marketingSettings();
  requireMarketingSendReadiness(settings);
  var content = buildSeasonalMarketingEmail(
    { firstName: "Tony" },
    settings,
    CONFIG.siteOrigin + "/privacy.html#marketing-email"
  );
  MailApp.sendEmail({
    to: CONFIG.ownerEmail,
    subject: "TEST - " + content.subject,
    body: content.plain,
    htmlBody: content.html,
    name: settings.senderName,
    replyTo: CONFIG.ownerEmail
  });
  return { ok: true, sentTo: CONFIG.ownerEmail, subject: "TEST - " + content.subject };
}

function appendMarketingLog(logSheet, values) {
  logSheet.appendRow(values.map(function(value) { return safeMarketingCellText(value, 1000); }));
}

function sendSeasonalCampaignBatch() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var settings = marketingSettings();
    if (!settings.enabled) return { ok: false, sent: 0, reason: "MARKETING_SEND_ENABLED is false" };
    var webAppUrl = requireMarketingSendReadiness(settings);
    var sync = syncMarketingSubscribers();
    var sheet = ensureMarketingSubscriberSheet();
    var log = ensureMarketingLogSheet();
    var values = sheet.getLastRow() < 2 ? [] : sheet.getRange(2, 1, sheet.getLastRow() - 1, MARKETING_SUBSCRIBER_HEADERS.length).getValues();
    var quota = MailApp.getRemainingDailyQuota();
    var maximum = Math.min(settings.batchSize, Math.max(0, quota - 10));
    if (maximum < 1) return { ok: false, sent: 0, reason: "Email quota reserve reached", quotaRemaining: quota };
    var sent = 0;
    var errors = [];
    for (var i = 0; i < values.length && sent < maximum; i++) {
      var record = marketingRowToRecord(values[i], i + 2);
      if (!isMarketingSubscriberEligible(record, settings.campaignId)) continue;
      var unsubscribeUrl = webAppUrl + "?action=unsubscribe&token=" + encodeURIComponent(record.token);
      var content = buildSeasonalMarketingEmail(record, settings, unsubscribeUrl);
      try {
        MailApp.sendEmail({
          to: record.email,
          subject: content.subject,
          body: content.plain,
          htmlBody: content.html,
          name: settings.senderName,
          replyTo: CONFIG.ownerEmail
        });
        var now = new Date();
        sheet.getRange(record.rowNumber, 15, 1, 4).setValues([[
          settings.campaignId, now, record.sendCount + 1, ""
        ]]);
        appendMarketingLog(log, [now, settings.campaignId, record.subscriberId, record.email, "sent", content.subject, ""]);
        sent++;
        Utilities.sleep(750);
      } catch (err) {
        var message = safeError(err);
        sheet.getRange(record.rowNumber, 18).setValue(message);
        appendMarketingLog(log, [new Date(), settings.campaignId, record.subscriberId, record.email, "failed", content.subject, message]);
        errors.push(maskMarketingEmail(record.email) + ": " + message);
      }
    }
    return { ok: errors.length === 0, sent: sent, errors: errors, sync: sync, quotaRemaining: MailApp.getRemainingDailyQuota() };
  } finally {
    lock.releaseLock();
  }
}

function updateSourceMarketingConsent(record, value) {
  if (!record.sourceSheet || record.sourceRow < 2) return;
  var ss = getLeadSpreadsheet();
  var source = ss.getSheetByName(record.sourceSheet);
  if (!source) return;
  var headers = source.getRange(1, 1, 1, source.getLastColumn()).getValues()[0];
  var consentColumn = headerPosition(headers, "Marketing Opt-In");
  if (consentColumn < 0) return;
  source.getRange(record.sourceRow, consentColumn + 1).setValue(value);
}

function suppressMarketingSubscriber(record, reason) {
  var sheet = ensureMarketingSubscriberSheet();
  var now = new Date();
  sheet.getRange(record.rowNumber, 11, 1, 3).setValues([["Unsubscribed", now, safeMarketingCellText(reason, 240)]]);
  updateSourceMarketingConsent(record, "No");
  record.status = "Unsubscribed";
  return record;
}

function marketingUnsubscribeHtml(title, message) {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>' +
    escapeEmailHtml(title) + '</title></head><body style="margin:0;background:#f7f3ea;color:#1f2933;font-family:Arial,Helvetica,sans-serif;"><main style="max-width:620px;margin:10vh auto;padding:30px;background:#fff;border:1px solid #dfe5e2;"><h1 style="font-size:30px;letter-spacing:0;">' +
    escapeEmailHtml(title) + '</h1><p style="font-size:17px;line-height:1.65;">' + escapeEmailHtml(message) + '</p><p><a href="' + CONFIG.siteOrigin + '" style="color:#2f5d50;font-weight:800;">Return to All-Pro</a></p></main></body></html>';
}

function handleMarketingUnsubscribe(params) {
  var token = String(params && params.token || "").trim();
  var generic = "Your request could not be verified. Reply REMOVE to the original email and we will take care of it.";
  if (!/^[a-f0-9]{48,160}$/i.test(token)) {
    return HtmlService.createHtmlOutput(marketingUnsubscribeHtml("Unsubscribe request", generic));
  }
  var sheet = ensureMarketingSubscriberSheet();
  if (sheet.getLastRow() < 2) return HtmlService.createHtmlOutput(marketingUnsubscribeHtml("Unsubscribe request", generic));
  var match = sheet.getRange(2, 14, sheet.getLastRow() - 1, 1).createTextFinder(token).matchEntireCell(true).findNext();
  if (!match) return HtmlService.createHtmlOutput(marketingUnsubscribeHtml("Unsubscribe request", generic));
  var rowNumber = match.getRow();
  var row = sheet.getRange(rowNumber, 1, 1, MARKETING_SUBSCRIBER_HEADERS.length).getValues()[0];
  var record = marketingRowToRecord(row, rowNumber);
  if (record.status.toLowerCase() !== "unsubscribed") suppressMarketingSubscriber(record, "Website unsubscribe link");
  return HtmlService.createHtmlOutput(marketingUnsubscribeHtml(
    "You are unsubscribed",
    "This email address has been removed from future All-Pro marketing messages. Estimate confirmations and direct replies about a project you request are separate."
  ));
}

function extractMarketingReplyText(body) {
  var text = String(body || "").replace(/\r/g, "");
  text = text.split(/\nOn .+wrote:\n|\n-{2,}\s*Original Message\s*-{2,}/i)[0];
  return text.trim().substring(0, 1000);
}

function isExplicitOptOutReply(body) {
  var text = extractMarketingReplyText(body).replace(/\s+/g, " ").trim();
  return /^(?:please\s+)?(?:unsubscribe|remove me|remove my email|take me off|stop|stop emails|no more emails|do not email me again|don't email me again)[.! ]*$/i.test(text);
}

function emailAddressFromHeader(value) {
  var match = String(value || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? normalizeMarketingEmail(match[0]) : "";
}

function sendMarketingOptOutApology(email) {
  MailApp.sendEmail({
    to: email,
    subject: "You have been removed from All-Pro emails",
    body: "We are sorry the message was not useful. Your email address has been removed from future All-Pro marketing messages.\n\nAll-Pro Construction & Landscape\n618-581-0676",
    name: "All-Pro Customer Care",
    replyTo: CONFIG.ownerEmail
  });
}

function processMarketingOptOutReplies() {
  var sheet = ensureMarketingSubscriberSheet();
  if (sheet.getLastRow() < 2) return { ok: true, removed: 0 };
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, MARKETING_SUBSCRIBER_HEADERS.length).getValues();
  var byEmail = {};
  values.forEach(function(row, index) {
    var record = marketingRowToRecord(row, index + 2);
    if (record.email) byEmail[record.email] = record;
  });
  var threads = GmailApp.search('in:inbox newer_than:30d {unsubscribe "remove me" "take me off" "stop emails" "no more emails"}', 0, 50);
  var removed = 0;
  threads.forEach(function(thread) {
    var messages = thread.getMessages();
    if (!messages.length) return;
    var message = messages[messages.length - 1];
    var email = emailAddressFromHeader(message.getFrom());
    var record = byEmail[email];
    if (!record || !isExplicitOptOutReply(message.getPlainBody())) return;
    if (record.status.toLowerCase() !== "unsubscribed") {
      suppressMarketingSubscriber(record, "Explicit email reply");
      removed++;
    }
    if (!record.acknowledgedAt) {
      sendMarketingOptOutApology(email);
      sheet.getRange(record.rowNumber, 20).setValue(new Date());
      record.acknowledgedAt = new Date();
    }
  });
  return { ok: true, removed: removed };
}

function safeError(err) {
  return String(err && err.message ? err.message : err || "unknown error")
    .replace(/[\r\n]+/g, " ")
    .substring(0, 240);
}

function jsonResponse(data, headers, statusCode) {
  var output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

function titleCase(str) {
  return str.replace(/\b\w/g, function(c) { return c.toUpperCase(); });
}
