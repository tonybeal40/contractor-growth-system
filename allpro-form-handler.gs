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
  "allprometroeast@gmail.com"
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
    copyEmail: CONFIG.ownerEmail
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
    try { sendLeadNotification(data, subject, isReview); } catch(mailErr) {
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

function isReviewSubmission(data) {
  var formName = (data["form_name"] || data["_subject"] || "").toLowerCase();
  var pagePath = (data["page_path"] || "").toLowerCase();
  return formName.indexOf("review") > -1 || pagePath.indexOf("reviews") > -1;
}

function buildSubject(data, isReview) {
  var prefix  = isReview ? "⭐ New Review" : "🚨 NEW LEAD";
  var name    = data["name"] || data["full_name"] || "Unknown";
  var service = data["service"] || data["project"] || "";
  var city    = data["city"] || "";
  // Show the channel they came from — e.g. "linkedin", "facebook", "google-organic"
  var source  = data["lead_source"] || data["first_touch_source"] || "";
  var parts   = [name];
  if (service) parts.push(service);
  if (city)    parts.push(city);
  if (source)  parts.push("via " + source);
  return prefix + " · " + parts.join(" · ") + " — All-Pro";
}

function buildEmailBody(data) {
  var skip = ["_honey", "_captcha", "_template", "_next", "_subject", "_cc", "_replyto", "_blacklist"];
  var lines = [];

  // ── 1. WHERE THIS LEAD CAME FROM (top of email — marketing view) ────────────
  lines.push("=== WHERE THEY CAME FROM ===");
  var formName    = data["form_name"]          || data["page_path"] || "Unknown form";
  var pageUrl     = data["page_url"]           || "";
  var source      = data["lead_source"]        || "direct";
  var firstTouch  = data["first_touch_source"] || source;
  var utmSource   = data["utm_source"]         || "";
  var utmCampaign = data["utm_campaign"]       || "";
  var utmMedium   = data["utm_medium"]         || "";
  var utmTerm     = data["utm_term"]           || "";
  var referrer    = data["referrer"]           || "";
  var gclid       = data["gclid"]              || "";
  var fbclid      = data["fbclid"]             || "";

  lines.push("Form: "        + formName);
  lines.push("Page: "        + pageUrl);
  lines.push("Source: "      + source);
  if (firstTouch !== source)
    lines.push("First touch: " + firstTouch);
  if (utmSource)   lines.push("UTM source: "   + utmSource);
  if (utmMedium)   lines.push("UTM medium: "   + utmMedium);
  if (utmCampaign) lines.push("UTM campaign: " + utmCampaign);
  if (utmTerm)     lines.push("UTM term: "     + utmTerm);
  if (referrer)    lines.push("Referrer: "     + referrer);
  if (gclid)       lines.push("Google ad click (gclid): " + gclid);
  if (fbclid)      lines.push("Facebook ad click (fbclid): " + fbclid);

  // ── 2. LEAD CONTACT INFO ─────────────────────────────────────────────────────
  lines.push("\n=== LEAD INFO ===");
  var contactFields = ["name", "phone", "email", "service", "city", "timeline", "message", "details", "review", "rating"];
  for (var i = 0; i < contactFields.length; i++) {
    var k = contactFields[i];
    if (data[k] && String(data[k]).trim()) {
      lines.push(titleCase(k) + ": " + data[k]);
    }
  }

  // ── 3. META ──────────────────────────────────────────────────────────────────
  lines.push("\n=== META ===");
  lines.push("Submitted: "   + (data["submission_time_local"] || new Date().toLocaleString()));
  lines.push("Session ID: "  + (data["lead_session_id"] || "n/a"));

  // ── 4. REMAINING FIELDS ──────────────────────────────────────────────────────
  var allHandled = skip.concat(contactFields).concat([
    "form_name","form_slug","page_url","page_path","lead_source","first_touch_source",
    "first_touch_detail","landing_page","landing_path","referrer","first_referrer",
    "utm_source","utm_medium","utm_campaign","utm_term","utm_content",
    "gclid","fbclid","msclkid","lead_session_id","submission_time_local","submission_time_utc",
    "page_title","estimate_contact_consent","email_marketing_opt_in"
  ]);
  var extras = [];
  Object.keys(data).sort().forEach(function(key) {
    if (allHandled.indexOf(key) === -1 && data[key] && String(data[key]).trim()) {
      extras.push(titleCase(key.replace(/_/g, " ")) + ": " + data[key]);
    }
  });
  if (extras.length) {
    lines.push("\n=== OTHER FIELDS ===");
    extras.forEach(function(e) { lines.push(e); });
  }

  return lines.join("\n");
}

function sendLeadNotification(data, subject, isReview) {
  var body = buildEmailBody(data);
  var replyTo = data["email"] || data["replyto"] || "";
  var to = isReview ? CONFIG.reviewEmail : CONFIG.leadEmail;
  var cc = uniqueEmailCsv([CONFIG.ownerEmail], to);
  var options = {
    to: to,
    subject: subject,
    body: body,
    name: "All-Pro Lead Handler"
  };
  if (cc) options.cc = cc;
  if (replyTo) options.replyTo = replyTo;
  MailApp.sendEmail(options);
}

/**
 * Script Properties required for Twilio SMS:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_FROM_NUMBER          (E.164, such as +16185551234)
 * Optional:
 *   SMS_ALERT_TO                (defaults to CONFIG.smsAlertTo)
 *
 * Keep credentials in Apps Script Project Settings, never in this file.
 */
function smsSetupStatus() {
  var props = PropertiesService.getScriptProperties();
  var required = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"];
  var missing = [];
  for (var i = 0; i < required.length; i++) {
    if (!String(props.getProperty(required[i]) || "").trim()) missing.push(required[i]);
  }
  return {
    configured: missing.length === 0,
    missing: missing,
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
  var authToken = String(props.getProperty("TWILIO_AUTH_TOKEN") || "").trim();
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
      Authorization: "Basic " + Utilities.base64Encode(accountSid + ":" + authToken)
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
  return { sent: true, configured: true, sid: parsed.sid || "", status: parsed.status || "queued" };
}

function buildSmsBody(data) {
  var name = data["name"] || data["full_name"] || "Unknown name";
  var phone = data["phone"] || "No phone";
  var service = data["service"] || data["service_needed"] || data["project"] || "Project not selected";
  var city = data["city"] || "City not entered";
  var form = data["form_name"] || data["page_path"] || "Website form";
  return [
    "NEW ALL-PRO LEAD",
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
    sheet.appendRow([
      "Timestamp", "Subject", "Name", "Phone", "Email", "Service", "City",
      "Message", "Page URL", "Lead Source", "First Touch", "UTM Source",
      "UTM Campaign", "Session ID", "Form Name"
    ]);
    sheet.setFrozenRows(1);
    // Bold header row
    sheet.getRange(1, 1, 1, 15).setFontWeight("bold");
    sheet.setColumnWidth(1, 160);  // Timestamp
    sheet.setColumnWidth(2, 320);  // Subject
    sheet.setColumnWidth(8, 400);  // Message
    sheet.setColumnWidth(9, 280);  // Page URL
  }

  var deliveryHeaders = ["Email Status", "SMS Status", "Delivery Notes"];
  var deliveryHeaderRange = sheet.getRange(1, 16, 1, deliveryHeaders.length);
  var currentDeliveryHeaders = deliveryHeaderRange.getValues()[0];
  if (currentDeliveryHeaders.join("").trim() === "") {
    deliveryHeaderRange.setValues([deliveryHeaders]).setFontWeight("bold");
  }

  delivery = delivery || {};
  var emailStatus = delivery.email && delivery.email.sent ? "sent" : "failed";
  var smsStatus = "not configured";
  if (delivery.sms && delivery.sms.sent) smsStatus = "sent";
  else if (delivery.sms && delivery.sms.configured) smsStatus = "failed";
  var deliveryNotes = (delivery.errors || []).join(" | ").substring(0, 500);

  sheet.appendRow([
    new Date(),
    subject || "",
    data["name"] || data["full_name"] || data["customer_name"] || "",
    data["phone"]                || "",
    data["email"]                || "",
    data["service"] || data["service_needed"] || data["project"] || data["main_service"] || "",
    data["city"]                 || "",
    (data["message"] || data["details"] || data["project_details"] || data["proof_links"] || data["review"] || "").substring(0, 500),
    data["page_url"]             || "",
    data["lead_source"]          || "direct",
    data["first_touch_source"]   || "",
    data["utm_source"]           || "",
    data["utm_campaign"]         || "",
    data["lead_session_id"]      || "",
    data["form_name"]            || data["page_path"] || "",
    emailStatus,
    smsStatus,
    deliveryNotes
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
