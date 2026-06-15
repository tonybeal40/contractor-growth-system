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
    var subject  = buildSubject(data, isReview);

    // FormSubmit handles the email — Apps Script is Sheet logging only.
    // Log to Sheet (non-fatal)
    try { logToSheet(data, subject); } catch(sheetErr) {
      console.warn("Sheet log failed (non-fatal):", sheetErr);
    }

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

function buildThankYouUrl(data) {
  var slug = (data["form_slug"] || data["form_name"] || "website")
    .toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  return CONFIG.thankYouUrl + "&form=" + encodeURIComponent(slug);
}

function logToSheet(data, subject) {
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
      "Timestamp", "Name", "Phone", "Email", "Service", "City",
      "Form Name", "Page URL", "Lead Source", "First Touch Source",
      "UTM Source", "UTM Medium", "UTM Campaign", "UTM Term",
      "Referrer", "Google Ad (gclid)", "FB Ad (fbclid)",
      "Session ID", "Submitted At", "Message"
    ]);
    sheet.setFrozenRows(1);
    // Bold header row
    sheet.getRange(1, 1, 1, 20).setFontWeight("bold");
    sheet.setColumnWidth(1, 160);  // Timestamp
    sheet.setColumnWidth(8, 280);  // Page URL
    sheet.setColumnWidth(20, 400); // Message
  }

  sheet.appendRow([
    new Date(),
    data["name"]                 || "",
    data["phone"]                || "",
    data["email"]                || "",
    data["service"] || data["project"] || "",
    data["city"]                 || "",
    data["form_name"]            || data["page_path"] || "",
    data["page_url"]             || "",
    data["lead_source"]          || "direct",
    data["first_touch_source"]   || "",
    data["utm_source"]           || "",
    data["utm_medium"]           || "",
    data["utm_campaign"]         || "",
    data["utm_term"]             || "",
    data["referrer"]             || "",
    data["gclid"]                || "",
    data["fbclid"]               || "",
    data["lead_session_id"]      || "",
    data["submission_time_local"]|| "",
    (data["message"] || data["details"] || data["review"] || "").substring(0, 500)
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
