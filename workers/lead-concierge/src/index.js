const MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8-fast";
const SITE_ORIGIN = "https://allprometroeastconstruction.com";
const ALLOWED_ORIGINS = new Set([
  SITE_ORIGIN,
  "https://www.allprometroeastconstruction.com"
]);
const MAX_BODY_BYTES = 12000;

const serviceQuestions = {
  "Kitchen remodel": "What matters most in the kitchen: layout, cabinets, counters, flooring, or a complete update?",
  "Bathroom remodel": "Is the main need a shower, tub, tile, vanity, layout change, or moisture repair?",
  "Deck or outdoor living": "Is this a new build, replacement, repair, or an outdoor living upgrade?",
  "Landscaping": "Is the priority cleanup, planting, drainage, retaining walls, mulch, rock, or ongoing care?",
  "Concrete or patio": "Is this a new patio or walkway, replacement, repair, drainage fix, or concrete pad?"
};

function sanitizeText(value, maxLength = 500) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function normalizePayload(input) {
  const payload = input && typeof input === "object" ? input : {};
  return {
    session_id: sanitizeText(payload.session_id, 80),
    service: sanitizeText(payload.service, 80),
    city: sanitizeText(payload.city, 80),
    timeline: sanitizeText(payload.timeline, 80),
    budget_range: sanitizeText(payload.budget_range, 80),
    details: sanitizeText(payload.details, 1200),
    page_path: sanitizeText(payload.page_path, 180)
  };
}

function scoreLead(payload) {
  let score = 5;
  const reasons = [];
  const service = payload.service.toLowerCase();
  const city = payload.city.toLowerCase();
  const timeline = payload.timeline.toLowerCase();
  const budget = payload.budget_range.toLowerCase();

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

  if (/as soon|asap|this month|0-30|right away/.test(timeline)) {
    score += 20;
    reasons.push("near-term timeline");
  } else if (/1-3|next 3|this season/.test(timeline)) {
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

  if (payload.details.length >= 80) {
    score += 5;
    reasons.push("useful project detail");
  }

  score = Math.min(100, score);
  const priority = score >= 80 ? "Hot" : score >= 55 ? "Warm" : "Standard";
  return { score, priority, reasons };
}

function fallbackQuestion(service) {
  return serviceQuestions[service] || "What is the biggest problem you want the finished project to solve?";
}

function fallbackSummary(payload) {
  const parts = [payload.service || "Home project"];
  if (payload.city) parts.push("in " + payload.city);
  if (payload.timeline) parts.push("with a " + payload.timeline + " timeline");
  if (payload.budget_range) parts.push("and a stated budget of " + payload.budget_range);
  const details = payload.details ? ". " + payload.details : "";
  return sanitizeText(parts.join(" ") + details, 420);
}

function parseAiResponse(result) {
  const raw = result && Object.prototype.hasOwnProperty.call(result, "response")
    ? result.response
    : result;

  if (raw && typeof raw === "object") return raw;
  if (typeof raw !== "string") return {};

  try {
    return JSON.parse(raw);
  } catch (error) {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return {};
    try {
      return JSON.parse(match[0]);
    } catch (nestedError) {
      return {};
    }
  }
}

function isAllowedOrigin(origin) {
  return ALLOWED_ORIGINS.has(origin);
}

function responseHeaders(origin) {
  const headers = {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Content-Security-Policy": "default-src 'none'",
    "X-Content-Type-Options": "nosniff",
    "Vary": "Origin"
  };
  if (isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
  }
  return headers;
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: responseHeaders(origin)
  });
}

async function runQualification(env, payload) {
  const scoring = scoreLead(payload);
  const fallback = {
    ai: false,
    follow_up_question: fallbackQuestion(payload.service),
    summary: fallbackSummary(payload),
    recommended_next_step: "Review the request and contact the homeowner about a written estimate.",
    ...scoring
  };

  if (!env.AI || typeof env.AI.run !== "function") return fallback;

  const systemPrompt = [
    "You qualify homeowner project inquiries for All-Pro Construction & Landscape in Metro East Illinois.",
    "Return JSON only with follow_up_question, summary, and recommended_next_step.",
    "Ask exactly one useful missing question, 18 words or fewer.",
    "Summarize the project in 45 words or fewer for a contractor callback.",
    "Do not quote a price, promise availability, claim a permit requirement, or guarantee an outcome.",
    "Focus on scope, current condition, decision timing, access, photos, and the homeowner's desired result."
  ].join(" ");

  try {
    const result = await env.AI.run(MODEL, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(payload) }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 220
    });
    const parsed = parseAiResponse(result);
    const question = sanitizeText(parsed.follow_up_question, 180);
    const summary = sanitizeText(parsed.summary, 420);
    const nextStep = sanitizeText(parsed.recommended_next_step, 240);

    return {
      ai: Boolean(question || summary),
      follow_up_question: question || fallback.follow_up_question,
      summary: summary || fallback.summary,
      recommended_next_step: nextStep || fallback.recommended_next_step,
      ...scoring
    };
  } catch (error) {
    return fallback;
  }
}

const worker = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      if (!isAllowedOrigin(origin)) return json({ ok: false, error: "origin_not_allowed" }, 403, origin);
      return new Response(null, { status: 204, headers: responseHeaders(origin) });
    }

    if (request.method === "GET" && /\/health\/?$/.test(url.pathname)) {
      return json({ ok: true, service: "All-Pro Lead Concierge", ai: true, model: MODEL }, 200, origin);
    }

    if (request.method !== "POST") {
      return json({ ok: false, error: "method_not_allowed" }, 405, origin);
    }

    if (!isAllowedOrigin(origin)) {
      return json({ ok: false, error: "origin_not_allowed" }, 403, origin);
    }

    const contentLength = Number(request.headers.get("Content-Length") || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return json({ ok: false, error: "request_too_large" }, 413, origin);
    }

    let input;
    try {
      const rawBody = await request.text();
      if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
        return json({ ok: false, error: "request_too_large" }, 413, origin);
      }
      input = JSON.parse(rawBody);
    } catch (error) {
      return json({ ok: false, error: "invalid_json" }, 400, origin);
    }

    const payload = normalizePayload(input);
    if (!payload.session_id || !payload.service || !payload.city || !payload.details) {
      return json({ ok: false, error: "missing_required_project_fields" }, 400, origin);
    }

    if (env.AI_RATE_LIMITER && typeof env.AI_RATE_LIMITER.limit === "function") {
      const clientIp = sanitizeText(request.headers.get("CF-Connecting-IP"), 80);
      const rateKey = clientIp ? "ip:" + clientIp : "session:" + payload.session_id;
      const result = await env.AI_RATE_LIMITER.limit({ key: rateKey });
      if (!result.success) {
        return json({ ok: false, error: "rate_limited" }, 429, origin);
      }
    }

    const qualification = await runQualification(env, payload);
    return json({ ok: true, ...qualification }, 200, origin);
  }
};

export {
  fallbackQuestion,
  normalizePayload,
  parseAiResponse,
  runQualification,
  sanitizeText,
  scoreLead
};

export default worker;
