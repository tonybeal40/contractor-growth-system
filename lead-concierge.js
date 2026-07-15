(function () {
  const endpoint = "https://lead-api.allprometroeastconstruction.com";
  const formAction = "https://formsubmit.co/williamosessionallpro@gmail.com";
  const totalSteps = 6;
  const serviceOptions = [
    "Kitchen remodel",
    "Bathroom remodel",
    "Deck or outdoor living",
    "Landscaping",
    "Concrete or patio",
    "Other home project"
  ];
  const cityOptions = [
    "Belleville",
    "O'Fallon",
    "Shiloh or Swansea",
    "Edwardsville or Glen Carbon",
    "Another Metro East city"
  ];
  const fallbackQuestions = {
    "Kitchen remodel": "What matters most in the kitchen: layout, cabinets, counters, flooring, or a complete update?",
    "Bathroom remodel": "Is the main need a shower, tub, tile, vanity, layout change, or moisture repair?",
    "Deck or outdoor living": "Is this a new build, replacement, repair, or an outdoor living upgrade?",
    "Landscaping": "Is the priority cleanup, planting, drainage, retaining walls, mulch, rock, or ongoing care?",
    "Concrete or patio": "Is this a new patio or walkway, replacement, repair, drainage fix, or concrete pad?",
    "Other home project": "What is the biggest problem you want the finished project to solve?"
  };

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function createSessionId() {
    const key = "allpro_concierge_session_id";
    try {
      const existing = window.localStorage.getItem(key);
      if (existing) return existing;
      const created = window.crypto && typeof window.crypto.randomUUID === "function"
        ? "concierge-" + window.crypto.randomUUID()
        : "concierge-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      window.localStorage.setItem(key, created);
      return created;
    } catch (error) {
      return "concierge-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    }
  }

  function inferContext() {
    const path = window.location.pathname.toLowerCase();
    let service = "";
    let city = "";
    if (path.indexOf("kitchen") !== -1) service = "Kitchen remodel";
    if (path.indexOf("bathroom") !== -1) service = "Bathroom remodel";
    if (path.indexOf("belleville") !== -1) city = "Belleville";
    if (path.indexOf("ofallon") !== -1) city = "O'Fallon";
    return { service, city };
  }

  function choiceMarkup(name, options, selected) {
    return options.map(function (option) {
      const id = "alc-" + name + "-" + option.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      return '<label class="alc-choice" for="' + id + '">' +
        '<input id="' + id + '" type="radio" name="' + name + '" value="' + escapeHtml(option) + '"' +
        (option === selected ? " checked" : "") + ' required>' +
        '<span>' + escapeHtml(option) + '</span></label>';
    }).join("");
  }

  function fallbackSummary(data) {
    let summary = (data.service || "Home project") + " in " + (data.city || "Metro East");
    if (data.timeline) summary += " with a " + data.timeline.toLowerCase() + " timeline";
    if (data.budget_range) summary += " and a stated budget of " + data.budget_range;
    if (data.details) summary += ". " + data.details;
    return summary.slice(0, 420);
  }

  function scoreLead(data) {
    let score = 5;
    const reasons = [];
    const service = String(data.service || "").toLowerCase();
    const city = String(data.city || "").toLowerCase();
    const timeline = String(data.timeline || "").toLowerCase();
    const budget = String(data.budget_range || "").toLowerCase();

    if (/kitchen|bathroom/.test(service)) {
      score += 30;
      reasons.push("priority remodel service");
    } else if (/deck|outdoor|concrete|patio/.test(service)) {
      score += 22;
      reasons.push("strong project service");
    } else if (service) {
      score += 12;
      reasons.push("service selected");
    }

    if (/belleville|o'fallon|ofallon/.test(city)) {
      score += 25;
      reasons.push("priority service city");
    } else if (city) {
      score += 14;
      reasons.push("Metro East location provided");
    }

    if (/as soon|asap|this month|right away/.test(timeline)) {
      score += 20;
      reasons.push("near-term timeline");
    } else if (/1-3|this season/.test(timeline)) {
      score += 12;
      reasons.push("active planning timeline");
    } else if (timeline) {
      score += 5;
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

    if (String(data.details || "").length >= 80) {
      score += 5;
      reasons.push("useful project detail");
    }

    score = Math.min(100, score);
    return {
      score: score,
      priority: score >= 80 ? "Hot" : score >= 55 ? "Warm" : "Standard",
      reasons: reasons
    };
  }

  function ensureStylesheet() {
    if (document.querySelector('link[href*="lead-concierge.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/lead-concierge.css?v=20260714a";
    document.head.appendChild(link);
  }

  function track(name, parameters) {
    if (typeof window.gtag === "function") {
      window.gtag("event", name, parameters || {});
    }
  }

  function init() {
    if (!document.body || document.querySelector(".alc-launcher")) return;
    ensureStylesheet();

    const context = inferContext();
    const sessionId = createSessionId();
    let currentStep = 0;
    let lastFocus = null;
    let qualification = {
      ai: false,
      follow_up_question: fallbackQuestions[context.service] || fallbackQuestions["Other home project"],
      summary: "",
      recommended_next_step: "Review the request and contact the homeowner about a written estimate.",
      score: 0,
      priority: "Standard",
      reasons: []
    };

    const launcher = document.createElement("button");
    launcher.type = "button";
    launcher.className = "alc-launcher";
    launcher.textContent = "Plan My Project";
    launcher.setAttribute("aria-haspopup", "dialog");
    launcher.setAttribute("aria-controls", "alc-dialog");

    const backdrop = document.createElement("div");
    backdrop.className = "alc-backdrop";
    backdrop.hidden = true;
    backdrop.innerHTML = '<section id="alc-dialog" class="alc-dialog" role="dialog" aria-modal="true" aria-labelledby="alc-title" aria-describedby="alc-status">' +
      '<header class="alc-dialog-header">' +
        '<p class="alc-eyebrow">Project planning</p>' +
        '<h2 id="alc-title" class="alc-dialog-title">Get a clearer next step</h2>' +
        '<p id="alc-status" class="alc-status" aria-live="polite">Guided project intake is ready.</p>' +
        '<button class="alc-close" type="button" aria-label="Close project concierge">\u00d7</button>' +
      '</header>' +
      '<div class="alc-progress" aria-hidden="true"><span class="alc-progress-bar"></span></div>' +
      '<form class="alc-form" action="' + formAction + '" method="post" data-form="AI Project Concierge">' +
        '<input type="hidden" name="_subject" value="New All-Pro Project Concierge Lead">' +
        '<input type="hidden" name="lead_entry_point" value="Project Concierge">' +
        '<input type="hidden" name="routing_lane" value="All-Pro First">' +
        '<input type="hidden" name="concierge_session_id" value="' + escapeHtml(sessionId) + '">' +
        '<input type="hidden" name="qualification_mode" value="guided-fallback">' +
        '<input type="hidden" name="ai_lead_score" value="">' +
        '<input type="hidden" name="ai_priority" value="">' +
        '<input type="hidden" name="ai_summary" value="">' +
        '<input type="hidden" name="ai_follow_up_question" value="">' +
        '<input type="hidden" name="recommended_next_step" value="">' +
        '<input type="hidden" name="qualification_reasons" value="">' +
        '<fieldset class="alc-step" data-step="0">' +
          '<legend>What would you like help with?</legend>' +
          '<p class="alc-step-copy">Choose the closest project type. You can explain the details in a moment.</p>' +
          '<div class="alc-choice-grid">' + choiceMarkup("service", serviceOptions, context.service) + '</div>' +
        '</fieldset>' +
        '<fieldset class="alc-step" data-step="1" hidden>' +
          '<legend>Where is the project?</legend>' +
          '<p class="alc-step-copy">All-Pro serves Belleville, O\'Fallon, and nearby Metro East communities.</p>' +
          '<div class="alc-choice-grid">' + choiceMarkup("city", cityOptions, context.city) + '</div>' +
        '</fieldset>' +
        '<fieldset class="alc-step" data-step="2" hidden>' +
          '<legend>How far along are you?</legend>' +
          '<p class="alc-step-copy">Timing and budget range help Bill prepare for the first conversation. "Not sure" is fine.</p>' +
          '<div class="alc-field-grid">' +
            '<div class="alc-field"><label for="alc-timeline">Preferred timing</label><select id="alc-timeline" name="timeline" required>' +
              '<option value="">Choose timing</option><option>As soon as possible</option><option>Within 1-3 months</option><option>This season</option><option>Just researching</option>' +
            '</select></div>' +
            '<div class="alc-field"><label for="alc-budget">Working budget</label><select id="alc-budget" name="budget_range" required>' +
              '<option value="">Choose a range</option><option>Under $5,000</option><option>$5,000-$10,000</option><option>$10,000-$25,000</option><option>$25,000 or more</option><option>Not sure yet</option>' +
            '</select></div>' +
          '</div>' +
        '</fieldset>' +
        '<fieldset class="alc-step" data-step="3" hidden>' +
          '<legend>Tell us what needs to change</legend>' +
          '<p class="alc-step-copy">Mention the current condition, the result you want, and any repair concerns you already know about.</p>' +
          '<div class="alc-field"><label for="alc-details">Project details</label><textarea id="alc-details" name="details" minlength="15" maxlength="1200" required placeholder="Example: We want to replace the shower, repair a soft floor area, and update the vanity and tile."></textarea></div>' +
        '</fieldset>' +
        '<fieldset class="alc-step" data-step="4" hidden>' +
          '<legend>One useful follow-up</legend>' +
          '<p class="alc-step-copy">This helps turn your request into a useful project brief instead of a vague form email.</p>' +
          '<p class="alc-ai-question" id="alc-question">' + escapeHtml(qualification.follow_up_question) + '</p>' +
          '<label class="alc-question-label" for="alc-answer">Your answer (optional)</label>' +
          '<textarea class="alc-question-answer" id="alc-answer" name="ai_follow_up_answer" maxlength="700" placeholder="Add anything Bill should know before calling."></textarea>' +
        '</fieldset>' +
        '<fieldset class="alc-step" data-step="5" hidden>' +
          '<legend>Where should Bill follow up?</legend>' +
          '<p class="alc-step-copy">Your phone number is required for the estimate request. Email is optional.</p>' +
          '<div class="alc-summary"><strong>Your project brief</strong><p id="alc-summary-text">Your answers will appear here.</p></div>' +
          '<div class="alc-field-grid">' +
            '<div class="alc-field alc-field-full"><label for="alc-name">Full name</label><input id="alc-name" name="full_name" type="text" autocomplete="name" required></div>' +
            '<div class="alc-field"><label for="alc-phone">Phone</label><input id="alc-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" required></div>' +
            '<div class="alc-field"><label for="alc-email">Email (optional)</label><input id="alc-email" name="email" type="email" autocomplete="email"></div>' +
          '</div>' +
          '<label class="alc-consent"><input name="estimate_contact_consent" type="checkbox" value="yes" required><span>I agree to be contacted by phone, text, or email about this estimate request.</span></label>' +
          '<label class="alc-consent"><input name="email_marketing_opt_in" type="checkbox" value="yes"><span>Email me occasional project tips and local offers.</span></label>' +
          '<p class="alc-legal">Free request. No obligation. Your information is not sold. See our <a href="/privacy.html">Privacy Policy</a> and <a href="/terms.html">Terms</a>.</p>' +
        '</fieldset>' +
        '<div class="alc-actions">' +
          '<button class="alc-button alc-button-secondary alc-back" type="button" hidden>Back</button>' +
          '<p class="alc-error" role="alert"></p>' +
          '<button class="alc-button alc-button-primary alc-next" type="button">Continue</button>' +
          '<button class="alc-button alc-button-primary alc-submit" type="submit" hidden>Send My Project Request</button>' +
        '</div>' +
      '</form>' +
    '</section>';

    const launcherMount = document.querySelector(".home-hero-actions, .remodel-hero-actions") || document.body;
    launcherMount.appendChild(launcher);
    document.body.appendChild(backdrop);

    const dialog = backdrop.querySelector(".alc-dialog");
    const form = backdrop.querySelector(".alc-form");
    const closeButton = backdrop.querySelector(".alc-close");
    const backButton = backdrop.querySelector(".alc-back");
    const nextButton = backdrop.querySelector(".alc-next");
    const submitButton = backdrop.querySelector(".alc-submit");
    const errorNode = backdrop.querySelector(".alc-error");
    const statusNode = backdrop.querySelector(".alc-status");
    const progressBar = backdrop.querySelector(".alc-progress-bar");
    const questionNode = backdrop.querySelector("#alc-question");
    const summaryNode = backdrop.querySelector("#alc-summary-text");

    function field(name) {
      return form.elements.namedItem(name);
    }

    function selected(name) {
      const item = form.querySelector('input[name="' + name + '"]:checked');
      return item ? item.value : "";
    }

    function projectData() {
      return {
        session_id: sessionId,
        service: selected("service"),
        city: selected("city"),
        timeline: field("timeline").value,
        budget_range: field("budget_range").value,
        details: field("details").value.trim(),
        page_path: window.location.pathname
      };
    }

    function setHidden(name, value) {
      const input = field(name);
      if (input) input.value = String(value || "");
    }

    function showStep(step) {
      currentStep = Math.max(0, Math.min(totalSteps - 1, step));
      form.querySelectorAll(".alc-step").forEach(function (node) {
        node.hidden = Number(node.getAttribute("data-step")) !== currentStep;
      });
      backButton.hidden = currentStep === 0;
      nextButton.hidden = currentStep === totalSteps - 1;
      submitButton.hidden = currentStep !== totalSteps - 1;
      progressBar.style.width = ((currentStep + 1) / totalSteps * 100) + "%";
      errorNode.textContent = "";
      const stepNode = form.querySelector('.alc-step[data-step="' + currentStep + '"]');
      const firstControl = stepNode.querySelector("input:checked, input:not([type=hidden]), select, textarea");
      window.setTimeout(function () {
        if (firstControl) firstControl.focus({ preventScroll: true });
      }, 40);
    }

    function validateStep() {
      const stepNode = form.querySelector('.alc-step[data-step="' + currentStep + '"]');
      const controls = Array.from(stepNode.querySelectorAll("input, select, textarea"));
      const invalid = controls.find(function (control) { return !control.checkValidity(); });
      if (invalid) {
        invalid.reportValidity();
        errorNode.textContent = "Please complete this step before continuing.";
        return false;
      }
      return true;
    }

    function applyQualification(result, data) {
      const local = scoreLead(data);
      qualification = {
        ai: Boolean(result && result.ai),
        follow_up_question: result && result.follow_up_question
          ? String(result.follow_up_question).slice(0, 180)
          : (fallbackQuestions[data.service] || fallbackQuestions["Other home project"]),
        summary: result && result.summary ? String(result.summary).slice(0, 420) : fallbackSummary(data),
        recommended_next_step: result && result.recommended_next_step
          ? String(result.recommended_next_step).slice(0, 240)
          : "Review the request and contact the homeowner about a written estimate.",
        score: result && Number.isFinite(Number(result.score)) ? Number(result.score) : local.score,
        priority: result && result.priority ? String(result.priority) : local.priority,
        reasons: result && Array.isArray(result.reasons) ? result.reasons : local.reasons
      };
      questionNode.textContent = qualification.follow_up_question;
      summaryNode.textContent = qualification.summary;
      setHidden("qualification_mode", qualification.ai ? "workers-ai" : "guided-fallback");
      setHidden("ai_lead_score", qualification.score);
      setHidden("ai_priority", qualification.priority);
      setHidden("ai_summary", qualification.summary);
      setHidden("ai_follow_up_question", qualification.follow_up_question);
      setHidden("recommended_next_step", qualification.recommended_next_step);
      setHidden("qualification_reasons", qualification.reasons.join(", "));
      statusNode.textContent = qualification.ai
        ? "AI-assisted project brief ready."
        : "Guided project brief ready.";
    }

    async function qualifyProject() {
      const data = projectData();
      nextButton.disabled = true;
      nextButton.textContent = "Preparing...";
      statusNode.textContent = "Preparing one useful follow-up question.";

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
          credentials: "same-origin"
        });
        if (!response.ok) throw new Error("Qualification endpoint unavailable");
        applyQualification(await response.json(), data);
      } catch (error) {
        applyQualification(null, data);
      } finally {
        nextButton.disabled = false;
        nextButton.textContent = "Continue";
      }
    }

    function openDialog() {
      lastFocus = document.activeElement;
      backdrop.hidden = false;
      document.body.classList.add("alc-dialog-open");
      launcher.setAttribute("aria-expanded", "true");
      track("project_concierge_open", { page_path: window.location.pathname });
      showStep(currentStep);

      fetch(endpoint + "/health", { credentials: "same-origin" })
        .then(function (response) { return response.ok ? response.json() : null; })
        .then(function (result) {
          if (result && result.ai) statusNode.textContent = "AI qualification is available.";
        })
        .catch(function () {});
    }

    function closeDialog() {
      backdrop.hidden = true;
      document.body.classList.remove("alc-dialog-open");
      launcher.setAttribute("aria-expanded", "false");
      if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
    }

    launcher.addEventListener("click", openDialog);
    closeButton.addEventListener("click", closeDialog);
    backdrop.addEventListener("click", function (event) {
      if (event.target === backdrop) closeDialog();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !backdrop.hidden) closeDialog();
      if (event.key !== "Tab" || backdrop.hidden) return;
      const focusable = Array.from(dialog.querySelectorAll('button:not([hidden]):not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]'))
        .filter(function (node) { return node.offsetParent !== null; });
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    backButton.addEventListener("click", function () { showStep(currentStep - 1); });
    nextButton.addEventListener("click", async function () {
      if (!validateStep()) return;
      if (currentStep === 3) await qualifyProject();
      if (currentStep === 4) {
        const answer = field("ai_follow_up_answer").value.trim();
        if (answer) {
          const combined = (qualification.summary + " Follow-up: " + answer).slice(0, 600);
          setHidden("ai_summary", combined);
          summaryNode.textContent = combined;
        }
      }
      showStep(currentStep + 1);
    });

    form.addEventListener("submit", function () {
      const data = projectData();
      if (!qualification.summary) applyQualification(null, data);
      track("project_concierge_complete", {
        service: data.service,
        city: data.city,
        lead_priority: qualification.priority,
        qualification_mode: qualification.ai ? "workers-ai" : "guided-fallback"
      });
    });

    if (window.ALLPRO_CONCIERGE_AUTO_OPEN) {
      window.ALLPRO_CONCIERGE_AUTO_OPEN = false;
      window.setTimeout(function () { launcher.click(); }, 0);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
