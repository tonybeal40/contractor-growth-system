/**
 * All-Pro Metro East — Gmail Lead Recovery
 *
 * Add this file to the SAME Apps Script project as allpro-form-handler.gs.
 *
 * Two recovery functions:
 *   recoverGmailLeads()  — imports FormSubmit website leads → "Recovered Leads" tab
 *   recoverAngiLeads()   — imports Angi lead emails → "Angi Leads" tab
 *
 * Both functions are SAFE to run multiple times (already-processed threads are skipped).
 *
 * ⚠️  IMPORTANT — run this under TONY'S Google account (tonybeal40@gmail.com).
 *     FormSubmit sends lead emails TO Tony as the primary recipient; Bill is CC'd.
 *     If you run it under Bill's account it will still find leads (as CC), but
 *     Tony's inbox is the authoritative copy with all of them.
 *
 * HOW TO RUN:
 *  1. Sign in to script.google.com as tonybeal40@gmail.com
 *  2. Open the All-Pro Form Handler project (or create it there)
 *  3. Add / update allpro-gmail-recovery.gs
 *  4. Select function name from dropdown → click ▶ Run
 *  5. Open the Google Sheet to see results
 */

// ── Internal / test emails — never log these to the sheet ────────────────────
var RECOVERY_INTERNAL_EMAILS = [
  "tonybeal40@gmail.com",
  "williamosessionallpro@gmail.com",
  "allprometroeast@gmail.com"
];

function isRecoveryInternalOrTest(data, subject) {
  if (!data) return true; // null parse result — skip
  // Block internal email addresses
  var email = String(data.email || "").trim().toLowerCase();
  for (var i = 0; i < RECOVERY_INTERNAL_EMAILS.length; i++) {
    if (email === RECOVERY_INTERNAL_EMAILS[i]) return true;
  }
  // Block test/dummy by name
  var name = String(data.name || "").trim().toLowerCase();
  if (/^test/.test(name)) return true;
  // Block SEO health check and other system subjects
  var subj = String(subject || "").toLowerCase();
  if (subj.indexOf("seo health check") > -1 || subj.indexOf("test lead") > -1) return true;
  // Must have at least a real name or phone — drop pure junk
  var phone = String(data.phone || "").replace(/\D/g, "");
  var hasContact = (name.length > 1) || (phone.length >= 10)
                || (email && email.indexOf("@") > -1 && RECOVERY_INTERNAL_EMAILS.indexOf(email) === -1);
  return !hasContact;
}

// ── Config ────────────────────────────────────────────────────────────────────
var RECOVERY_CONFIG = {
  sheetName:       "All-Pro Leads",       // Must match CONFIG.sheetName
  recoveryTab:     "Recovered Leads",     // FormSubmit website leads tab
  angiTab:         "Angi Leads",          // Angi leads tab
  // Target spreadsheet (the All-Pro Leads Google Sheet):
  targetSheetId:   "1xcc0xo4UeN3EaZUMNn_qFJ-xgX6ZPg7l7sTMSLsT6GE",
  gmailSender:     "submissions@formsubmit.co OR noreply@formsubmit.co",
  maxEmails:       500,                   // Safety cap — raise if you have more
  stateKey:        "recovery_processed",  // PropertiesService key for dedup tracking
  angiStateKey:    "angi_processed"       // Separate dedup key for Angi
};

// ── Main recovery function ────────────────────────────────────────────────────
function recoverGmailLeads() {
  var sheet    = getRecoverySheet();
  var props    = PropertiesService.getScriptProperties();
  var doneRaw  = props.getProperty(RECOVERY_CONFIG.stateKey) || "[]";
  var done     = JSON.parse(doneRaw);  // array of processed thread IDs

  var query    = "from:(" + RECOVERY_CONFIG.gmailSender + ")";
  var threads  = GmailApp.search(query, 0, RECOVERY_CONFIG.maxEmails);
  Logger.log("Found " + threads.length + " FormSubmit email threads");

  var newCount = 0;
  var skipCount = 0;

  for (var t = 0; t < threads.length; t++) {
    var thread   = threads[t];
    var threadId = thread.getId();

    if (done.indexOf(threadId) > -1) {
      skipCount++;
      continue;
    }

    var messages = thread.getMessages();
    for (var m = 0; m < messages.length; m++) {
      var msg     = messages[m];
      var subject = msg.getSubject();
      var body    = msg.getPlainBody();
      var date    = msg.getDate();
      // Reply-To header carries the customer's email in FormSubmit
      var replyTo = msg.getReplyTo() || "";

      var data    = parseFormSubmitEmail(body, subject, replyTo);
      if (!data) continue;

      // Skip internal emails and test submissions — real leads only
      if (isRecoveryInternalOrTest(data, subject)) {
        Logger.log("Skipping internal/test: " + subject + " | email: " + (data.email || "none"));
        continue;
      }

      sheet.appendRow([
        date,
        data.name      || "",
        data.phone     || "",
        data.email     || "",
        data.service   || "",
        data.city      || "",
        subject        || "",
        data.source    || "website-form",
        (data.message  || "").substring(0, 500),
        "recovered",
        threadId
      ]);
      newCount++;
    }

    done.push(threadId);
  }

  // Persist processed thread IDs so re-runs skip them
  props.setProperty(RECOVERY_CONFIG.stateKey, JSON.stringify(done));

  var summary = "✅ Recovery complete: " + newCount + " new leads imported, " + skipCount + " already processed.";
  Logger.log(summary);
  SpreadsheetApp.getUi && SpreadsheetApp.getUi().alert(summary);
  // Note: getUi() throws when run from script editor — that's harmless, ignore it
  return summary;
}

// ── Parse a FormSubmit plain-text email body ──────────────────────────────────
// FormSubmit sends emails with fields as "key: value" lines but field names vary.
// We also receive the Reply-To header separately (that's the customer's email).
function parseFormSubmitEmail(body, subject, replyTo) {
  if (!body) return null;

  // Strip FormSubmit promotional footer before parsing
  // Footer starts at "Sent by FormSubmit", "sponsor", or devrolabs references
  var footerMarkers = [
    "Sent by FormSubmit",
    "devrolabs.com",
    "formsubmit.co/sponsor",
    "Get web development services",
    "formsubmit team",
    "web development services"
  ];
  var bodyClean = body;
  for (var fm = 0; fm < footerMarkers.length; fm++) {
    var fmIdx = bodyClean.toLowerCase().indexOf(footerMarkers[fm].toLowerCase());
    if (fmIdx > 50) { // only strip if not at very start (50 char buffer)
      bodyClean = bodyClean.substring(0, fmIdx);
      break;
    }
  }
  // Also strip lines that look like HTML/URL noise
  bodyClean = bodyClean.split(/\r?\n/).filter(function(l) {
    var t = l.trim().toLowerCase();
    return t.indexOf("devrolabs") === -1
        && t.indexOf("[image:") === -1
        && t.indexOf("https://formsubmit.co/sponsor") === -1
        && t.indexOf("*formsubmit") === -1;
  }).join("\n");

  var data = {};

  // Customer email comes from Reply-To header, not the body field
  if (replyTo) {
    var emailInReplyTo = replyTo.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
    if (emailInReplyTo) data.email = emailInReplyTo[0];
  }

  // Collect all raw "key: value" lines from bodyClean
  var lines = bodyClean.split(/\r?\n/);
  var rawFields = {};
  var extraLines = [];

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;
    var colonPos = line.indexOf(":");
    if (colonPos < 1) {
      extraLines.push(line);
      continue;
    }
    var rawKey = line.substring(0, colonPos).trim().toLowerCase().replace(/[\s_\-]+/g, "_");
    var val    = line.substring(colonPos + 1).trim();
    if (val) rawFields[rawKey] = val;
  }

  // Map every plausible field name to our data object
  var nameKeys    = ["name","full_name","your_name","contact_name","first_name","fname"];
  var phoneKeys   = ["phone","phone_number","telephone","mobile","cell","your_phone","call"];
  var emailKeys   = ["email","email_address","e_mail","your_email","reply_to"];
  var serviceKeys = ["service","service_type","project","project_type","job_type",
                     "type","work_type","request_type","what_service","what_do_you_need"];
  var cityKeys    = ["city","location","area","zip","zip_code","town","your_city","where"];
  var msgKeys     = ["message","details","comments","description","notes","more_info",
                     "additional","project_details","tell_us","info","other","timeline",
                     "budget","how_can_we_help","work_description"];

  function firstMatch(keys) {
    for (var k = 0; k < keys.length; k++) {
      if (rawFields[keys[k]]) return rawFields[keys[k]];
    }
    return null;
  }

  data.name    = data.name    || firstMatch(nameKeys);
  data.phone   = data.phone   || firstMatch(phoneKeys);
  data.email   = data.email   || firstMatch(emailKeys);
  data.service = data.service || firstMatch(serviceKeys);
  data.city    = data.city    || firstMatch(cityKeys);

  // Gather all remaining fields into message/notes
  var msgParts = [];
  var handled  = nameKeys.concat(phoneKeys, emailKeys, serviceKeys, cityKeys);
  Object.keys(rawFields).forEach(function(k) {
    if (handled.indexOf(k) === -1) {
      msgParts.push(k.replace(/_/g," ") + ": " + rawFields[k]);
    }
  });
  // Also pick up any message-specific fields explicitly
  var msgVal = firstMatch(msgKeys);
  if (msgVal) msgParts.unshift(msgVal);
  if (msgParts.length) data.message = msgParts.join("\n");

  // Phone regex fallback — catches (618) 555-1234 style in body
  if (!data.phone) {
    var phoneMatch = bodyClean.match(/\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}/);
    if (phoneMatch) data.phone = phoneMatch[0];
  }

  // Source from subject
  var s = (subject || "").toLowerCase();
  if      (s.indexOf("facebook")  > -1) data.source = "facebook";
  else if (s.indexOf("linkedin")  > -1) data.source = "linkedin";
  else if (s.indexOf("nextdoor")  > -1) data.source = "nextdoor";
  else if (s.indexOf("review")    > -1) data.source = "review";
  else if (s.indexOf("estimat")   > -1) data.source = "estimator";
  else if (s.indexOf("tree")      > -1) data.source = "tree-service";
  else if (s.indexOf("lawn")      > -1) data.source = "lawn-maintenance";
  else if (s.indexOf("mulch")     > -1) data.source = "mulch-rock";
  else if (s.indexOf("landscape") > -1) data.source = "landscape-cleanup";
  else if (s.indexOf("fence")     > -1) data.source = "fence";
  else if (s.indexOf("patio")     > -1) data.source = "patio";
  else if (s.indexOf("composite") > -1) data.source = "composite-decking";
  else if (s.indexOf("deck")      > -1) data.source = "deck-builder";
  else                                   data.source = "website-form";

  // Accept the lead if we got ANY useful field — don't drop it
  var hasData = data.name || data.phone || data.email || data.service || data.message;
  if (!hasData) return null;

  return data;
}

// ── Preview helper: dry run FormSubmit, no writes ────────────────────────────
function previewGmailLeads() {
  var query   = "from:(" + RECOVERY_CONFIG.gmailSender + ")";
  var threads = GmailApp.search(query, 0, 20);
  Logger.log("Preview: found " + threads.length + " threads (showing first 20)");
  threads.forEach(function(thread) {
    var msg = thread.getMessages()[0];
    Logger.log("---\nDate: " + msg.getDate() + "\nSubject: " + msg.getSubject() +
               "\nReply-To: " + msg.getReplyTo() +
               "\nBody:\n" + msg.getPlainBody().substring(0, 400));
  });
}

// ── Diagnose which emails failed to parse and why ─────────────────────────────
// Run diagnoseEmails() and check the Execution log to see every failed email.
function diagnoseEmails() {
  var query   = "from:(" + RECOVERY_CONFIG.gmailSender + ")";
  var threads = GmailApp.search(query, 0, RECOVERY_CONFIG.maxEmails);
  Logger.log("=== DIAGNOSING " + threads.length + " threads ===\n");

  var passed = 0; var failed = 0;
  threads.forEach(function(thread) {
    var msg     = thread.getMessages()[0];
    var subject = msg.getSubject();
    var body    = msg.getPlainBody();
    var replyTo = msg.getReplyTo() || "";
    var date    = msg.getDate();
    var data    = parseFormSubmitEmail(body, subject, replyTo);

    if (data) {
      passed++;
      Logger.log("✅ PARSED | " + date + " | " + subject +
                 "\n   name=" + (data.name||"?") + " phone=" + (data.phone||"?") +
                 " email=" + (data.email||"?") + " service=" + (data.service||"?"));
    } else {
      failed++;
      Logger.log("❌ FAILED | " + date + " | " + subject +
                 "\n   Reply-To: " + replyTo +
                 "\n   Body (first 600 chars):\n" + body.substring(0, 600) +
                 "\n   ---");
    }
  });
  Logger.log("\n=== RESULT: " + passed + " parsed, " + failed + " failed ===");
}

// ── Reset processed state — run this before re-importing with fixed parser ────
function resetRecoveryState() {
  PropertiesService.getScriptProperties().deleteProperty(RECOVERY_CONFIG.stateKey);
  Logger.log("✅ Reset complete — recoverGmailLeads() will re-process all 19 threads.");
}

// ── Get or create the Recovered Leads sheet tab ───────────────────────────────
function getRecoverySheet() {  var ss = getTargetSpreadsheet();
  var tab = ss.getSheetByName(RECOVERY_CONFIG.recoveryTab);
  if (!tab) {
    tab = ss.insertSheet(RECOVERY_CONFIG.recoveryTab);
    var headers = [
      "Received Date", "Name", "Phone", "Email", "Service", "City",
      "Subject / Form", "Source Channel", "Message", "Type", "Thread ID"
    ];
    tab.appendRow(headers);
    tab.setFrozenRows(1);
    tab.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    tab.setColumnWidth(1,  160);
    tab.setColumnWidth(7,  280);
    tab.setColumnWidth(9,  400);
    tab.setColumnWidth(11, 240);
    tab.getRange(1, 1, 1, headers.length)
       .setBackground("#1a3a5c")
       .setFontColor("#ffffff");
  }
  return tab;
}

// ── Shared: open the target spreadsheet by ID ────────────────────────────────
function getTargetSpreadsheet() {
  try {
    return SpreadsheetApp.openById(RECOVERY_CONFIG.targetSheetId);
  } catch(e) {
    // Fallback: find/create by name
    var files = DriveApp.getFilesByName(RECOVERY_CONFIG.sheetName);
    if (files.hasNext()) return SpreadsheetApp.open(files.next());
    return SpreadsheetApp.create(RECOVERY_CONFIG.sheetName);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ANGI LEADS RECOVERY
// Searches Bill's Gmail for Angi lead notification emails and imports them
// into the "Angi Leads" tab of the target spreadsheet.
// ══════════════════════════════════════════════════════════════════════════════

function recoverAngiLeads() {
  var sheet    = getAngiSheet();
  var props    = PropertiesService.getScriptProperties();
  var doneRaw  = props.getProperty(RECOVERY_CONFIG.angiStateKey) || "[]";
  var done     = JSON.parse(doneRaw);

  // Angi sends lead emails from several addresses — cast wide net
  var queries = [
    "from:leads@angi.com",
    "from:noreply@angi.com",
    "from:leads@homeadvisor.com",
    "from:noreply@homeadvisor.com",
    "from:leadresponder@angi.com",
    "subject:\"new lead\" angi",
    "subject:\"homeowner request\" angi",
    "subject:\"new request\" angi"
  ];

  var allThreadIds = {};  // deduplicate across queries
  queries.forEach(function(q) {
    try {
      var threads = GmailApp.search(q, 0, 200);
      threads.forEach(function(t) { allThreadIds[t.getId()] = t; });
    } catch(e) {
      Logger.log("Query failed: " + q + " — " + e);
    }
  });

  var threadList = Object.values(allThreadIds);
  Logger.log("Found " + threadList.length + " Angi email threads");

  var newCount  = 0;
  var skipCount = 0;

  threadList.forEach(function(thread) {
    var threadId = thread.getId();
    if (done.indexOf(threadId) > -1) { skipCount++; return; }

    thread.getMessages().forEach(function(msg) {
      var subject = msg.getSubject();
      var body    = msg.getPlainBody();
      var date    = msg.getDate();
      var data    = parseAngiEmail(body, subject, date);
      if (!data) return;

      sheet.appendRow([
        date,                                            // A: Date
        data.name        || "",                          // B: Name
        data.phone       || "",                          // C: Phone
        data.email       || "",                          // D: Email
        data.project     || data.service || "",          // E: Project / Service
        data.city        || data.location || "",         // F: City / Location
        data.budget      || "",                          // G: Budget
        data.timeline    || "",                          // H: Timeline
        (data.notes || data.message || "").substring(0, 600), // I: Notes
        data.leadId      || "",                          // J: Angi Lead ID
        subject          || "",                          // K: Email Subject
        threadId                                         // L: Thread ID (dedup)
      ]);
      newCount++;
    });

    done.push(threadId);
  });

  props.setProperty(RECOVERY_CONFIG.angiStateKey, JSON.stringify(done));

  var summary = "✅ Angi recovery complete: " + newCount + " leads imported, " + skipCount + " already processed.";
  Logger.log(summary);
  try { SpreadsheetApp.getUi().alert(summary); } catch(_) {}
  return summary;
}

// ── Parse an Angi lead notification email ────────────────────────────────────
function parseAngiEmail(body, subject, date) {
  if (!body) return null;

  var data = {};
  var lower = body.toLowerCase();

  // Only process if this actually looks like a lead notification
  if (lower.indexOf("angi") === -1 &&
      lower.indexOf("homeadvisor") === -1 &&
      lower.indexOf("new lead") === -1 &&
      lower.indexOf("homeowner") === -1) {
    return null;
  }

  var lines = body.split(/\r?\n/);

  // Angi emails use several formats — try labeled field parsing first
  var fieldMap = {
    "name":           ["name", "customer name", "contact name", "homeowner"],
    "phone":          ["phone", "phone number", "telephone", "mobile", "cell"],
    "email":          ["email", "email address", "e-mail"],
    "project":        ["project type", "project", "service requested", "service needed",
                       "type of project", "what do you need", "work needed", "job type",
                       "request type", "category"],
    "city":           ["city", "location", "zip", "zip code", "address", "area"],
    "budget":         ["budget", "estimated budget", "project budget"],
    "timeline":       ["timeline", "when do you need", "start date", "desired start",
                       "time frame", "urgency"],
    "notes":          ["notes", "message", "details", "description", "comments",
                       "additional info", "project details", "more details", "tell us more"]
  };

  lines.forEach(function(line) {
    var trimmed   = line.trim();
    var colonIdx  = trimmed.indexOf(":");
    if (colonIdx < 1) return;
    var rawKey = trimmed.substring(0, colonIdx).trim().toLowerCase();
    var val    = trimmed.substring(colonIdx + 1).trim();
    if (!val) return;

    Object.keys(fieldMap).forEach(function(field) {
      if (data[field]) return;  // already set
      fieldMap[field].forEach(function(alias) {
        if (rawKey === alias || rawKey.indexOf(alias) > -1) {
          data[field] = val;
        }
      });
    });
  });

  // Try regex fallback for phone / email if labeled parsing didn't find them
  if (!data.phone) {
    var phoneMatch = body.match(/\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}/);
    if (phoneMatch) data.phone = phoneMatch[0];
  }
  if (!data.email) {
    var emailMatch = body.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
    if (emailMatch &&
        emailMatch[0].indexOf("angi.com") === -1 &&
        emailMatch[0].indexOf("homeadvisor.com") === -1) {
      data.email = emailMatch[0];
    }
  }

  // Grab Angi lead ID from body if present
  var leadIdMatch = body.match(/lead\s*(?:id|#|number)[:\s]+([A-Z0-9\-]+)/i);
  if (leadIdMatch) data.leadId = leadIdMatch[1];

  // Reject if truly nothing useful extracted
  if (!data.name && !data.phone && !data.email && !data.project) return null;

  return data;
}

// ── Create or get the Angi Leads tab ─────────────────────────────────────────
function getAngiSheet() {
  var ss  = getTargetSpreadsheet();
  var tab = ss.getSheetByName(RECOVERY_CONFIG.angiTab);
  if (!tab) {
    tab = ss.insertSheet(RECOVERY_CONFIG.angiTab);
    var headers = [
      "Date Received", "Name", "Phone", "Email",
      "Project / Service", "City / Location", "Budget", "Timeline",
      "Notes", "Angi Lead ID", "Email Subject", "Thread ID"
    ];
    tab.appendRow(headers);
    tab.setFrozenRows(1);
    tab.getRange(1, 1, 1, headers.length)
       .setFontWeight("bold")
       .setBackground("#b34700")   // Angi orange
       .setFontColor("#ffffff");
    tab.setColumnWidth(1,  155);   // Date
    tab.setColumnWidth(5,  220);   // Project
    tab.setColumnWidth(6,  160);   // City
    tab.setColumnWidth(9,  400);   // Notes
    tab.setColumnWidth(11, 280);   // Subject
    tab.setColumnWidth(12, 240);   // Thread ID
  }
  return tab;
}

// ── Preview helper: dry run, no writes ───────────────────────────────────────
function previewAngiLeads() {
  var queries = [
    "from:leads@angi.com OR from:noreply@angi.com OR from:leads@homeadvisor.com",
    "subject:\"new lead\" angi"
  ];
  var found = 0;
  queries.forEach(function(q) {
    try {
      var threads = GmailApp.search(q, 0, 50);
      threads.forEach(function(t) {
        found++;
        var msg = t.getMessages()[0];
        Logger.log("---\nDate: " + msg.getDate() +
                   "\nSubject: " + msg.getSubject() +
                   "\nFrom: " + msg.getFrom() +
                   "\nBody (first 400 chars):\n" +
                   msg.getPlainBody().substring(0, 400));
      });
    } catch(e) { Logger.log("Query failed: " + q); }
  });
  Logger.log("Preview: " + found + " Angi threads found");
}

// ── Manually add leads Tony pasted in ────────────────────────────────────────
// Run addManualLeads() ONCE — safe to re-run (checks for duplicates by phone).
function addManualLeads() {
  var ss   = getTargetSpreadsheet();
  var tab  = ss.getSheetByName("Leads");
  if (!tab) {
    tab = ss.insertSheet("Leads");
    tab.appendRow([
      "Timestamp","Name","Phone","Email","Service","City",
      "Form Name","Page URL","Lead Source","First Touch Source",
      "UTM Source","UTM Medium","UTM Campaign","UTM Term",
      "Referrer","Google Ad (gclid)","FB Ad (fbclid)",
      "Session ID","Submitted At","Message"
    ]);
    tab.setFrozenRows(1);
    tab.getRange(1,1,1,20).setFontWeight("bold").setBackground("#1a3a5c").setFontColor("#ffffff");
  }

  var manualLeads = [
    {
      date:    new Date("2026-06-13"),
      name:    "William Lancaster",
      phone:   "618-610-1299",
      email:   "",
      service: "Soffit / Fascia — Woodpecker siding damage repair",
      city:    "Glen Carbon, IL",
      form:    "Manual entry",
      source:  "manual",
      message: "Requesting estimate to repair/replace siding damage caused by woodpeckers. 4-5 pieces ranging 20'-30', approx 1\" x 8.25\". Wants synthetic replacement (fiber cement / James Hardie) to match existing siding color."
    },
    {
      date:    new Date("2026-06-13"),
      name:    "Kem — Church of Grace",
      phone:   "618-604-5914",
      email:   "bidding-nexus.6k@icloud.com",
      service: "Siding Replacement — Commercial Church",
      city:    "Cahokia Heights, IL",
      form:    "Manual entry",
      source:  "manual",
      message: "Siding replacement for Church of Grace at 8307 Bluff Rd, Cahokia Heights. White siding. Partial replacement but open to full building if cost is reasonable. Timeline: 1-3 months."
    }
  ];

  // Dedup: read existing phone numbers
  var existing = tab.getDataRange().getValues();
  var existingPhones = existing.map(function(row) { return String(row[2]).replace(/\D/g,""); });

  var added = 0;
  manualLeads.forEach(function(lead) {
    var cleanPhone = lead.phone.replace(/\D/g,"");
    if (existingPhones.indexOf(cleanPhone) > -1) {
      Logger.log("Skip duplicate: " + lead.name + " (" + lead.phone + ")");
      return;
    }
    tab.appendRow([
      lead.date, lead.name, lead.phone, lead.email,
      lead.service, lead.city,
      lead.form, "", lead.source, "",
      "","","","","","","","",
      Utilities.formatDate(lead.date, Session.getScriptTimeZone(), "M/d/yyyy"),
      lead.message
    ]);
    added++;
  });

  var msg = "✅ Added " + added + " manual lead(s) to the Leads tab.";
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch(_) {}
}

// ══════════════════════════════════════════════════════════════════════════════
// REPLACE ANGI LEADS — clears the Angi Leads tab and loads the canonical list
// Run: replaceAngiLeads()
// ══════════════════════════════════════════════════════════════════════════════
function replaceAngiLeads() {
  var ss  = getTargetSpreadsheet();
  var tab = ss.getSheetByName(RECOVERY_CONFIG.angiTab);

  // Wipe and recreate the tab
  if (tab) ss.deleteSheet(tab);
  tab = ss.insertSheet(RECOVERY_CONFIG.angiTab);

  var headers = [
    "Date Received","Name","Phone","Email",
    "Project / Service","City / Location","Budget","Timeline",
    "Notes","Angi Lead ID","Source"
  ];
  tab.appendRow(headers);
  tab.setFrozenRows(1);
  tab.getRange(1,1,1,headers.length)
     .setFontWeight("bold")
     .setBackground("#b34700")
     .setFontColor("#ffffff");
  tab.setColumnWidth(1, 130);
  tab.setColumnWidth(2, 160);
  tab.setColumnWidth(4, 240);

  // [date, name, email]  — name blank where not provided
  var leads = [
    ["2026-06-06","","gbuklad@gmail.com"],
    ["2026-06-04","","dmdeliveryservices1980@yahoo.com"],
    ["2026-06-03","","rebeccaswanigan@hotmail.com"],
    ["2026-06-02","","renecynthia1965.ch@gmail.com"],
    ["2026-06-01","","soleydivine828@icloud.com"],
    ["2026-06-01","","lesly20091@live.com"],
    ["2026-05-31","","pzimmerman777@gmail.com"],
    ["2026-05-31","","pbcansee@charter.net"],
    ["2026-05-31","","elliottb@swbell.net"],
    ["2026-05-31","","elegantlilly@ymail.com"],
    ["2026-05-31","","cbrent393@aol.com"],
    ["2026-05-30","","billsbillsbliss@aol.com"],
    ["2026-05-29","","marvin.lampkin@gmail.com"],
    ["2026-05-29","","chasej6021@gmail.com"],
    ["2026-05-27","","tpaw@sbcglobal.net"],
    ["2026-05-27","","jturner4615@gmail.com"],
    ["2026-05-27","","dhirajsinha4u@gmail.com"],
    ["2026-05-26","","eddiedavis1403@gmail.com"],
    ["2026-05-26","","david.klein55@gmail.com"],
    ["2026-05-25","","fraud_help@usbank.com"],
    ["2026-05-25","","becky.riggs77@gmail.com"],
    ["2026-05-06","","tamekachalmers@yahoo.com"],
    ["2026-05-06","","dwayne.rogers1969@gmail.com"],
    ["2026-05-04","","sharontowers@yahoo.com"],
    ["2026-05-04","","kjngrl1965@yahoo.com"],
    ["2026-05-04","","kelsdapoet@gmail.com"],
    ["2026-05-04","","christopherlmc99@gmail.com"],
    ["2026-05-04","","12buffy21@gmail.com"],
    ["2026-05-02","","sonyawhitlock.1@gmail.com"],
    ["2026-05-02","","greybeard427@yahoo.com"],
    ["2026-04-30","","keyrmi@yahoo.com"],
    ["2026-04-30","","ianmkoller@gmail.com"],
    ["2026-04-29","","sidmcdaniel@msn.com"],
    ["2026-04-29","","jmjm1954@yahoo.com"],
    ["2026-04-28","","yongbingthode@gmx.com"],
    ["2026-04-28","","marycmcmurry@gmail.com"],
    ["2026-04-25","","pearlbrown623@gmail.com"],
    ["2026-04-25","","hound_pup_00@yahoo.com"],
    ["2026-04-25","","fallins1@yahoo.com"],
    ["2026-04-25","","cdl.lester@yahoo.com"],
    ["2026-04-25","","carlabrelje@yahoo.com"],
    ["2026-04-25","","bettyschubert12@gmail.com"],
    ["2026-04-21","","patigeegee@yahoo.com"],
    ["2026-04-20","","marykolda@att.net"],
    ["2026-04-20","","kolda.jerry@gmail.com"],
    ["2026-04-18","","mendie11@aol.com"],
    ["2026-04-16","","dwrobinson2025@gmail.com"],
    ["2026-04-15","","lajune.grayson@gmail.com"],
    ["2026-04-14","","tfarrar2006@yahoo.com"],
    ["2026-04-14","","galongill46@gmail.com"],
    ["2026-04-10","","litergolf1@yahoo.com"],
    ["2026-04-09","","robinhamilton2015@gmail.com"],
    ["2026-04-08","","deborahkannewurf@gmail.com"],
    ["2026-04-07","","ehilligoss07@outlook.com"],
    ["2026-04-06","","mctrimble@sbcglobal.net"],
    ["2026-04-04","","freedawares@sbcglobal.net"],
    ["2026-04-03","","jeanetteking385@gmail.com"],
    ["2026-04-03","","breedingbill1@gmail.com"],
    ["2026-04-01","","rdbrown31560@gmail.com"],
    ["2026-04-01","","ibashiruddin@gmail.com"],
    ["2026-03-31","","llicavoli10@gmail.com"],
    ["2026-03-30","","etrell@sbcglobal.net"],
    ["2026-03-30","","brittanybilyeu_09@hotmail.com"],
    ["2026-03-29","","hamzabajwa32@gmail.com"],
    ["2026-03-29","","carey.edwards2@icloud.com"],
    ["2026-03-28","","stevegilmor@sbcglobal.net"],
    ["2026-03-26","","maggiemclure87@yahoo.com"],
    ["2026-03-26","","christopher.watkins7@gmail.com"],
    ["2026-03-25","","thomasbenard493@gmail.com"],
    ["2026-03-25","","steven.varley@yahoo.com"],
    ["2026-03-25","","ronaldkrafft86@gmail.com"],
    ["2026-03-25","","hiloktpor1245@exespay.com"],
    ["2026-03-10","","remurc43@yahoo.com"],
    ["2026-03-07","","lesajenkins74@gmail.com"],
    ["2026-03-06","","gdbg@att.net"],
    ["2026-03-05","","dillon.goodson@gmail.com"],
    ["2026-03-04","","whitetiger4me@hotmail.com"],
    ["2026-03-03","","metron99@charter.net"],
    ["2026-03-03","","homeowner9517@gmail.com"],
    ["2026-03-03","","bbopp98@aol.com"],
    ["2026-03-01","","smithfr@stlouis-mo.gov"],
    ["2026-02-28","","miantras@gmail.com"],
    ["2026-02-28","","ca.becker42@yahoo.com"],
    ["2026-02-26","","davids.girl789@gmail.com"],
    ["2026-02-25","","jbachmann01@gmail.com"],
    ["2026-02-25","","bobo428113@gmail.com"],
    ["2026-02-20","","alex200c@yahoo.com"],
    ["2026-02-19","","coscyrix@hotmail.com"],
    ["2026-02-18","","tharris1688@gmail.com"],
    ["2026-02-17","","ricepam58@yahoo.com"],
    ["2026-02-01","","yatesmark111@yahoo.com"],
    ["2026-02-01","","donyenykole@gmail.com"],
    ["2026-01-31","","tori.k8mmie@yahoo.com"],
    ["2026-01-31","","corey_stanford@yahoo.com"],
    ["2026-01-30","","vlynne82@icloud.com"],
    ["2026-01-30","","mooreshawon70@gmail.com"],
    ["2026-01-30","","ladykitty345@yahoo.com"],
    ["2026-01-30","","chadlspringer@gmail.com"],
    ["2026-01-29","","lawrenceshorter1@gmail.com"],
    ["2026-01-27","","twe8080@gmail.com"],
    ["2026-01-27","","piappiah@gmail.com"],
    ["2026-01-26","","housewrightsusan@gmail.com"],
    ["2026-01-25","","jmpalmer53@gmail.com"],
    ["2026-01-17","","99imergoot@gmail.com"],
    ["2026-01-14","","acs_td@ymail.com"],
    ["2026-01-02","","senorjimi@yahol.com"],
    ["2026-01-02","","rwdodgeman@gmail.com"],
    ["2026-01-02","","roessler289@yahoo.com"],
    ["2025-12-31","","monetevelyna@gmail.com"],
    ["2025-12-31","","boothemarie65@gmail.com"],
    ["2025-12-30","","tishafloore@gmail.com"],
    ["2025-12-30","","tamara2135@att.net"],
    ["2025-12-30","","s_torpea@hotmail.com"],
    ["2025-12-29","","wanniesmall4@gmail.com"],
    ["2025-12-29","","mikearois@gmail.com"],
    ["2025-12-25","","kate.halet@gmail.com"],
    ["2025-12-20","","marieguglielmo@rocketmail.com"],
    ["2025-12-09","","realreed87@gmail.com"],
    ["2025-12-05","","chris2ferj@aol.com"],
    ["2025-12-03","","maydaynm@me.com"],
    ["2025-12-03","","daltonsellingstl@gmail.com"],
    ["2025-12-02","","pamela.johnson@pompstire.com"],
    ["2025-12-02","","geegeehip@gmail.com"],
    ["2025-12-02","","daveloveless@yahoo.com"],
    ["2025-12-01","","wmatthews545@gmail.com"],
    ["2025-11-30","","garciatame30@gmail.com"],
    ["2025-11-30","","banegaskelcy@gmail.com"],
    ["2025-11-28","","leekuehner@gmail.com"],
    ["2025-11-26","","raymondsplace41@gmail.com"],
    ["2025-11-22","","blockychief89@gmail.com"],
    ["2025-11-21","","lebronmia12@gmail.com"],
    ["2025-11-20","","boattiger229@duck.com"],
    ["2025-11-13","","zoegeyman@gmail.com"],
    ["2025-11-10","","ashley.henson99@gmail.com"],
    ["2025-11-08","","lydia.dean87@gmail.com"],
    ["2025-11-07","","arweil181@gmail.com"],
    ["2025-11-05","","shikerawilliams@yahoo.com"],
    ["2025-11-05","","myork618@gmail.com"],
    ["2025-11-03","","seccs@icloud.com"],
    ["2025-11-03","","kelijah88@icloud.com"],
    ["2025-11-03","","fredrickhbrown@hotmail.com"],
    ["2025-11-02","","ticurria@gmail.com"],
    ["2025-11-01","","bparks2@sbcglobal.net"],
    ["2025-10-31","","camdanpope@gmail.com"],
    ["2025-10-29","","tardeyj@gmail.com"],
    ["2025-10-29","","aubreyrmalone@hotmail.com"],
    ["2025-10-28","","samuelhilsabeck@gmail.com"],
    ["2025-10-28","","bbottchen13@gmail.com"],
    ["2025-10-27","","erin.fahs@gmail.com"],
    ["2025-10-27","","connie.goodson123@gmail.com"],
    ["2025-10-27","","calbaradogold@gmail.com"],
    ["2025-08-12","Luan Meredith","luan@luanmeredith.com"],
    ["2025-08-10","","cathryn.wilmott@gmail.com"],
    ["2025-07-28","","2112perkins@gmail.com"],
    ["2025-07-10","","rockchalkjrs77@yahoo.com"],
    // No date — Angi list, date unknown
    ["","","amyroth1487@hotmail.com"],
    ["","","bettie_roy@yahoo.com"],
    ["","","billhurst59@hotmail.com"],
    ["","","ceoliaw@yahoo.com"],
    ["","","colleen56@gmail.com"],
    ["","","contact@sold.com"],
    ["","","diannasimp@yahoo.com"],
    ["","","dollyvance314@gmail.com"],
    ["","","dudley1944@gmail.com"],
    ["","","egreubel37@gmail.com"],
    ["","","emmns4@gmail.com"],
    ["","","iluvwaffles1202@aol.com"],
    ["","","iroc34a@yahoo.com"],
    ["","","jasmineramjeet@outlook.com"],
    ["","","julievet1@hotmail.com"],
    ["","","kathleen.brown524@yahoo.com"],
    ["","","ladya856@gmail.com"],
    ["","","linda_schwinn@yahoo.com"],
    ["","","mikeneville82@gmail.com"],
    ["","","misty.warren@ymail.com"],
    ["","","redmaro99@att.net"],
    ["","","smcgrail@mathesongas.com"],
    ["","","tb19147@gmail.com"],
    ["","","tjtwiggs17@yahoo.com"],
    ["","","wjpmail@yahoo.com"]
  ];

  // Build rows: [date, name, phone, email, service, city, budget, timeline, notes, id, source]
  var rows = leads.map(function(l) {
    return [l[0], l[1], "", l[2], "", "", "", "", "", "", "Angi"];
  });

  // Batch write — much faster than appendRow loop
  tab.getRange(2, 1, rows.length, headers.length).setValues(rows);

  var msg = "✅ Angi Leads tab replaced: " + rows.length + " leads loaded.";
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch(_) {}
}
