// Deterministic trip-planning engine.
// Pure functions only (no network, no DOM) so it is unit-testable and the same
// inputs always give the same plan. Live data (places, weather) is fetched in
// ./sources.js and passed in.

export const INTERESTS = [
  { id: "culture", label: "Culture & history", emoji: "🏛️" },
  { id: "nature", label: "Nature & views", emoji: "🌿" },
  { id: "food", label: "Food & markets", emoji: "🍜" },
  { id: "adventure", label: "Adventure", emoji: "🧗" },
  { id: "relax", label: "Beaches & relaxing", emoji: "🏖️" },
  { id: "spiritual", label: "Temples & spiritual", emoji: "🛕" },
];

const CATEGORY_RULES = [
  ["spiritual", /\b(temple|kovil|mandir|church|cathedral|basilica|mosque|masjid|dargah|gurdwara|shrine|monastery|math|ashram|synagogue|pagoda|stupa|chapel)\b/i],
  ["culture", /\b(museum|palace|fort|fortress|monument|memorial|heritage|gallery|castle|tomb|mausoleum|ruins?|archaeological|historic|theatre|theater|library|cave|caves|mahal|haveli|statue|tower)\b/i],
  ["relax", /\b(beach|lagoon|backwaters?|island|resort|spa|promenade|bay|hot spring)\b/i],
  ["nature", /\b(park|garden|lake|waterfalls?|falls|dam|reservoir|hills?|valley|viewpoint|peak|mountain|national park|sanctuary|reserve|forest|zoo|botanical|tea estate|plantation|river|gorge|meadow|shola)\b/i],
  ["adventure", /\b(trek|trekking|trail|peak|climb|rafting|paragliding|national park|wildlife|safari|cave|caves|summit)\b/i],
  ["food", /\b(market|bazaar|street|food|cafe|restaurant|mall|shopping|bakery|souk|square)\b/i],
];

// Things that are on Wikipedia but are not places a traveller visits.
const EXCLUDE = /\b(village|tehsil|taluk|taluka|district|constituency|municipality|census town|neighbourhood|neighborhood|suburb|ward|locality|human settlement|panchayat|school|college|university|institute|hospital|railway station|metro station|bus station|station|airport|company|bank|ecoregion|mountain range|road|highway|street in|bridge|power station|headworks|diversion dam|electoral|assembly|parliament|government|office|court|stadium|cricket ground|residential|apartment|building in|hotel in|town in|city in|state of|country|river in|tributary|range in|census|region of|area of|area in|place in|zone|cemetery|prison|factory|plant)\b/i;

export function classifyPlace(place) {
  const text = `${place.title} ${place.description || ""}`;
  if (EXCLUDE.test(place.description || "") && !/\b(temple|fort|palace|museum|beach|falls|lake|park)\b/i.test(place.title)) return null;
  const cats = CATEGORY_RULES.filter(([, re]) => re.test(text)).map(([c]) => c);
  return cats.length ? [...new Set(cats)] : null;
}

const INDOOR = new Set(["culture", "spiritual", "food"]);

/** Great-circle distance in km. */
export function haversine(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Keep visitable places, tag them and score them for this traveller. */
export function rankPlaces(rawPlaces, { center, interests = [] }) {
  const wanted = new Set(interests);
  const seen = new Set();
  return rawPlaces
    .map((p) => ({ ...p, categories: classifyPlace(p) }))
    .filter((p) => p.categories && p.lat != null && p.lon != null)
    .filter((p) => {
      const key = p.title.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((p) => {
      const km = haversine(center, p);
      let score = 1;
      if (p.thumbnail) score += 1;
      if (p.description) score += 0.5;
      score += p.categories.filter((c) => wanted.has(c)).length * 2;
      score += Math.max(0, 1.5 - km / 10); // nearer is easier
      return { ...p, km: Math.round(km * 10) / 10, score: Math.round(score * 100) / 100 };
    })
    .sort((a, b) => b.score - a.score || a.km - b.km || a.title.localeCompare(b.title));
}

export function tripDays(startDate, endDate) {
  const s = new Date(startDate + "T00:00:00Z");
  const e = new Date(endDate + "T00:00:00Z");
  const n = Math.round((e - s) / 86400000) + 1;
  return Number.isFinite(n) ? n : 0;
}

export function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** His original four tiers, now based on spend per person per day (INR). */
export function budgetTier(budget, travellers, days) {
  const perDay = budget / Math.max(1, travellers) / Math.max(1, days);
  if (perDay < 1500) return { tier: "Budget", perDay };
  if (perDay < 4000) return { tier: "Standard", perDay };
  if (perDay < 9000) return { tier: "Premium", perDay };
  return { tier: "Luxury", perDay };
}

const SPLITS = {
  Budget: { stay: 0.35, food: 0.25, transport: 0.15, activities: 0.1, buffer: 0.15 },
  Standard: { stay: 0.4, food: 0.22, transport: 0.15, activities: 0.13, buffer: 0.1 },
  Premium: { stay: 0.45, food: 0.2, transport: 0.13, activities: 0.12, buffer: 0.1 },
  Luxury: { stay: 0.5, food: 0.18, transport: 0.12, activities: 0.12, buffer: 0.08 },
};

const STAY_HINT = {
  Budget: "hostels, homestays or budget guesthouses",
  Standard: "well-reviewed 3★ hotels or boutique homestays",
  Premium: "4★ hotels or heritage stays",
  Luxury: "5★ hotels or luxury resorts",
};

export function budgetBreakdown(budget, travellers, days) {
  const { tier, perDay } = budgetTier(budget, travellers, days);
  const split = SPLITS[tier];
  const nights = Math.max(1, days - 1);
  const lines = Object.entries(split).map(([key, pct]) => ({ key, pct, amount: Math.round(budget * pct) }));
  const stay = lines.find((l) => l.key === "stay").amount;
  const rooms = Math.max(1, Math.ceil(travellers / 2));
  return {
    tier,
    perPersonPerDay: Math.round(perDay),
    lines,
    stayPerNight: Math.round(stay / nights / rooms),
    rooms,
    nights,
    stayHint: STAY_HINT[tier],
    foodPerPersonPerDay: Math.round(lines.find((l) => l.key === "food").amount / travellers / days),
  };
}

// WMO weather codes → words.
export function describeWeather(code) {
  if (code == null) return "—";
  if (code === 0) return "Clear";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Fog";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Rain showers";
  if (code <= 86) return "Snow showers";
  return "Thunderstorm";
}

export const isWet = (w) => !!w && ((w.precipProb != null && w.precipProb >= 60) || (w.precipMm != null && w.precipMm >= 5) || (w.code >= 61 && w.code <= 99 && w.code !== 71 && w.code !== 73));

const SLOT_NAMES = ["Morning", "Afternoon", "Evening"];
const EVENING_FRIENDLY = new Set(["food", "relax"]);

/**
 * Build a day-by-day itinerary.
 * - places are spread over the days, each day grouped around an anchor so
 *   travel between stops stays short (greedy nearest-neighbour clustering);
 * - rainy days put indoor sights first; markets/beaches/viewpoints go to evenings;
 * - when there are not enough real places, a clearly marked free slot is used.
 */
export function buildItinerary({ places, startDate, days, weather = [], pace = "balanced" }) {
  const perDay = pace === "relaxed" ? 2 : pace === "packed" ? 4 : 3;
  const pool = places.slice(0, Math.max(perDay * days, 0) + 6);
  const remaining = [...pool];
  const plan = [];

  for (let d = 0; d < days; d++) {
    const date = addDays(startDate, d);
    const w = weather.find((x) => x.date === date) || null;
    const wet = isWet(w);
    const stops = [];
    if (remaining.length) {
      // anchor: best remaining place (indoor first on wet days)
      let anchorIdx = 0;
      if (wet) {
        const i = remaining.findIndex((p) => p.categories.some((c) => INDOOR.has(c)));
        if (i >= 0) anchorIdx = i;
      }
      const anchor = remaining.splice(anchorIdx, 1)[0];
      stops.push(anchor);
      while (stops.length < perDay && remaining.length) {
        const last = stops[stops.length - 1];
        remaining.sort((a, b) => haversine(last, a) - haversine(last, b));
        stops.push(remaining.shift());
      }
      remaining.sort((a, b) => b.score - a.score);
    }
    // order within the day: indoor first when wet, evening-friendly last
    stops.sort((a, b) => {
      const ev = (p) => (p.categories.some((c) => EVENING_FRIENDLY.has(c)) ? 1 : 0);
      const ind = (p) => (p.categories.some((c) => INDOOR.has(c)) ? 0 : 1);
      return wet ? ind(a) - ind(b) || ev(a) - ev(b) : ev(a) - ev(b);
    });
    const slots = stops.map((p, i) => ({
      slot: perDay <= 3 ? SLOT_NAMES[i] || "Later" : ["Morning", "Late morning", "Afternoon", "Evening"][i],
      place: p,
    }));
    while (slots.length < Math.min(perDay, 2)) {
      slots.push({
        slot: SLOT_NAMES[slots.length],
        place: null,
        note: d === 0 && slots.length === 0 ? "Arrive, check in and walk around your neighbourhood" : "Free time: wander the local market and try regional dishes",
      });
    }
    plan.push({ day: d + 1, date, weather: w, wet, slots });
  }
  return plan;
}

export function packingList({ weather = [], categories = [] }) {
  const items = new Set(["ID & tickets", "Phone charger & power bank", "Reusable water bottle", "Basic medicines"]);
  const maxT = Math.max(...weather.map((w) => w.tMax ?? -99));
  const minT = Math.min(...weather.map((w) => w.tMin ?? 99));
  if (weather.some(isWet)) { items.add("Umbrella or rain jacket"); items.add("Quick-dry footwear"); }
  if (maxT >= 30) { items.add("Sunscreen & sunglasses"); items.add("Light cotton clothes"); }
  if (minT <= 14) items.add("Warm jacket / layers");
  if (minT <= 5) items.add("Thermals, gloves & a beanie");
  const cats = new Set(categories);
  if (cats.has("spiritual")) items.add("Modest clothing for places of worship (shoulders/knees covered)");
  if (cats.has("relax")) items.add("Swimwear & flip-flops");
  if (cats.has("nature") || cats.has("adventure")) items.add("Comfortable walking shoes");
  return [...items];
}

export function routeLink(stops) {
  const pts = stops.filter((s) => s.place).map((s) => `${s.place.lat},${s.place.lon}`);
  if (pts.length < 2) return pts.length ? `https://www.google.com/maps/search/?api=1&query=${pts[0]}` : null;
  const [origin, ...rest] = pts;
  const destination = rest.pop();
  const waypoints = rest.length ? `&waypoints=${encodeURIComponent(rest.join("|"))}` : "";
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints}&travelmode=driving`;
}

/** Validate the trip form. Returns field → message. */
export function validateTrip(t, today = new Date().toISOString().slice(0, 10)) {
  const e = {};
  if (!t.destination || t.destination.trim().length < 2) e.destination = "Where are you going?";
  const b = Number(t.budget);
  if (!Number.isFinite(b) || b < 500) e.budget = "Enter a budget of at least ₹500.";
  const tr = Number(t.travellers);
  if (!Number.isInteger(tr) || tr < 1 || tr > 20) e.travellers = "1–20 travellers.";
  if (!t.startDate) e.startDate = "Pick a start date.";
  else if (t.startDate < today) e.startDate = "Start date is in the past.";
  if (!t.endDate) e.endDate = "Pick an end date.";
  else if (t.startDate && t.endDate < t.startDate) e.endDate = "End date is before the start date.";
  else if (t.startDate && tripDays(t.startDate, t.endDate) > 14) e.endDate = "Plans are limited to 14 days.";
  return e;
}

/** Whole plan from fetched data. */
export function makePlan(trip, { geo, places, weather, weatherSource }) {
  const days = tripDays(trip.startDate, trip.endDate);
  const travellers = Number(trip.travellers) || 1;
  const ranked = rankPlaces(places, { center: geo, interests: trip.interests || [] });
  const itinerary = buildItinerary({ places: ranked, startDate: trip.startDate, days, weather, pace: trip.pace });
  const used = itinerary.flatMap((d) => d.slots.map((s) => s.place).filter(Boolean));
  return {
    version: 2,
    generatedAt: new Date().toISOString(),
    destination: { name: geo.name, admin1: geo.admin1, country: geo.country, lat: geo.lat, lon: geo.lon, timezone: geo.timezone },
    days,
    budget: budgetBreakdown(Number(trip.budget), travellers, days),
    weatherSource,
    itinerary,
    alsoNearby: ranked.filter((p) => !used.includes(p)).slice(0, 6),
    packing: packingList({ weather, categories: used.flatMap((p) => p.categories) }),
    placesConsidered: ranked.length,
  };
}
