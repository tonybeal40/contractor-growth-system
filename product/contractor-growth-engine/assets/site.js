(function () {
  "use strict";

  var toggle = document.querySelector("[data-menu-toggle]");
  var nav = document.querySelector("[data-site-nav]");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      nav.hidden = open;
    });
  }

  var forms = document.querySelectorAll("form[data-lead-form]");
  forms.forEach(function (form) {
    var source = form.querySelector("input[name='page_source']");
    if (source) source.value = window.location.pathname;
    form.addEventListener("submit", function () {
      var button = form.querySelector("button[type='submit']");
      if (!button) return;
      button.disabled = true;
      button.textContent = "Sending...";
    });
  });
})();
