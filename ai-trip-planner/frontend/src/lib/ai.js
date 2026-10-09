// Optional AI write-up on top of the deterministic plan.
// Providers:
//  • "free"   – a free, keyless community endpoint (text.pollinations.ai). Can be slow or busy.
//  • "gemini" – Google Gemini with the visitor's own API key (free tier keys at aistudio.google.com).
//  • "openai" – any OpenAI-compatible API with the visitor's own key (OpenAI, Groq, OpenRouter…).
// Keys are kept only in this browser's localStorage and sent only to the chosen provider.

const SETTINGS_KEY = "trip-planner-ai-settings";

export const DEFAULT_SETTINGS = {
  provider: "free",
  apiKey: "",
  model: "",
  baseUrl: "https://api.openai.com/v1",
};

export function loadAISettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveAISettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function clearAISettings() {
  localStorage.removeItem(SETTINGS_KEY);
}

/** Compact, grounded prompt: the model may only use the places we found. */
export function buildPrompt(trip, plan) {
  const days = plan.itinerary.map((d) => ({
    day: d.day,
    date: d.date,
    weather: d.weather ? `${Math.round(d.weather.tMin)}–${Math.round(d.weather.tMax)}°C${d.wet ? ", wet" : ""}` : "unknown",
    stops: d.slots.map((s) => (s.place ? `${s.slot}: ${s.place.title} (${s.place.description || s.place.categories.join("/")})` : `${s.slot}: ${s.note}`)),
  }));
  return [
    `You are a friendly Indian travel planner. Write a short trip guide for ${trip.travellers} traveller(s) going to ${plan.destination.name}, ${plan.destination.country}`,
    `from ${trip.startDate} to ${trip.endDate}. Budget ₹${trip.budget} total (${plan.budget.tier} tier, about ₹${plan.budget.perPersonPerDay} per person per day).`,
    trip.preferences ? `Their preferences: ${trip.preferences}.` : "",
    `Use ONLY these planned stops (do not invent other attractions, prices or opening hours):`,
    JSON.stringify(days),
    `Reply with JSON only, in this shape: {"overview": "2-3 sentences", "days": [{"day": 1, "tip": "one practical sentence for that day"}], "foodToTry": ["3-5 regional dishes"], "localTips": ["3 short tips"]}`,
  ].join("\n");
}

function extractJSON(text) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("The AI reply wasn't JSON.");
  return JSON.parse(m[0]);
}

async function post(url, body, headers = {}, timeoutMs = 45000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`${new URL(url).hostname} answered ${res.status}: ${text.slice(0, 160)}`);
    return JSON.parse(text);
  } catch (err) {
    if (err.name === "AbortError") throw new Error("The AI provider took too long to answer.");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function generateWriteUp(trip, plan, settings = loadAISettings()) {
  const prompt = buildPrompt(trip, plan);
  let text;
  if (settings.provider === "gemini") {
    if (!settings.apiKey) throw new Error("Add your Gemini API key in AI settings.");
    const model = settings.model || "gemini-2.0-flash";
    const data = await post(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(settings.apiKey)}`,
      { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.6 } }
    );
    text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
  } else if (settings.provider === "openai") {
    if (!settings.apiKey) throw new Error("Add your API key in AI settings.");
    const base = (settings.baseUrl || DEFAULT_SETTINGS.baseUrl).replace(/\/$/, "");
    const data = await post(
      `${base}/chat/completions`,
      { model: settings.model || "gpt-4o-mini", messages: [{ role: "user", content: prompt }], temperature: 0.6 },
      { Authorization: `Bearer ${settings.apiKey}` }
    );
    text = data.choices?.[0]?.message?.content || "";
  } else {
    let data;
    try {
      data = await post("https://text.pollinations.ai/openai?referrer=genaitripplanner", {
        model: "openai",
        messages: [{ role: "user", content: prompt }],
        referrer: "genaitripplanner",
      });
    } catch (err) {
      throw new Error(
        `The free AI service didn't answer (${err.message.slice(0, 80)}). ` +
          "Try again in a minute, or add your own free Gemini key in AI settings."
      );
    }
    text = data.choices?.[0]?.message?.content || "";
  }
  const out = extractJSON(text);
  return {
    provider: settings.provider,
    overview: String(out.overview || ""),
    days: Array.isArray(out.days) ? out.days : [],
    foodToTry: Array.isArray(out.foodToTry) ? out.foodToTry.slice(0, 6) : [],
    localTips: Array.isArray(out.localTips) ? out.localTips.slice(0, 5) : [],
    createdAt: new Date().toISOString(),
  };
}
