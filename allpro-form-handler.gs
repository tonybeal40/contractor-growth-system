/**
 * All-Pro Metro East Construction — Custom Form Handler
 * Google Apps Script Web App
 *
 * Receives POST from the website, sends email to Bill + Tony,
 * and logs every lead to a Google Sheet.
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
 */

// ── Config ────────────────────────────────────────────────────────────────────
var CONFIG = {
  leadEmail:   "williamosessionallpro@gmail.com",  // Bill gets every lead
  ownerEmail:  "tonybeal40@gmail.com",             // Tony gets a copy
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

    var isReview = isReviewSubmission(data);
    var toEmail  = isReview ? CONFIG.reviewEmail : CONFIG.leadEmail;
    var ccEmail  = isReview ? CONFIG.leadEmail   : CONFIG.ownerEmail;

    var subject  = buildSubject(data, isReview);
    var body     = buildEmailBody(data);

    // Send email
    GmailApp.sendEmail(toEmail, subject, body, {
      cc: ccEmail,
      replyTo: data["email"] || data["_replyto"] || "",
      name: "All-Pro Form Handler"
    });

    // Log to Sheet
    logToSheet(data, subject);

    return jsonResponse({ ok: true, redirect: buildThankYouUrl(data) }, headers);

  } catch (err) {
    console.error("doPost error:", err);
    return jsonResponse({ ok: false, error: err.toString() }, headers, 500);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parsePayload(e) {
  if (!e) return {};
  // Try JSON body first (fetch from JS), then form-encoded POST
  if (e.postData && e.postData.type === "application/json") {
    try { return JSON.parse(e.postData.contents); } catch(_) {}
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
  var prefix = isReview ? "⭐ New Review" : "🔔 New Lead";
  var name    = data["name"] || data["full_name"] || "Unknown";
  var service = data["service"] || data["project"] || "";
  var city    = data["city"] || "";
  var page    = data["form_name"] || data["page_path"] || "";
  var parts   = [name];
  if (service) parts.push(service);
  if (city)    parts.push(city);
  if (page)    parts.push("— " + page);
  return prefix + " · " + parts.join(" · ") + " — All-Pro";
}

function buildEmailBody(data) {
  var skip = ["_honey", "_captcha", "_template", "_next", "_subject", "_cc", "_replyto", "_blacklist"];
  var lines = ["All-Pro Form Submission\n"];
  var priority = ["name", "phone", "email", "service", "city", "message", "details", "timeline"];

  // Priority fields first
  for (var i = 0; i < priority.length; i++) {
    var k = priority[i];
    if (data[k] && String(data[k]).trim()) {
      lines.push(titleCase(k) + ": " + data[k]);
    }
  }

  lines.push("\n--- Tracking ---");
  var trackFields = ["page_url", "lead_source", "first_touch_source", "utm_source",
                     "utm_campaign", "referrer", "lead_session_id", "submission_time_local"];
  for (var j = 0; j < trackFields.length; j++) {
    var tk = trackFields[j];
    if (data[tk] && String(data[tk]).trim()) {
      lines.push(titleCase(tk.replace(/_/g, " ")) + ": " + data[tk]);
    }
  }

  lines.push("\n--- All Fields ---");
  var keys = Object.keys(data).sort();
  for (var m = 0; m < keys.length; m++) {
    var key = keys[m];
    if (skip.indexOf(key) > -1) continue;
    if (priority.indexOf(key) > -1) continue;
    if (trackFields.indexOf(key) > -1) continue;
    if (data[key] && String(data[key]).trim()) {
      lines.push(titleCase(key.replace(/_/g, " ")) + ": " + data[key]);
    }
  }

  return lines.join("\n");
}

function buildThankYouUrl(data) {
  var slug = (data["form_slug"] || data["form_name"] || "website")
    .toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  return CONFIG.thankYouUrl + "&form=" + encodeURIComponent(slug);
}

function logToSheet(data, subject) {
  var ss;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch(_) {
    // If no sheet is bound, create/open one by name
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
      "Timestamp", "Subject", "Name", "Phone", "Email", "Service",
      "City", "Message", "Page URL", "Lead Source", "First Touch",
      "UTM Source", "UTM Campaign", "Session ID", "Form Name"
    ]);
    sheet.setFrozenRows(1);
  }

  sheet.appendRow([
    new Date(),
    subject,
    data["name"] || "",
    data["phone"] || "",
    data["email"] || "",
    data["service"] || data["project"] || "",
    data["city"] || "",
    (data["message"] || data["details"] || "").substring(0, 500),
    data["page_url"] || "",
    data["lead_source"] || "",
    data["first_touch_source"] || "",
    data["utm_source"] || "",
    data["utm_campaign"] || "",
    data["lead_session_id"] || "",
    data["form_name"] || ""
  ]);
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
