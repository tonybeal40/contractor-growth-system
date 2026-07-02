(function () {
  const measurementIds = ['G-35DEM1MGDT', 'GT-WPQ8Z726'];
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
    `https://www.googletagmanager.com/gtag/js?id=${measurementIds[0]}`,
    'googletagmanager.com/gtag/js'
  );

  function dataLayerHas(command, id) {
    return ensureDataLayer().some(function (item) {
      return item && item[0] === command && (!id || item[1] === id);
    });
  }

  if (!dataLayerHas('js')) {
    window.gtag('js', new Date());
  }

  window.__allProGtagConfiguredIds = window.__allProGtagConfiguredIds || {};
  measurementIds.forEach(function (id) {
    if (!window.__allProGtagConfiguredIds[id] && !dataLayerHas('config', id)) {
      window.gtag('config', id);
      window.__allProGtagConfiguredIds[id] = true;
    }
  });

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

  (function hydrateLeadAttributionFields() {
    const params = new URLSearchParams(window.location.search);
    const hiddenFields = {
      utm_source: params.get('utm_source') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
      utm_term: params.get('utm_term') || '',
      utm_content: params.get('utm_content') || '',
      gclid: params.get('gclid') || '',
      gbraid: params.get('gbraid') || '',
      wbraid: params.get('wbraid') || '',
      msclkid: params.get('msclkid') || '',
      referrer: doc.referrer || '',
      landing_page: window.location.href,
    };

    Object.entries(hiddenFields).forEach(function ([name, value]) {
      if (!value) {
        return;
      }

      doc.querySelectorAll(`input[type="hidden"][name="${name}"]`).forEach(function (input) {
        input.value = value;
      });
    });
  })();

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

  // ── Floating Call/Quote Button ──────────────────────────────────────────────
  (function injectFloatingCTA() {
    // Skip pages where a form or sticky CTA is already the primary conversion path.
    const skip = ['/get-quote.html', '/thank-you.html', '/contact.html'];
    if (skip.some(function(p){ return window.location.pathname.endsWith(p); })) return;
    if (doc.querySelector('.sticky-call, .nd-sticky, .fb-sticky, .li-sticky')) return;
    if (doc.querySelector('form[action*="formsubmit.co"]')) return;

    const style = doc.createElement('style');
    style.textContent = [
      '#ap-float{position:fixed;bottom:18px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:8px;align-items:flex-end;}',
      '#ap-float a{display:inline-flex;align-items:center;gap:7px;padding:13px 18px;border-radius:50px;font-family:Manrope,system-ui,sans-serif;font-weight:800;font-size:.92rem;text-decoration:none;box-shadow:0 4px 18px rgba(0,0,0,.35);transition:transform .15s,box-shadow .15s;white-space:nowrap;}',
      '#ap-float a:hover{transform:translateY(-2px);box-shadow:0 6px 24px rgba(0,0,0,.45);}',
      '#ap-float .ap-call{background:#16a34a;color:#fff;}',
      '#ap-float .ap-quote{background:#1a56db;color:#fff;}',
      '#ap-float-dismiss{position:fixed;bottom:14px;left:12px;z-index:9999;background:rgba(15,23,42,.7);border:none;color:#64748b;font-size:.7rem;cursor:pointer;padding:4px 8px;border-radius:20px;font-family:inherit;}',
      '@media(max-width:480px){#ap-float a{padding:12px 14px;font-size:.85rem;}}'
    ].join('');
    doc.head.appendChild(style);

    const wrap = doc.createElement('div');
    wrap.id = 'ap-float';
    wrap.innerHTML = [
      '<a href="tel:6185810676" class="ap-call" aria-label="Call All-Pro Construction">',
      '  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>',
      '  Call Bill',
      '</a>',
      '<a href="/get-quote.html" class="ap-quote" aria-label="Get a free quote">',
      '  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z"/></svg>',
      '  Free Quote',
      '</a>'
    ].join('');
    doc.body.appendChild(wrap);

    // Track clicks
    wrap.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){
        track('floating_cta_click', { cta_type: a.classList.contains('ap-call') ? 'call' : 'quote' });
      });
    });
  })();
})();
