(function () {
  "use strict";

  const STORAGE_KEY = "allpro-contractor-estimate-comparison-v1";
  const IDS = ["a", "b", "c"];
  const CHECKBOX_FIELDS = [
    "scope",
    "materials",
    "payments",
    "license",
    "warranty",
    "changes",
    "cleanup",
    "references"
  ];
  const WEIGHTS = {
    price: 5,
    deposit: 5,
    scope: 15,
    materials: 10,
    payments: 10,
    insurance: 15,
    permit: 10,
    license: 5,
    warranty: 10,
    changes: 5,
    cleanup: 5,
    references: 5
  };

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function cardFor(id) {
    return document.querySelector('[data-estimate="' + id + '"]');
  }

  function fieldFor(id, name) {
    const card = cardFor(id);
    return card ? card.querySelector('[data-field="' + name + '"]') : null;
  }

  function readField(id, name) {
    const input = fieldFor(id, name);
    if (!input) return "";
    if (input.type === "checkbox") return input.checked;
    return input.value;
  }

  function collectEstimate(id) {
    return {
      id: id,
      contractor: readField(id, "contractor").trim(),
      price: readField(id, "price"),
      deposit: readField(id, "deposit"),
      startDate: readField(id, "startDate"),
      duration: readField(id, "duration").trim(),
      insurance: readField(id, "insurance") || "unknown",
      permit: readField(id, "permit") || "unknown",
      scope: Boolean(readField(id, "scope")),
      materials: Boolean(readField(id, "materials")),
      payments: Boolean(readField(id, "payments")),
      license: Boolean(readField(id, "license")),
      warranty: Boolean(readField(id, "warranty")),
      changes: Boolean(readField(id, "changes")),
      cleanup: Boolean(readField(id, "cleanup")),
      references: Boolean(readField(id, "references")),
      notes: readField(id, "notes").trim()
    };
  }

  function isActive(estimate) {
    return Boolean(
      estimate.contractor ||
      estimate.price ||
      estimate.deposit ||
      estimate.startDate ||
      estimate.duration ||
      estimate.insurance !== "unknown" ||
      estimate.permit !== "unknown" ||
      estimate.notes ||
      CHECKBOX_FIELDS.some(function (name) { return estimate[name]; })
    );
  }

  function completenessScore(estimate) {
    let score = 0;
    if (estimate.price !== "" && Number(estimate.price) >= 0) score += WEIGHTS.price;
    if (estimate.deposit !== "" && Number(estimate.deposit) >= 0) score += WEIGHTS.deposit;
    if (estimate.scope) score += WEIGHTS.scope;
    if (estimate.materials) score += WEIGHTS.materials;
    if (estimate.payments) score += WEIGHTS.payments;
    if (estimate.insurance === "yes") score += WEIGHTS.insurance;
    if (estimate.permit !== "unknown") score += WEIGHTS.permit;
    if (estimate.license) score += WEIGHTS.license;
    if (estimate.warranty) score += WEIGHTS.warranty;
    if (estimate.changes) score += WEIGHTS.changes;
    if (estimate.cleanup) score += WEIGHTS.cleanup;
    if (estimate.references) score += WEIGHTS.references;
    return score;
  }

  function scoreLabel(score) {
    if (score >= 85) return "Very complete";
    if (score >= 65) return "Mostly documented";
    if (score >= 40) return "Needs clarification";
    return "Many details missing";
  }

  function displayName(estimate) {
    return estimate.contractor || "Estimate " + estimate.id.toUpperCase();
  }

  function formatMoney(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || value === "") return "Not entered";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(number);
  }

  function formatDate(value) {
    if (!value) return "Not entered";
    const date = new Date(value + "T12:00:00");
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    }).format(date);
  }

  function alertsFor(estimate) {
    const alerts = [];
    if (!estimate.scope) alerts.push("A detailed written scope is not confirmed.");
    if (estimate.insurance === "unknown") alerts.push("Current insurance documentation has not been confirmed.");
    if (estimate.insurance === "no") alerts.push("Insurance documentation was not provided.");
    if (estimate.permit === "unknown") alerts.push("Responsibility for permits is not stated.");
    if (!estimate.changes) alerts.push("A written change-order process is not confirmed.");
    if (estimate.price === "") alerts.push("The total estimate price is missing.");
    if (estimate.deposit !== "" && Number(estimate.deposit) > 50) {
      alerts.push("The deposit is more than half of the estimate. Ask why and review the payment terms carefully.");
    }
    return alerts;
  }

  function questionsFor(estimate) {
    const questions = [];
    if (!estimate.contractor) questions.push("What is the contractor's complete legal business name and contact information?");
    if (estimate.price === "") questions.push("What is the total price, and which taxes, fees, allowances, or exclusions can change it?");
    if (estimate.deposit === "") questions.push("What deposit is required, when is it due, and what does it pay for?");
    if (!estimate.scope) questions.push("Can you provide a detailed written scope showing what is included and excluded?");
    if (!estimate.materials) questions.push("Which material brands, quantities, finish levels, and allowances are included?");
    if (!estimate.payments) questions.push("Can each payment be tied to a clear project milestone instead of only a date?");
    if (estimate.insurance !== "yes") questions.push("Can you provide current insurance documentation that applies to this project?");
    if (estimate.permit === "unknown") questions.push("Does this project require a permit, and who will obtain and close it?");
    if (!estimate.license) questions.push("Which license or registration rules apply here, and how can I verify compliance?");
    if (!estimate.warranty) questions.push("What workmanship and product warranties apply, and what is excluded?");
    if (!estimate.changes) questions.push("How will extra work or hidden conditions be priced and approved before work continues?");
    if (!estimate.cleanup) questions.push("Who handles daily cleanup, final debris removal, and disposal fees?");
    if (!estimate.references) questions.push("Can I review recent comparable projects, genuine reviews, or customer references?");
    if (!estimate.startDate || !estimate.duration) questions.push("What is the expected start window and working duration, and what can delay it?");
    if (estimate.deposit !== "" && Number(estimate.deposit) > 50) questions.push("Why is the requested deposit above 50%, and how are my funds and materials documented?");
    return questions;
  }

  function renderCardStatus(estimate) {
    const scoreNode = document.querySelector('[data-score="' + estimate.id + '"]');
    const alertNode = document.querySelector('[data-alerts="' + estimate.id + '"]');
    if (!scoreNode || !alertNode) return;

    alertNode.replaceChildren();
    if (!isActive(estimate)) {
      scoreNode.textContent = "Not started";
      return;
    }

    const score = completenessScore(estimate);
    scoreNode.textContent = score + "/100 - " + scoreLabel(score);
    const alerts = alertsFor(estimate);
    if (!alerts.length) {
      alertNode.appendChild(element("p", "estimate-alert good", "No major documentation gaps are flagged by this checklist. Continue independent verification."));
      return;
    }
    alerts.forEach(function (message) {
      alertNode.appendChild(element("p", "estimate-alert", message));
    });
  }

  function addResultStat(card, label, value) {
    const row = element("div", "result-stat");
    row.appendChild(element("span", "", label));
    row.appendChild(element("strong", "", value));
    card.appendChild(row);
  }

  function renderResults(estimates) {
    const resultGrid = document.getElementById("result-grid");
    if (!resultGrid) return;
    resultGrid.replaceChildren();

    const active = estimates.filter(isActive).map(function (estimate) {
      return {
        estimate: estimate,
        score: completenessScore(estimate),
        alerts: alertsFor(estimate)
      };
    });

    if (!active.length) {
      resultGrid.appendChild(element("p", "empty-result", "Enter a contractor name or estimate amount above to begin."));
      return;
    }

    const bestScore = Math.max.apply(null, active.map(function (item) { return item.score; }));
    active.sort(function (left, right) { return right.score - left.score; });

    active.forEach(function (item) {
      const estimate = item.estimate;
      const card = element("article", "result-card" + (item.score === bestScore && active.length > 1 ? " best-documented" : ""));
      card.appendChild(element("small", "", item.score === bestScore && active.length > 1 ? "Most documented so far" : "Estimate " + estimate.id.toUpperCase()));
      card.appendChild(element("h3", "", displayName(estimate)));
      addResultStat(card, "Total", formatMoney(estimate.price));
      addResultStat(card, "Completeness", item.score + "/100");

      let depositText = "Not entered";
      if (estimate.deposit !== "") {
        depositText = Number(estimate.deposit) + "%";
        if (estimate.price !== "" && Number(estimate.price) > 0) {
          depositText += " (" + formatMoney(Number(estimate.price) * Number(estimate.deposit) / 100) + ")";
        }
      }
      addResultStat(card, "Deposit", depositText);
      addResultStat(card, "Start", formatDate(estimate.startDate));
      addResultStat(card, "Duration", estimate.duration || "Not entered");
      addResultStat(card, "Questions", String(questionsFor(estimate).length));
      card.appendChild(element("p", "", "This score compares written details only. It is not a recommendation or quality rating."));
      resultGrid.appendChild(card);
    });
  }

  function renderQuestions(estimates) {
    const list = document.getElementById("question-list");
    if (!list) return;
    list.replaceChildren();

    const active = estimates.filter(isActive);
    if (!active.length) {
      list.appendChild(element("p", "empty-result", "Questions will appear after you start an estimate."));
      return;
    }

    active.forEach(function (estimate) {
      const group = element("section", "question-group");
      group.appendChild(element("h3", "", displayName(estimate)));
      const questions = questionsFor(estimate);
      if (!questions.length) {
        group.appendChild(element("p", "", "This checklist is complete. Still verify the contractor, documents, agreement, and applicable local requirements independently."));
      } else {
        const ul = document.createElement("ul");
        questions.forEach(function (question) {
          ul.appendChild(element("li", "", question));
        });
        group.appendChild(ul);
      }
      list.appendChild(group);
    });
  }

  function recalculate() {
    const estimates = IDS.map(collectEstimate);
    estimates.forEach(renderCardStatus);
    renderResults(estimates);
    renderQuestions(estimates);
  }

  function serialize() {
    return {
      version: 1,
      savedAt: new Date().toISOString(),
      projectName: document.getElementById("project-name").value,
      projectLocation: document.getElementById("project-location").value,
      estimates: IDS.map(collectEstimate)
    };
  }

  function setStatus(message) {
    const status = document.getElementById("save-status");
    if (status) status.textContent = message;
  }

  function save() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serialize()));
      setStatus("Saved on this device. Nothing was uploaded or submitted.");
    } catch (error) {
      setStatus("This browser could not save the comparison. Printing still works.");
    }
  }

  function writeField(id, name, value) {
    const input = fieldFor(id, name);
    if (!input) return;
    if (input.type === "checkbox") input.checked = Boolean(value);
    else input.value = value === undefined || value === null ? "" : String(value);
  }

  function load() {
    let data;
    try {
      data = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    } catch (error) {
      data = null;
    }
    if (!data || data.version !== 1 || !Array.isArray(data.estimates)) return;

    document.getElementById("project-name").value = data.projectName || "";
    document.getElementById("project-location").value = data.projectLocation || "";
    data.estimates.forEach(function (estimate) {
      if (!estimate || IDS.indexOf(estimate.id) === -1) return;
      Object.keys(estimate).forEach(function (name) {
        if (name !== "id") writeField(estimate.id, name, estimate[name]);
      });
    });
    setStatus("Saved comparison restored from this device.");
  }

  function reset() {
    if (!window.confirm("Clear every estimate and remove the saved comparison from this device?")) return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      // The visible form can still be cleared if storage is unavailable.
    }
    document.getElementById("project-name").value = "";
    document.getElementById("project-location").value = "";
    IDS.forEach(function (id) {
      const card = cardFor(id);
      if (!card) return;
      card.querySelectorAll("input, select, textarea").forEach(function (input) {
        if (input.type === "checkbox") input.checked = false;
        else if (input.tagName === "SELECT") input.selectedIndex = 0;
        else input.value = "";
      });
    });
    setStatus("Comparison cleared. Nothing is stored or submitted.");
    recalculate();
  }

  function markUnsaved() {
    setStatus("Changes are on this screen only. Choose Save to keep them on this device.");
    recalculate();
  }

  function init() {
    load();
    recalculate();

    document.getElementById("comparison-tool").addEventListener("input", markUnsaved);
    document.getElementById("comparison-tool").addEventListener("change", markUnsaved);
    document.getElementById("save-comparison").addEventListener("click", save);
    document.getElementById("print-comparison").addEventListener("click", function () { window.print(); });
    document.getElementById("reset-comparison").addEventListener("click", reset);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
