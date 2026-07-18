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
  reviewUrl:   "https://allprometroeastconstruction.com/review.html",
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
function doGet() {
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
    applyLeadIntelligence(data, isReview);
    var subject  = buildSubject(data, isReview);

    var delivery = {
      email: { sent: false },
      sms: { sent: false, configured: false },
      confirmation: { sent: false, eligible: false },
      sheet: { logged: false },
      followUpBoard: { logged: false },
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
    qualificationMode: pickLeadValue(data, ["qualification_mode"], "deterministic")
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

  var projectRows = [
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
  var subject = "We received your All-Pro estimate request";
  var body = [
    "Hi " + (lead.name === "Name not entered" ? "there" : lead.name.split(/\s+/)[0]) + ",",
    "",
    "Thanks for contacting All-Pro about your " + lead.service + " project in " + lead.city + ".",
    representative + " will review the information you sent and contact you about the next step.",
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
    "Qualification Mode", "Customer Confirmation", "Follow Up Board"
  ];
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
    boardStatus
  ]);
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

function installLeadAutomationTriggers() {
  var handlers = ["sendUncontactedLeadAlerts", "sendPendingReviewRequests", "sendWeeklyLeadReport"];
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (handlers.indexOf(trigger.getHandlerFunction()) > -1) ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger("sendUncontactedLeadAlerts").timeBased().everyHours(1).create();
  ScriptApp.newTrigger("sendPendingReviewRequests").timeBased().everyDays(1).atHour(9).create();
  ScriptApp.newTrigger("sendWeeklyLeadReport").timeBased().onWeekDay(ScriptApp.WeekDay.FRIDAY).atHour(8).create();
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
