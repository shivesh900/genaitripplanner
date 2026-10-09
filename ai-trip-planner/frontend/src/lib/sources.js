// Live, keyless data sources (all CORS-enabled, no API key needed):
//  • Open-Meteo geocoding + forecast + historical archive  (open-meteo.com)
//  • Wikipedia GeoSearch + page summaries                 (wikipedia.org)
import { addDays } from "./planner.js";

async function getJSON(url, { timeoutMs = 15000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`${new URL(url).hostname} answered ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function geocode(query) {
  const q = query.split(",")[0].trim();
  const data = await getJSON(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en&format=json`
  );
  const results = data.results || [];
  if (!results.length) throw new Error(`Couldn't find “${query}”. Try the city name, e.g. “Munnar” or “Jaipur”.`);
  // If the user typed "City, Country/State", prefer the matching one; else the most populous.
  const hint = query.split(",").slice(1).join(",").trim().toLowerCase();
  const pick =
    (hint && results.find((r) => `${r.country} ${r.admin1 || ""}`.toLowerCase().includes(hint))) ||
    [...results].sort((a, b) => (b.population || 0) - (a.population || 0))[0];
  return {
    name: pick.name,
    admin1: pick.admin1 || "",
    country: pick.country || "",
    lat: pick.latitude,
    lon: pick.longitude,
    timezone: pick.timezone,
  };
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Daily weather for the trip dates. Uses the live forecast when the dates are
 * within the next 16 days; otherwise the same dates last year from the
 * historical archive, labelled as such.
 */
export async function weatherFor(geo, startDate, endDate) {
  const horizon = addDays(today(), 15);
  if (startDate <= horizon) {
    const end = endDate <= horizon ? endDate : horizon;
    const d = await getJSON(
      `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lon}` +
        `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,weather_code` +
        `&timezone=auto&start_date=${startDate}&end_date=${end}`
    );
    return { source: "forecast", days: zipDaily(d.daily, 0) };
  }
  const shift = (s) => `${Number(s.slice(0, 4)) - 1}${s.slice(4)}`;
  const d = await getJSON(
    `https://archive-api.open-meteo.com/v1/archive?latitude=${geo.lat}&longitude=${geo.lon}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code` +
      `&timezone=auto&start_date=${shift(startDate)}&end_date=${shift(endDate)}`
  );
  return { source: "last-year", days: zipDaily(d.daily, 1) };
}

function zipDaily(daily, yearsBack) {
  if (!daily || !daily.time) return [];
  return daily.time.map((t, i) => ({
    date: yearsBack ? `${Number(t.slice(0, 4)) + yearsBack}${t.slice(4)}` : t,
    tMax: daily.temperature_2m_max?.[i] ?? null,
    tMin: daily.temperature_2m_min?.[i] ?? null,
    precipProb: daily.precipitation_probability_max?.[i] ?? null,
    precipMm: daily.precipitation_sum?.[i] ?? null,
    code: daily.weather_code?.[i] ?? null,
  }));
}

/** Notable places with Wikipedia articles within ~10 km of the destination. */
export async function placesNear(geo) {
  const url =
    `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*` +
    `&generator=geosearch&ggscoord=${geo.lat}%7C${geo.lon}&ggsradius=10000&ggslimit=100` +
    `&prop=description%7Cpageimages%7Ccoordinates&piprop=thumbnail&pithumbsize=480&pilimit=50&colimit=100`;
  const data = await getJSON(url);
  const pages = Object.values(data.query?.pages || {});
  return pages
    .filter((p) => p.coordinates?.length)
    .map((p) => ({
      id: p.pageid,
      title: p.title,
      description: p.description || "",
      thumbnail: p.thumbnail?.source || null,
      lat: p.coordinates[0].lat,
      lon: p.coordinates[0].lon,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, "_"))}`,
    }));
}

/** Two-sentence summaries for the places that made it into the plan. */
export async function addSummaries(places) {
  await Promise.all(
    places.map(async (p) => {
      try {
        const s = await getJSON(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(p.title.replace(/ /g, "_"))}`,
          { timeoutMs: 8000 }
        );
        const sentences = (s.extract || "").match(/[^.!?]+[.!?]+/g) || [];
        p.summary = sentences.slice(0, 2).join(" ").trim();
        if (!p.thumbnail && s.thumbnail?.source) p.thumbnail = s.thumbnail.source;
      } catch {
        /* summary is optional */
      }
    })
  );
  return places;
}
