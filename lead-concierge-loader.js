(function () {
  function init() {
    if (!document.body || document.querySelector(".alc-launcher")) return;

    const style = document.createElement("style");
    style.textContent = ".alc-loader{position:fixed;right:24px;bottom:24px;z-index:9996;min-height:50px;max-width:min(280px,calc(100vw - 32px));border:1px solid #254a40;border-radius:6px;padding:12px 18px;background:#2f5d50;color:#fff;box-shadow:0 10px 28px rgba(31,41,51,.24);font:800 16px/1.2 Arial,Helvetica,sans-serif;letter-spacing:0;cursor:pointer}.alc-loader:hover,.alc-loader:focus-visible{background:#254a40}.alc-loader:focus-visible{outline:3px solid #f2b27d;outline-offset:2px}@media(max-width:720px){.alc-loader{position:static;right:auto;bottom:auto;width:100%;min-height:46px;max-width:none;margin:0;padding:10px 14px;box-shadow:none;font-size:14px}}";
    document.head.appendChild(style);

    let button = document.querySelector(".alc-loader");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "alc-loader";
      button.textContent = "Plan My Project";
      button.setAttribute("aria-haspopup", "dialog");
      const launcherMount = document.querySelector(".home-hero-actions, .remodel-hero-actions") || document.body;
      launcherMount.appendChild(button);
    }

    if (button.dataset.alcLoaderReady === "true") return;
    button.dataset.alcLoaderReady = "true";

    button.addEventListener("click", function () {
      button.disabled = true;
      button.textContent = "Opening...";

      if (!document.querySelector('link[href*="lead-concierge.css"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "/lead-concierge.css?v=20260714a";
        document.head.appendChild(link);
      }

      window.ALLPRO_CONCIERGE_AUTO_OPEN = true;
      const script = document.createElement("script");
      script.src = "/lead-concierge.js?v=20260715a";
      script.async = true;
      script.onload = function () {
        button.remove();
      };
      script.onerror = function () {
        button.disabled = false;
        button.textContent = "Plan My Project";
      };
      document.head.appendChild(script);
    }, { once: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
