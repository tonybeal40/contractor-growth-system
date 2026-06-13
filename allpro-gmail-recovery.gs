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
 * HOW TO RUN:
 *  1. In Apps Script editor → open allpro-gmail-recovery.gs
 *  2. Select function name from dropdown → click ▶ Run
 *  3. Open the Google Sheet to see results
 */

// ── Config ────────────────────────────────────────────────────────────────────
var RECOVERY_CONFIG = {
  sheetName:       "All-Pro Leads",       // Must match CONFIG.sheetName
  recoveryTab:     "Recovered Leads",     // FormSubmit website leads tab
  angiTab:         "Angi Leads",          // Angi leads tab
  // Target spreadsheet (the All-Pro Leads Google Sheet):
  targetSheetId:   "1xcc0xo4UeN3EaZUMNn_qFJ-xgX6ZPg7l7sTMSLsT6GE",
  gmailSender:     "noreply@formsubmit.co",
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

  var query    = "from:" + RECOVERY_CONFIG.gmailSender;
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

      var data    = parseFormSubmitEmail(body, subject, date);
      if (!data) continue;

      sheet.appendRow([
        date,                              // A: Received Date
        data.name      || "",              // B: Name
        data.phone     || "",              // C: Phone
        data.email     || "",              // D: Email
        data.service   || "",              // E: Service
        data.city      || "",              // F: City
        subject        || "",              // G: Form/Subject
        data.source    || "FormSubmit",    // H: Source
        (data.message  || "").substring(0, 500), // I: Message
        "recovered",                       // J: Type (vs "live")
        threadId                           // K: Thread ID (for dedup audit)
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
  return summary;
}

// ── Parse a FormSubmit plain-text email body ──────────────────────────────────
function parseFormSubmitEmail(body, subject, date) {
  if (!body) return null;

  var data = {};
  var lines = body.split(/\r?\n/);

  // Parse "Field: Value" lines
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    var colonPos = line.indexOf(":");
    if (colonPos < 1) continue;
    var key = line.substring(0, colonPos).trim().toLowerCase().replace(/\s+/g, "_");
    var val = line.substring(colonPos + 1).trim();
    if (!val) continue;

    // Map common field names
    switch (key) {
      case "name":     case "full_name":               data.name    = val; break;
      case "phone":    case "phone_number":             data.phone   = val; break;
      case "email":                                     data.email   = val; break;
      case "service":  case "service_type":
      case "project":  case "project_type":             data.service = val; break;
      case "city":     case "location":                 data.city    = val; break;
      case "message":  case "details": case "comments": data.message = val; break;
      default:
        // Catch anything else as part of message
        if (!data.extras) data.extras = [];
        data.extras.push(key + ": " + val);
    }
  }

  // Append extras into message if there are any
  if (data.extras && data.extras.length) {
    data.message = (data.message ? data.message + "\n" : "") + data.extras.join("\n");
  }

  // Guess source from subject line
  var subjectLower = (subject || "").toLowerCase();
  if      (subjectLower.indexOf("facebook")  > -1) data.source = "facebook";
  else if (subjectLower.indexOf("linkedin")  > -1) data.source = "linkedin";
  else if (subjectLower.indexOf("nextdoor")  > -1) data.source = "nextdoor";
  else if (subjectLower.indexOf("review")    > -1) data.source = "review";
  else if (subjectLower.indexOf("estimat")   > -1) data.source = "estimator";
  else if (subjectLower.indexOf("tree")      > -1) data.source = "tree-service";
  else if (subjectLower.indexOf("lawn")      > -1) data.source = "lawn-maintenance";
  else if (subjectLower.indexOf("mulch")     > -1) data.source = "mulch-rock";
  else if (subjectLower.indexOf("landscape") > -1) data.source = "landscape-cleanup";
  else if (subjectLower.indexOf("fence")     > -1) data.source = "fence";
  else if (subjectLower.indexOf("patio")     > -1) data.source = "patio";
  else if (subjectLower.indexOf("compost") > -1 ||
           subjectLower.indexOf("composite") > -1) data.source = "composite-decking";
  else if (subjectLower.indexOf("deck")      > -1) data.source = "deck-builder";
  else                                              data.source = "website-form";

  // Only return if we got at least a name or phone
  if (!data.name && !data.phone && !data.email) return null;

  return data;
}

// ── Preview helper: dry run FormSubmit, no writes ────────────────────────────
function previewGmailLeads() {
  var query   = "from:" + RECOVERY_CONFIG.gmailSender;
  var threads = GmailApp.search(query, 0, 20);
  Logger.log("Preview: found " + threads.length + " threads (showing first 20)");
  threads.forEach(function(thread) {
    var msg = thread.getMessages()[0];
    Logger.log("---\nDate: " + msg.getDate() + "\nSubject: " + msg.getSubject() +
               "\nBody:\n" + msg.getPlainBody().substring(0, 300));
  });
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
