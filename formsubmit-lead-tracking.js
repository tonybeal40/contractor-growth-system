(function () {
  const siteOrigin = "https://allprometroeastconstruction.com";
  const formSelector = 'form[action*="formsubmit.co/"]';

  // ── Custom endpoint (Google Apps Script Web App) ───────────────────────────
  // Set this after deploying allpro-form-handler.gs.
  // Leave empty to use FormSubmit only.
  const CUSTOM_ENDPOINT = "https://script.google.com/macros/s/AKfycbwXlYCGiy_SCFsZE5lnujH3iKeslueXoTQ54DLFdt-UDvP7ldixk12-WG5owCgy9oLMIQ/exec";
  const LEAD_CONCIERGE_ENDPOINT = "https://lead-api.allprometroeastconstruction.com";
  const MAX_PROJECT_PHOTO_BYTES = 5 * 1024 * 1024;
  const MAX_APPLICANT_RESUME_BYTES = 5 * 1024 * 1024;
  // ──────────────────────────────────────────────────────────────────────────

  const routing = {
    leadInbox: "https://formsubmit.co/williamosessionallpro@gmail.com",
    leadInboxEmail: "williamosessionallpro@gmail.com",
    reviewInbox: "https://formsubmit.co/tonybeal40@gmail.com",
    ownerCopy: "tonybeal40@gmail.com",
    affiliateCopies: {
      "josh-barber": "JoshBarber23@yahoo.com"
    },
    // Carrier email-to-text gateways are no longer reliable. Keep lead email
    // delivery clean until a real SMS provider is connected.
    smsCopies: [],
    blacklist: "viagra,casino,payday loan,crypto investment,seo service"
  };
  const storageKeys = {
    sessionId: "allpro_lead_session_id",
    firstTouch: "allpro_first_touch"
  };
  const initializedForms = new WeakSet();

  function safeStorage() {
    try {
      return window.localStorage;
    } catch (error) {
      return null;
    }
  }

  function createId() {
    return "lead-" + Math.random().toString(36).slice(2, 10);
  }

  function slugify(value) {
    return String(value || "form")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "form";
  }

  function hostnameFromUrl(url) {
    if (!url) {
      return "";
    }

    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch (error) {
      return "";
    }
  }

  function readQueryParams() {
    return new URLSearchParams(window.location.search);
  }

  function deriveSource(params, referrer) {
    const referrerHost = hostnameFromUrl(referrer);

    if (params.get("oppref")) {
      return { source: "openai-ads", detail: params.get("oppref") };
    }

    if (params.get("gclid")) {
      return { source: "google-ads", detail: params.get("gclid") };
    }

    if (params.get("fbclid")) {
      return { source: "facebook-ads", detail: params.get("fbclid") };
    }

    if (params.get("msclkid")) {
      return { source: "bing-ads", detail: params.get("msclkid") };
    }

    if (params.get("utm_source")) {
      return {
        source: params.get("utm_source"),
        detail: [params.get("utm_medium"), params.get("utm_campaign")].filter(Boolean).join(" / ")
      };
    }

    if (!referrerHost) {
      return { source: "direct", detail: "" };
    }

    if (/chatgpt\.com$|openai\.com$/.test(referrerHost)) {
      return { source: "chatgpt-ai", detail: referrerHost };
    }

    if (/perplexity\.ai$/.test(referrerHost)) {
      return { source: "perplexity-ai", detail: referrerHost };
    }

    if (/copilot\.microsoft\.com$/.test(referrerHost)) {
      return { source: "copilot-ai", detail: referrerHost };
    }

    if (/gemini\.google\.com$/.test(referrerHost)) {
      return { source: "gemini-ai", detail: referrerHost };
    }

    if (/claude\.ai$/.test(referrerHost)) {
      return { source: "claude-ai", detail: referrerHost };
    }

    if (/google\./.test(referrerHost)) {
      return { source: "google-organic", detail: referrerHost };
    }

    if (/bing\.com$/.test(referrerHost)) {
      return { source: "bing-organic", detail: referrerHost };
    }

    if (/duckduckgo\.com$/.test(referrerHost)) {
      return { source: "duckduckgo-organic", detail: referrerHost };
    }

    if (/nextdoor\.com$/.test(referrerHost)) {
      return { source: "nextdoor", detail: referrerHost };
    }

    if (/facebook\.com$|fb\.com$|m\.facebook\.com$/.test(referrerHost)) {
      return { source: "facebook", detail: referrerHost };
    }

    if (/instagram\.com$/.test(referrerHost)) {
      return { source: "instagram", detail: referrerHost };
    }

    if (/t\.co$|twitter\.com$|x\.com$/.test(referrerHost)) {
      return { source: "x", detail: referrerHost };
    }

    return { source: "referral", detail: referrerHost };
  }

  function getSessionId(storage) {
    if (!storage) {
      return createId();
    }

    let sessionId = storage.getItem(storageKeys.sessionId);

    if (!sessionId) {
      sessionId = createId();
      storage.setItem(storageKeys.sessionId, sessionId);
    }

    return sessionId;
  }

  function getFirstTouch(storage, params, currentSource) {
    const fallback = {
      source: currentSource.source,
      detail: currentSource.detail,
      page: window.location.href,
      path: window.location.pathname,
      referrer: document.referrer || "",
      timestamp: new Date().toISOString(),
      utmSource: params.get("utm_source") || "",
      utmMedium: params.get("utm_medium") || "",
      utmCampaign: params.get("utm_campaign") || "",
      utmTerm: params.get("utm_term") || "",
      utmContent: params.get("utm_content") || "",
      gclid: params.get("gclid") || "",
      fbclid: params.get("fbclid") || "",
      msclkid: params.get("msclkid") || "",
      oppref: params.get("oppref") || ""
    };

    if (!storage) {
      return fallback;
    }

    const existing = storage.getItem(storageKeys.firstTouch);

    if (existing) {
      try {
        return JSON.parse(existing);
      } catch (error) {
        storage.removeItem(storageKeys.firstTouch);
      }
    }

    storage.setItem(storageKeys.firstTouch, JSON.stringify(fallback));
    return fallback;
  }

  function findNamedField(form, name) {
    return form.querySelector('[name="' + name.replace(/"/g, '\\"') + '"]');
  }

  function ensureHiddenField(form, name, value) {
    let field = findNamedField(form, name);

    if (!field) {
      field = document.createElement("input");
      field.type = "hidden";
      field.name = name;
      form.appendChild(field);
    }

    field.value = value;
    return field;
  }

  function ensureHoneyField(form) {
    let field = findNamedField(form, "_honey");

    if (!field) {
      const wrapper = document.createElement("div");
      wrapper.setAttribute("aria-hidden", "true");
      wrapper.style.display = "none";

      field = document.createElement("input");
      field.type = "text";
      field.name = "_honey";
      field.tabIndex = -1;
      field.autocomplete = "off";

      wrapper.appendChild(field);
      form.appendChild(wrapper);
      return field;
    }

    field.type = "text";
    field.tabIndex = -1;
    field.autocomplete = "off";
    if (field.parentElement === form) {
      field.style.display = "none";
    } else {
      field.parentElement.style.display = "none";
    }
    return field;
  }

  function uniqueEmails(values) {
    const seen = new Set();

    return values.filter(function (value) {
      const normalized = String(value || "").trim().toLowerCase();

      if (!normalized || seen.has(normalized)) {
        return false;
      }

      seen.add(normalized);
      return true;
    });
  }

  function removeNamedField(form, name) {
    const field = findNamedField(form, name);

    if (field) {
      if (field.parentElement && field.parentElement !== form && field.parentElement.childElementCount === 1) {
        field.parentElement.remove();
        return;
      }

      field.remove();
    }
  }

  function getFormName(form) {
    const dataForm = form.getAttribute("data-form");
    if (dataForm) {
      return dataForm;
    }

    const subjectField = findNamedField(form, "_subject");
    if (subjectField && subjectField.value) {
      return subjectField.value.replace(/\s*-\s*All-Pro Construction\s*$/i, "").trim();
    }

    return document.title || window.location.pathname;
  }

  function isReviewForm(formName) {
    return /review/i.test(formName) || /reviews\.html$/i.test(window.location.pathname);
  }

  function isBusinessInquiryForm(form, formName) {
    return /worker\s*\/\s*partner|contractor\s*listing|pro\s*network\s*contractor|crew\s*application|employment\s*application/i.test(formName) ||
      !!findNamedField(form, "business_name") ||
      !!findNamedField(form, "application_type") ||
      !!findNamedField(form, "application_data_consent") ||
      !!findNamedField(form, "contractor_contact_consent") ||
      (!!findNamedField(form, "company") && !!findNamedField(form, "work_type"));
  }

  function hasContactConsentField(form) {
    return [
      "estimate_contact_consent",
      "owner_contact_consent",
      "contact_consent",
      "contractor_contact_consent"
    ].some(function (name) {
      return !!findNamedField(form, name);
    });
  }

  function isHomeownerLeadForm(form, formName) {
    return !isReviewForm(formName) && !isBusinessInquiryForm(form, formName);
  }

  function findFirstLeadField(form, names) {
    for (let i = 0; i < names.length; i += 1) {
      const field = findNamedField(form, names[i]);
      if (field && field.type !== "hidden") {
        return field;
      }
    }
    return null;
  }

  function requireHomeownerLeadDetails(form, formName) {
    if (!isHomeownerLeadForm(form, formName)) {
      return;
    }

    [
      ["name", "full_name", "customer_name", "contact_name"],
      ["phone", "phone_number", "mobile", "contact_phone"],
      ["city", "location"]
    ].forEach(function (names) {
      const field = findFirstLeadField(form, names);
      if (field) {
        field.required = true;
      }
    });

    const description = findFirstLeadField(form, [
      "details",
      "message",
      "description",
      "notes",
      "project_summary",
      "project_details"
    ]);
    if (description) {
      description.required = true;
    }
  }

  function wantsSmsCopies(formName) {
    return !isReviewForm(formName);
  }

  function applyRouting(form, formName) {
    if (isReviewForm(formName)) {
      form.action = routing.reviewInbox;
      removeNamedField(form, "_cc");
      ensureHiddenField(form, "_subject", formName + " - All-Pro Construction");
      return;
    }

    const ccList = [routing.ownerCopy];
    const affiliateField = findNamedField(form, "affiliate_id");
    const affiliateId = affiliateField ? String(affiliateField.value || "").trim().toLowerCase() : "";
    if (affiliateId && routing.affiliateCopies[affiliateId]) {
      ccList.push(routing.affiliateCopies[affiliateId]);
    }

    if (wantsSmsCopies(formName)) {
      ccList.push.apply(ccList, routing.smsCopies);
    }

    form.action = routing.leadInbox;
    ensureHiddenField(form, "_cc", uniqueEmails(ccList).join(","));
    ensureHiddenField(form, "_subject", "New All-Pro Lead: " + formName);
  }

  function applyReplyTo(form) {
    const emailField = findNamedField(form, "email");

    if (!emailField) {
      removeNamedField(form, "_replyto");
      return;
    }

    const emailValue = String(emailField.value || "").trim();

    if (!emailValue) {
      removeNamedField(form, "_replyto");
      return;
    }

    ensureHiddenField(form, "_replyto", emailValue);
  }

  function findSubmitControl(form) {
    return form.querySelector('button[type="submit"], input[type="submit"]');
  }

  function hasLegalLinks(form) {
    return !!form.querySelector('a[href="privacy.html"], a[href="/privacy.html"]') &&
      !!form.querySelector('a[href="terms.html"], a[href="/terms.html"]');
  }

  function createConsentBlock(name, required, text) {
    const wrapper = document.createElement("div");
    wrapper.style.margin = required ? "12px 0 10px" : "0 0 10px";

    const label = document.createElement("label");
    label.style.display = "flex";
    label.style.alignItems = "flex-start";
    label.style.gap = "0.6rem";
    label.style.fontSize = "0.9rem";
    label.style.lineHeight = "1.5";
    label.style.color = "inherit";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = name;
    input.value = "yes";
    input.style.marginTop = "0.25rem";

    if (required) {
      input.required = true;
    }

    const textNode = document.createElement("span");
    textNode.textContent = text;

    label.appendChild(input);
    label.appendChild(textNode);
    wrapper.appendChild(label);
    return wrapper;
  }

  function createLegalNote() {
    const note = document.createElement("p");
    note.setAttribute("data-lead-legal-note", "true");
    note.style.fontSize = "0.82rem";
    note.style.lineHeight = "1.6";
    note.style.margin = "0 0 12px";

    const intro = document.createTextNode("By submitting this form, you agree to our ");
    const termsLink = document.createElement("a");
    termsLink.href = "terms.html";
    termsLink.textContent = "Terms of Service";
    const joiner = document.createTextNode(" and ");
    const privacyLink = document.createElement("a");
    privacyLink.href = "privacy.html";
    privacyLink.textContent = "Privacy Policy";
    const period = document.createTextNode(".");

    note.appendChild(intro);
    note.appendChild(termsLink);
    note.appendChild(joiner);
    note.appendChild(privacyLink);
    note.appendChild(period);
    return note;
  }

  function hasProjectDescription(form) {
    const names = ["details", "message", "description", "notes", "project_summary", "project_details"];
    return names.some(function (name) {
      return !!findNamedField(form, name);
    });
  }

  function ensureProjectDescriptionField(form, formName) {
    if (isReviewForm(formName) || isBusinessInquiryForm(form, formName) || hasProjectDescription(form)) {
      return;
    }

    const submitControl = findSubmitControl(form);
    if (!submitControl) {
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.setAttribute("data-allpro-project-description", "true");
    wrapper.style.margin = "12px 0";

    const id = "allpro-project-details-" + Math.random().toString(36).slice(2, 9);
    const label = document.createElement("label");
    label.htmlFor = id;
    label.textContent = "Project Description";
    label.style.display = "block";
    label.style.marginBottom = "6px";
    label.style.fontSize = "0.92rem";
    label.style.fontWeight = "700";
    label.style.color = "inherit";

    const textarea = document.createElement("textarea");
    textarea.id = id;
    textarea.name = "details";
    textarea.rows = 4;
    textarea.required = true;
    textarea.placeholder = "What would you like done? Include size, condition, timing, or anything helpful.";
    textarea.style.display = "block";
    textarea.style.width = "100%";
    textarea.style.boxSizing = "border-box";
    textarea.style.padding = "12px";
    textarea.style.border = "1px solid #aeb8b3";
    textarea.style.borderRadius = "6px";
    textarea.style.background = "#ffffff";
    textarea.style.color = "#1f2933";
    textarea.style.font = "inherit";
    textarea.style.lineHeight = "1.45";
    textarea.style.resize = "vertical";

    wrapper.appendChild(label);
    wrapper.appendChild(textarea);
    form.insertBefore(wrapper, submitControl);
  }

  function ensureLeadDisclosures(form, formName) {
    if (isReviewForm(formName)) {
      return;
    }

    const submitControl = findSubmitControl(form);

    if (!submitControl) {
      return;
    }

    const additions = [];
    const isBusinessInquiry = isBusinessInquiryForm(form, formName);

    if (!isBusinessInquiry && !hasContactConsentField(form)) {
      additions.push(createConsentBlock(
        "estimate_contact_consent",
        true,
        "I agree to be contacted by phone, text, or email about my estimate request."
      ));
    }

    if (!isBusinessInquiry && !findNamedField(form, "email_marketing_opt_in")) {
      additions.push(createConsentBlock(
        "email_marketing_opt_in",
        false,
        "Send me occasional project tips, seasonal reminders, and local deals by email. I can unsubscribe anytime."
      ));
    }

    if (!hasLegalLinks(form) && !form.querySelector('[data-lead-legal-note="true"]')) {
      additions.push(createLegalNote());
    }

    additions.forEach(function (node) {
      form.insertBefore(node, submitControl);
    });
  }

  function populateTracking(form, snapshot) {
    const formName = getFormName(form);
    const formSlug = slugify(formName);
    const pageUrl = window.location.href;
    const thankYouUrl = siteOrigin + "/thank-you.html?src=form&form=" + encodeURIComponent(formSlug);

    applyRouting(form, formName);
    applyReplyTo(form);
    ensureHiddenField(form, "_captcha", "false");
    ensureHiddenField(form, "_template", "table");
    ensureHiddenField(form, "_next", thankYouUrl);
    ensureHiddenField(form, "_blacklist", routing.blacklist);
    ensureHiddenField(form, "form_name", formName);
    ensureHiddenField(form, "form_slug", formSlug);
    ensureHiddenField(form, "page_title", document.title || "");
    ensureHiddenField(form, "page_url", pageUrl);
    ensureHiddenField(form, "page_path", window.location.pathname);
    ensureHiddenField(form, "lead_source", snapshot.currentSource.source);
    ensureHiddenField(form, "lead_source_detail", snapshot.currentSource.detail);
    ensureHiddenField(form, "first_touch_source", snapshot.firstTouch.source);
    ensureHiddenField(form, "first_touch_detail", snapshot.firstTouch.detail);
    ensureHiddenField(form, "landing_page", snapshot.firstTouch.page);
    ensureHiddenField(form, "landing_path", snapshot.firstTouch.path);
    ensureHiddenField(form, "referrer", document.referrer || "");
    ensureHiddenField(form, "first_referrer", snapshot.firstTouch.referrer || "");
    ensureHiddenField(form, "utm_source", snapshot.firstTouch.utmSource || snapshot.params.get("utm_source") || "");
    ensureHiddenField(form, "utm_medium", snapshot.firstTouch.utmMedium || snapshot.params.get("utm_medium") || "");
    ensureHiddenField(form, "utm_campaign", snapshot.firstTouch.utmCampaign || snapshot.params.get("utm_campaign") || "");
    ensureHiddenField(form, "utm_term", snapshot.firstTouch.utmTerm || snapshot.params.get("utm_term") || "");
    ensureHiddenField(form, "utm_content", snapshot.firstTouch.utmContent || snapshot.params.get("utm_content") || "");
    ensureHiddenField(form, "gclid", snapshot.firstTouch.gclid || snapshot.params.get("gclid") || "");
    ensureHiddenField(form, "fbclid", snapshot.firstTouch.fbclid || snapshot.params.get("fbclid") || "");
    ensureHiddenField(form, "msclkid", snapshot.firstTouch.msclkid || snapshot.params.get("msclkid") || "");
    ensureHiddenField(form, "oppref", snapshot.firstTouch.oppref || snapshot.params.get("oppref") || "");
    ensureHiddenField(form, "lead_session_id", snapshot.sessionId);
    ensureHiddenField(form, "submission_time_local", new Date().toLocaleString());
    ensureHiddenField(form, "submission_time_utc", new Date().toISOString());
    ensureHoneyField(form);
  }

  function trackSubmit(snapshot, formName) {
    if (typeof window.gtag !== "function") {
      return;
    }

    window.gtag("event", "generate_lead", {
      event_category: "lead_form",
      event_label: formName,
      lead_source: snapshot.currentSource.source,
      first_touch_source: snapshot.firstTouch.source,
      page_location: window.location.href
    });
  }

  // ── Primary delivery: Apps Script handles email + Sheet + optional SMS ─────
  function collectFormData(form) {
    const data = {};
    const fd = new FormData(form);
    fd.forEach(function (value, key) {
      if (typeof File !== "undefined" && value instanceof File) {
        if (value.name) {
          data[key] = value.name;
        }
        return;
      }
      data[key] = value;
    });
    return data;
  }

  function firstPayloadValue(data, names) {
    for (let i = 0; i < names.length; i += 1) {
      const value = data[names[i]];
      if (value !== undefined && value !== null && String(value).trim()) {
        return String(value).trim();
      }
    }
    return "";
  }

  function applyEnrichment(form, data, result) {
    const fields = {
      qualification_mode: result.ai ? "workers-ai" : "guided-fallback",
      ai_lead_score: result.score,
      ai_priority: result.priority,
      ai_summary: result.summary,
      ai_follow_up_question: result.follow_up_question,
      recommended_next_step: result.recommended_next_step,
      suggested_reply: result.suggested_reply,
      qualification_reasons: Array.isArray(result.reasons) ? result.reasons.join(", ") : "",
      lead_type: result.lead_type,
      spam_risk: result.spam_risk,
      spam_reasons: Array.isArray(result.spam_reasons) ? result.spam_reasons.join(", ") : "",
      lead_urgency: result.urgency,
      missing_fields: Array.isArray(result.missing_fields) ? result.missing_fields.join(", ") : "",
      routing_lane: data.routing_lane || result.routing_lane
    };

    Object.keys(fields).forEach(function (name) {
      const value = fields[name];
      if (value === undefined || value === null || value === "") return;
      data[name] = String(value);
      ensureHiddenField(form, name, String(value));
    });
    return data;
  }

  function enrichLeadPayload(form, data) {
    if (!LEAD_CONCIERGE_ENDPOINT || data.ai_summary || isReviewForm(getFormName(form))) {
      return Promise.resolve(data);
    }

    const project = {
      session_id: firstPayloadValue(data, ["lead_session_id", "concierge_session_id"]) || createId(),
      service: firstPayloadValue(data, ["service", "service_needed", "project", "project_type", "job_type"]),
      city: firstPayloadValue(data, ["city", "location", "service_area"]),
      timeline: firstPayloadValue(data, ["timeline", "preferred_timing"]),
      budget_range: firstPayloadValue(data, ["budget_range", "budget"]),
      details: firstPayloadValue(data, ["details", "message", "description", "project_details", "notes"]),
      page_path: data.page_path || window.location.pathname,
      lead_source: data.lead_source || "direct",
      routing_lane: data.routing_lane || "All-Pro First"
    };

    if (!project.service || !project.city || !project.details) {
      return Promise.resolve(data);
    }

    const request = fetch(LEAD_CONCIERGE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(project),
      credentials: "same-origin"
    }).then(function (response) {
      if (!response.ok) throw new Error("Lead enrichment unavailable");
      return response.json();
    }).then(function (result) {
      return result && result.ok ? applyEnrichment(form, data, result) : data;
    }).catch(function () {
      return data;
    });

    return Promise.race([
      request,
      new Promise(function (resolve) { setTimeout(function () { resolve(data); }, 2800); })
    ]);
  }

  function selectedProjectPhoto(form) {
    const input = form.querySelector('input[type="file"][name="project_photo"]');
    return input && input.files && input.files.length ? input.files[0] : null;
  }

  function validateProjectPhoto(form) {
    const input = form.querySelector('input[type="file"][name="project_photo"]');
    const file = selectedProjectPhoto(form);
    if (!input || !file) {
      return true;
    }

    input.setCustomValidity("");
    if (file.type && file.type.indexOf("image/") !== 0) {
      input.setCustomValidity("Please choose an image file.");
    } else if (file.size > MAX_PROJECT_PHOTO_BYTES) {
      input.setCustomValidity("Please choose a photo smaller than 5 MB.");
    }

    if (!input.checkValidity()) {
      input.reportValidity();
      return false;
    }
    return true;
  }

  function selectedApplicantResume(form) {
    const input = form.querySelector('input[type="file"][name="applicant_resume"]');
    return input && input.files && input.files.length ? input.files[0] : null;
  }

  function validateApplicantResume(form) {
    const input = form.querySelector('input[type="file"][name="applicant_resume"]');
    const file = selectedApplicantResume(form);
    if (!input || !file) {
      return true;
    }

    input.setCustomValidity("");
    const name = String(file.name || "").toLowerCase();
    const allowedExtension = name.endsWith(".pdf") || name.endsWith(".docx");
    const allowedType = !file.type || file.type === "application/pdf" ||
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (!allowedExtension || !allowedType) {
      input.setCustomValidity("Please upload a PDF or DOCX resume.");
    } else if (file.size > MAX_APPLICANT_RESUME_BYTES) {
      input.setCustomValidity("Please choose a resume smaller than 5 MB.");
    }

    if (!input.checkValidity()) {
      input.reportValidity();
      return false;
    }
    return true;
  }

  function addProjectPhotoPayload(form, data) {
    const file = selectedProjectPhoto(form);
    if (!file) {
      return Promise.resolve(data);
    }

    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () {
        const result = String(reader.result || "");
        const comma = result.indexOf(",");
        if (comma < 0) {
          reject(new Error("The selected project photo could not be read."));
          return;
        }
        data.project_photo_name = file.name || "project-photo";
        data.project_photo_type = file.type || "application/octet-stream";
        data.project_photo_base64 = result.substring(comma + 1);
        resolve(data);
      };
      reader.onerror = function () {
        reject(new Error("The selected project photo could not be read."));
      };
      reader.readAsDataURL(file);
    });
  }

  function addApplicantResumePayload(form, data) {
    const file = selectedApplicantResume(form);
    if (!file) {
      return Promise.resolve(data);
    }

    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () {
        const result = String(reader.result || "");
        const comma = result.indexOf(",");
        if (comma < 0) {
          reject(new Error("The selected resume could not be read."));
          return;
        }
        data.applicant_resume_name = file.name || "resume";
        data.applicant_resume_type = file.type || "application/octet-stream";
        data.applicant_resume_base64 = result.substring(comma + 1);
        resolve(data);
      };
      reader.onerror = function () {
        reject(new Error("The selected resume could not be read."));
      };
      reader.readAsDataURL(file);
    });
  }

  function encodeForEndpoint(data) {
    const params = new URLSearchParams();
    const skipKeys = {
      "_blacklist": true,
      "_captcha": true,
      "_cc": true,
      "_next": true,
      "_subject": true,
      "_template": true
    };
    Object.keys(data).forEach(function (key) {
      if (skipKeys[key]) {
        return;
      }
      if (data[key] !== undefined && data[key] !== null) {
        const value = String(data[key]).trim();
        if (value || key === "_honey") {
          params.append(key, value);
        }
      }
    });
    return params;
  }

  function postToEndpoint(data) {
    return fetch(CUSTOM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: encodeForEndpoint(data).toString(),
      keepalive: true
    }).then(function (response) {
      if (!response.ok) {
        throw new Error("All-Pro form endpoint returned HTTP " + response.status);
      }
      return response.json();
    }).then(function (result) {
      if (!result || result.ok !== true) {
        throw new Error("All-Pro form endpoint did not confirm delivery");
      }
      return result;
    });
  }

  function submitToCustomEndpoint(form, snapshot) {
    ensureLeadDisclosures(form, getFormName(form));
    populateTracking(form, snapshot);
    const data = collectFormData(form);
    const nextUrl = data["_next"] || (siteOrigin + "/thank-you.html?src=form");
    return enrichLeadPayload(form, data).then(function (enriched) {
      return addProjectPhotoPayload(form, enriched);
    }).then(function (withPhoto) {
      return addApplicantResumePayload(form, withPhoto);
    }).then(function (payload) {
      return postToEndpoint(payload);
    }).then(function (result) {
      return result.redirect || nextUrl;
    });
  }

  function setSubmitState(form, isSending) {
    const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
    if (!submitBtn) {
      return;
    }
    submitBtn.disabled = isSending;
    if (submitBtn.textContent) {
      submitBtn.textContent = isSending ? "Sending..." : (submitBtn.getAttribute("data-original-text") || submitBtn.textContent);
    }
  }

  function nativeSubmit(form) {
    if (HTMLFormElement.prototype.submit) {
      HTMLFormElement.prototype.submit.call(form);
      return;
    }
    form.submit();
  }

  function shortTimeout(ms) {
    return new Promise(function (_, reject) {
      setTimeout(function () {
        reject(new Error("All-Pro form endpoint timed out"));
      }, ms);
    });
  }

  function interceptForm(form, snapshot) {
    form.addEventListener("submit", function (event) {
      ensureLeadDisclosures(form, getFormName(form));
      populateTracking(form, snapshot);
      trackSubmit(snapshot, getFormName(form));

      if (!validateProjectPhoto(form)) {
        event.preventDefault();
        return;
      }

      if (!validateApplicantResume(form)) {
        event.preventDefault();
        return;
      }

      if (!CUSTOM_ENDPOINT || form.dataset.allproNativeSubmit === "true") {
        return; // no custom endpoint set — let native FormSubmit POST happen
      }

      event.preventDefault();
      if (form.dataset.allproSubmitting === "true") {
        return;
      }

      form.dataset.allproSubmitting = "true";
      setSubmitState(form, true);

      Promise.race([
        submitToCustomEndpoint(form, snapshot),
        shortTimeout(11000)
      ]).then(function (nextUrl) {
        window.location.assign(nextUrl);
      }).catch(function (error) {
        console.error("Primary All-Pro form delivery failed; trying FormSubmit fallback.", error);
        form.dataset.allproNativeSubmit = "true";
        nativeSubmit(form);
      });
    });
  }

  function registerForm(form, snapshot) {
    if (!form || initializedForms.has(form)) {
      return;
    }

    initializedForms.add(form);
    form.setAttribute("data-allpro-lead-form-ready", "true");

    var submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
    if (submitBtn && submitBtn.textContent) {
      submitBtn.setAttribute("data-original-text", submitBtn.textContent.trim());
    }
    ensureProjectDescriptionField(form, getFormName(form));
    requireHomeownerLeadDetails(form, getFormName(form));
    ensureLeadDisclosures(form, getFormName(form));
    populateTracking(form, snapshot);
    interceptForm(form, snapshot);
  }

  function watchForForms(snapshot) {
    if (typeof MutationObserver !== "function") {
      return;
    }

    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (!node || node.nodeType !== 1) {
            return;
          }

          if (node.matches && node.matches(formSelector)) {
            registerForm(node, snapshot);
          }

          if (node.querySelectorAll) {
            node.querySelectorAll(formSelector).forEach(function (form) {
              registerForm(form, snapshot);
            });
          }
        });
      });
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function init() {
    const forms = document.querySelectorAll(formSelector);
    const storage = safeStorage();
    const params = readQueryParams();
    const currentSource = deriveSource(params, document.referrer || "");
    const firstTouch = getFirstTouch(storage, params, currentSource);
    const sessionId = getSessionId(storage);
    const snapshot = {
      params,
      currentSource,
      firstTouch,
      sessionId
    };

    forms.forEach(function (form) {
      registerForm(form, snapshot);
    });
    watchForForms(snapshot);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
