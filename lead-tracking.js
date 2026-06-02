(function () {
  const measurementId = 'G-35DEM1MGDT';
  const clarityId = 'weti9tqt5q';
  const doc = document;

  function ensureDataLayer() {
    window.dataLayer = window.dataLayer || [];
    return window.dataLayer;
  }

  if (typeof window.gtag !== 'function') {
    window.gtag = function () {
      ensureDataLayer().push(arguments);
    };
  } else {
    ensureDataLayer();
  }

  function hasScriptMatch(match) {
    return Array.from(doc.scripts).some((script) => (script.src || '').includes(match));
  }

  function appendAsyncScript(src, marker) {
    if (hasScriptMatch(marker)) {
      return;
    }

    const script = doc.createElement('script');
    script.async = true;
    script.src = src;
    script.dataset.managed = marker;
    doc.head.appendChild(script);
  }

  appendAsyncScript(
    `https://www.googletagmanager.com/gtag/js?id=${measurementId}`,
    'googletagmanager.com/gtag/js'
  );

  if (!window.__allProGtagConfigured) {
    window.gtag('js', new Date());
    window.gtag('config', measurementId);
    window.__allProGtagConfigured = true;
  }

  if (!window.clarity && !hasScriptMatch(`clarity.ms/tag/${clarityId}`)) {
    window.clarity =
      window.clarity ||
      function () {
        (window.clarity.q = window.clarity.q || []).push(arguments);
      };

    const script = doc.createElement('script');
    script.async = true;
    script.src = `https://www.clarity.ms/tag/${clarityId}?ref=bwt`;
    doc.head.appendChild(script);
  }

  function cleanText(value) {
    return (value || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  }

  function track(eventName, params) {
    if (typeof window.gtag !== 'function') {
      return;
    }

    window.gtag('event', eventName, {
      page_path: window.location.pathname,
      page_title: doc.title,
      ...params,
    });
  }

  doc.addEventListener(
    'click',
    function (event) {
      const link = event.target.closest('a[href]');

      if (!link) {
        return;
      }

      const href = link.getAttribute('href') || '';
      const label = cleanText(link.textContent) || link.getAttribute('aria-label') || 'Link click';

      if (href.startsWith('tel:')) {
        track('phone_click', {
          contact_method: 'phone',
          phone_number: href.replace(/^tel:/, '').replace(/[^\d+]/g, ''),
          link_text: label,
        });
        return;
      }

      if (href.startsWith('mailto:')) {
        track('email_click', {
          contact_method: 'email',
          email_address: href.replace(/^mailto:/, ''),
          link_text: label,
        });
        return;
      }

      if (/homeadvisor|angi\.com|houzz\.com|nextdoor\.com|yelp\.com|facebook\.com|linkedin\.com/i.test(link.href)) {
        let hostname = link.href;

        try {
          hostname = new URL(link.href).hostname.replace(/^www\./, '');
        } catch (error) {
          hostname = link.href;
        }

        track('authority_link_click', {
          authority_domain: hostname,
          link_text: label,
        });
      }
    },
    true
  );

  doc.addEventListener(
    'submit',
    function (event) {
      const form = event.target;

      if (!(form instanceof HTMLFormElement)) {
        return;
      }

      track('form_submit', {
        form_name: form.dataset.form || form.getAttribute('name') || form.id || 'Lead Form',
        form_destination: form.action || window.location.pathname,
      });
    },
    true
  );

  (function fireLeadConversion() {
    const params = new URLSearchParams(window.location.search);

    if (params.get('src') !== 'form') {
      return;
    }

    const formName = params.get('form') || 'website';
    const conversionKey = `all-pro-generate-lead:${window.location.pathname}:${formName}`;

    try {
      if (window.sessionStorage.getItem(conversionKey)) {
        return;
      }

      window.sessionStorage.setItem(conversionKey, '1');
    } catch (error) {
      // Ignore sessionStorage failures and still try to send the event once.
    }

    track('generate_lead', {
      lead_source: formName,
      value: 1,
      currency: 'USD',
    });
  })();
})();
