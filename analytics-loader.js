(function (win, doc) {
  "use strict";

  win.ALLPRO_DELAY_ANALYTICS = true;
  win.dataLayer = win.dataLayer || [];
  win.gtag = win.gtag || function () {
    win.dataLayer.push(arguments);
  };
  win.gtag("js", new Date());
  win.gtag("config", "G-35DEM1MGDT");
  win.gtag("config", "GT-WPQ8Z726");

  win.clarity = win.clarity || function () {
    (win.clarity.q = win.clarity.q || []).push(arguments);
  };

  let loaded = false;
  let timer;

  function loadAnalytics() {
    if (loaded) {
      return;
    }

    loaded = true;
    win.clearTimeout(timer);

    const googleTag = doc.createElement("script");
    googleTag.async = true;
    googleTag.src = "https://www.googletagmanager.com/gtag/js?id=G-35DEM1MGDT";
    doc.head.appendChild(googleTag);

    const clarityTag = doc.createElement("script");
    clarityTag.async = true;
    clarityTag.src = "https://www.clarity.ms/tag/weti9tqt5q?ref=bwt";
    doc.head.appendChild(clarityTag);
  }

  function scheduleAnalytics() {
    timer = win.setTimeout(loadAnalytics, 4000);

    ["pointerdown", "keydown", "touchstart"].forEach(function (eventName) {
      win.addEventListener(eventName, loadAnalytics, {
        once: true,
        passive: eventName !== "keydown"
      });
    });

  }

  if (doc.readyState === "complete") {
    scheduleAnalytics();
  } else {
    win.addEventListener("load", scheduleAnalytics, { once: true });
  }
})(window, document);
