/**
 * All-Pro Metro East — Gmail Lead Recovery
 *
 * Add this file to the SAME Apps Script project as allpro-form-handler.gs.
 * Then run recoverGmailLeads() ONCE from the script editor to import all
 * historical FormSubmit emails into the Google Sheet.
 *
 * It is SAFE to run multiple times — it skips any thread it has already processed.
 *
 * HOW TO RUN:
 *  1. In Apps Script editor → open allpro-gmail-recovery.gs
 *  2. Select function: recoverGmailLeads
 *  3. Click ▶ Run
 *  4. Check "All-Pro Leads" → "Recovered Leads" tab in Google Sheets
 */

// ── Config (must match allpro-form-handler.gs) ────────────────────────────────
var RECOVERY_CONFIG = {
  sheetName:       "All-Pro Leads",       // Must match CONFIG.sheetName
  recoveryTab:     "Recovered Leads",     // Separate tab so live leads stay clean
  gmailSender:     "noreply@formsubmit.co",
  maxEmails:       500,                   // Safety cap — raise if you have more
  stateKey:        "recovery_processed"   // PropertiesService key for dedup tracking
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

// ── Get or create the Recovered Leads sheet tab ───────────────────────────────
function getRecoverySheet() {
  var ss = null;
  try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch(_) {}
  if (!ss) {
    var files = DriveApp.getFilesByName(RECOVERY_CONFIG.sheetName);
    if (files.hasNext()) {
      ss = SpreadsheetApp.open(files.next());
    } else {
      ss = SpreadsheetApp.create(RECOVERY_CONFIG.sheetName);
    }
  }

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
    tab.setColumnWidth(1,  160);  // Date
    tab.setColumnWidth(7,  280);  // Subject
    tab.setColumnWidth(9,  400);  // Message
    tab.setColumnWidth(11, 240);  // Thread ID
    // Color header row
    tab.getRange(1, 1, 1, headers.length)
       .setBackground("#1a3a5c")
       .setFontColor("#ffffff");
  }
  return tab;
}

// ── Test helper: run this first to see a preview without writing ──────────────
function previewGmailLeads() {
  var query   = "from:" + RECOVERY_CONFIG.gmailSender;
  var threads = GmailApp.search(query, 0, 20);
  Logger.log("Preview: found " + threads.length + " threads (showing first 20)");

  threads.forEach(function(thread) {
    var msg     = thread.getMessages()[0];
    var subject = msg.getSubject();
    var date    = msg.getDate();
    var body    = msg.getPlainBody().substring(0, 300);
    Logger.log("---\nDate: " + date + "\nSubject: " + subject + "\nBody:\n" + body);
  });
}
