(function () {
  const siteOrigin = "https://allprometroeastconstruction.com";
  const formSelector = 'form[action*="formsubmit.co/"]';

  // ── Custom endpoint (Google Apps Script Web App) ───────────────────────────
  // Set this after deploying allpro-form-handler.gs.
  // Leave empty to use FormSubmit only.
  const CUSTOM_ENDPOINT = "https://script.google.com/macros/s/AKfycbyiF6ZHsk699T7x3sillL8Vevmaywb9Mvhm9RsIsmSDMmOjQkyhPN8wvpBfMb56bh_Shg/exec";
  // ──────────────────────────────────────────────────────────────────────────

  const routing = {
    leadInbox: "https://formsubmit.co/williamosessionallpro@gmail.com",
    leadInboxEmail: "williamosessionallpro@gmail.com",
    reviewInbox: "https://formsubmit.co/tonybeal40@gmail.com",
    ownerCopy: "tonybeal40@gmail.com",
    smsCopies: [
      "6185810676@tmomail.net",
      "6185810676@txt.att.net",
      "6185810676@vtext.com",
      "6185810676@email.uscc.net"
    ],
    blacklist: "viagra,casino,payday loan,crypto investment,seo service"
  };
  const storageKeys = {
    sessionId: "allpro_lead_session_id",
    firstTouch: "allpro_first_touch"
  };

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
      msclkid: params.get("msclkid") || ""
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

  function wantsSmsCopies(formName) {
    return /contact page|get-quote page/i.test(formName) || /contact\.html$|get-quote\.html$/i.test(window.location.pathname);
  }

  function applyRouting(form, formName) {
    if (isReviewForm(formName)) {
      form.action = routing.reviewInbox;
      ensureHiddenField(form, "_cc", uniqueEmails([routing.leadInboxEmail]).join(","));
      return;
    }

    const ccList = [routing.ownerCopy];

    if (wantsSmsCopies(formName)) {
      ccList.push.apply(ccList, routing.smsCopies);
    }

    form.action = routing.leadInbox;
    ensureHiddenField(form, "_cc", uniqueEmails(ccList).join(","));
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

  function ensureLeadDisclosures(form, formName) {
    if (isReviewForm(formName)) {
      return;
    }

    const submitControl = findSubmitControl(form);

    if (!submitControl) {
      return;
    }

    const additions = [];

    if (!findNamedField(form, "estimate_contact_consent")) {
      additions.push(createConsentBlock(
        "estimate_contact_consent",
        true,
        "I agree to be contacted by phone, text, or email about my estimate request."
      ));
    }

    if (!findNamedField(form, "email_marketing_opt_in")) {
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

  // ── Dual-submit: try custom endpoint first, fall back to FormSubmit ─────────
  function collectFormData(form) {
    const data = {};
    const fd = new FormData(form);
    fd.forEach(function (value, key) {
      data[key] = value;
    });
    return data;
  }

  function submitToCustomEndpoint(form, snapshot) {
    return new Promise(function (resolve, reject) {
      ensureLeadDisclosures(form, getFormName(form));
      populateTracking(form, snapshot);
      const data = collectFormData(form);
      const nextUrl = data["_next"] || (siteOrigin + "/thank-you.html?src=form");

      fetch(CUSTOM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })
        .then(function (res) {
          if (!res.ok) { reject(new Error("Custom endpoint HTTP " + res.status)); return; }
          return res.json();
        })
        .then(function (json) {
          if (json && json.ok) {
            resolve(json.redirect || nextUrl);
          } else {
            reject(new Error("Custom endpoint returned ok=false"));
          }
        })
        .catch(reject);
    });
  }

  function interceptForm(form, snapshot) {
    form.addEventListener("submit", function (event) {
      ensureLeadDisclosures(form, getFormName(form));
      populateTracking(form, snapshot);
      trackSubmit(snapshot, getFormName(form));

      if (!CUSTOM_ENDPOINT) {
        return; // no custom endpoint set — let native FormSubmit POST happen
      }

      // Fire custom endpoint for Sheet logging only (non-blocking, no redirect)
      // FormSubmit still handles the actual form POST + email
      submitToCustomEndpoint(form, snapshot).catch(function () {
        console.warn("Custom endpoint logging failed — FormSubmit handles email.");
      });

      // Always let FormSubmit POST proceed normally (handles email to Bill)
    });
  }

  function init() {
    const forms = document.querySelectorAll(formSelector);

    if (!forms.length) {
      return;
    }

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
      var submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
      if (submitBtn && submitBtn.textContent) {
        submitBtn.setAttribute("data-original-text", submitBtn.textContent.trim());
      }
      ensureLeadDisclosures(form, getFormName(form));
      populateTracking(form, snapshot);
      interceptForm(form, snapshot);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
