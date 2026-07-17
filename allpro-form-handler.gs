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
  thankYouUrl: "https://allprometroeastconstruction.com/thank-you.html?src=form"
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
    submission_time_local: new Date().toLocaleString()
  };
  var subject = buildSubject(data, false);
  sendLeadNotification(data, subject, false);
  var sms = sendSmsAlert(data);
  logToSheet(data, subject, {
    email: { sent: true },
    sms: sms
  });
  return { ok: true, subject: subject, sms: sms };
}

function deliveryDiagnostics() {
  return {
    ok: true,
    mailQuotaRemaining: MailApp.getRemainingDailyQuota(),
    sms: smsSetupStatus(),
    spreadsheetId: "1xcc0xo4UeN3EaZUMNn_qFJ-xgX6ZPg7l7sTMSLsT6GE",
    leadEmail: CONFIG.leadEmail,
    copyEmail: CONFIG.ownerEmail,
    affiliateRoutes: Object.keys(AFFILIATE_ROUTES)
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
    var subject  = buildSubject(data, isReview);

    var delivery = {
      email: { sent: false },
      sms: { sent: false, configured: false },
      sheet: { logged: false },
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

    if (!isReview) {
      try { delivery.sms = sendSmsAlert(data); } catch(smsErr) {
        console.warn("Lead SMS failed (non-fatal):", smsErr);
        delivery.errors.push("sms: " + safeError(smsErr));
      }
    }

    // Log to Sheet (non-fatal)
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
      delivery: delivery
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
  var prefix  = isReview ? "⭐ NEW ALL-PRO REVIEW" : (route ? "🚨 NEW " + route.name.toUpperCase() + " LEAD" : "🚨 NEW ALL-PRO LEAD");
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
    routingLane: route ? route.lane : pickLeadValue(data, ["routing_lane"], "")
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
    "Session ID: " + lead.sessionId
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
  var accent = isReview ? "#b45309" : "#c96a26";
  var header = isReview ? "NEW CUSTOMER REVIEW" : (lead.salesRep ? "NEW " + lead.salesRep.toUpperCase() + " LEAD" : "NEW WEBSITE LEAD");
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
    emailInfoRow("Session ID", lead.sessionId, false)
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
  var to = isReview ? CONFIG.reviewEmail : CONFIG.leadEmail;
  var cc = uniqueEmailCsv([CONFIG.ownerEmail, route ? route.email : ""], to);
  var options = {
    to: to,
    subject: subject,
    body: body,
    htmlBody: htmlBody,
    name: isReview ? "ALL-PRO REVIEW ALERT" : (route ? "ALL-PRO " + route.name.toUpperCase() + " LEAD ALERT" : "ALL-PRO NEW LEAD ALERT")
  };
  if (cc) options.cc = cc;
  if (replyTo) options.replyTo = replyTo;
  if (projectPhotoBlob) options.attachments = [projectPhotoBlob];
  MailApp.sendEmail(options);
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
  var name = data["name"] || data["full_name"] || "Unknown name";
  var phone = data["phone"] || "No phone";
  var service = data["service"] || data["service_needed"] || data["project"] || "Project not selected";
  var city = data["city"] || "City not entered";
  var form = data["form_name"] || data["page_path"] || "Website form";
  return [
    route ? "NEW ALL-PRO LEAD - " + route.name.toUpperCase() : "NEW ALL-PRO LEAD",
    name + " | " + phone,
    service + " | " + city,
    "Form: " + form
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

function logToSheet(data, subject, delivery) {
  var ss = null;
  // Use the known target spreadsheet ID first
  var TARGET_SHEET_ID = "1xcc0xo4UeN3EaZUMNn_qFJ-xgX6ZPg7l7sTMSLsT6GE";
  try { ss = SpreadsheetApp.openById(TARGET_SHEET_ID); } catch(_) {}

  if (!ss) {
    try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch(_) {}
  }
  if (!ss) {
    var files = DriveApp.getFilesByName(CONFIG.sheetName);
    if (files.hasNext()) {
      ss = SpreadsheetApp.open(files.next());
    } else {
      ss = SpreadsheetApp.create(CONFIG.sheetName);
    }
  }

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
    "Sales Rep", "Affiliate ID", "Rep Phone", "Rep Email", "Routing Lane"
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
  }

  delivery = delivery || {};
  var emailStatus = delivery.email && delivery.email.sent ? "sent" : "failed";
  var smsStatus = "not configured";
  if (delivery.sms && delivery.sms.sent) smsStatus = "sent";
  else if (delivery.sms && delivery.sms.configured) smsStatus = "failed";
  var deliveryNotes = (delivery.errors || []).join(" | ").substring(0, 500);
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
    lead.routingLane
  ]);
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
