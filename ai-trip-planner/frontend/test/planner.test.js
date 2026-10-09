import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyPlace, rankPlaces, buildItinerary, budgetBreakdown, budgetTier, tripDays,
  validateTrip, packingList, routeLink, makePlan, isWet,
} from "../src/lib/planner.js";
import { buildPrompt } from "../src/lib/ai.js";

const center = { lat: 10.088, lon: 77.062 };
const P = (title, description, lat, lon, thumb = true) => ({ id: title, title, description, lat, lon, thumbnail: thumb ? "x.jpg" : null, url: "#" });
const places = [
  P("Subramanya Temple, Munnar", "Hindu temple in Kerala, India", 10.089, 77.061),
  P("Mattupetty Dam", "Dam in the mountains of Kerala, India", 10.106, 77.124),
  P("Eravikulam National Park", "National park in Kerala, India", 10.15, 77.06),
  P("Tea Museum, Munnar", "Museum in Kerala", 10.095, 77.05),
  P("Mount Carmel Church, Munnar", "Catholic church in Munnar, India", 10.087, 77.063),
  P("Devikulam", "Village in Kerala, India", 10.07, 77.1),
  P("Munnar railway station", "Former railway station", 10.09, 77.06),
  P("Western Ghats", "Mountain range along the western coast of India", 10.2, 77.1),
  P("Attukal Waterfalls", "Waterfall near Munnar", 10.06, 77.04, false),
];

test("classifies sights and drops non-sights", () => {
  assert.deepEqual(classifyPlace(places[0]), ["spiritual"]);
  assert.ok(classifyPlace(places[1]).includes("nature"));
  assert.ok(classifyPlace(places[3]).includes("culture"));
  assert.equal(classifyPlace(places[5]), null); // village
  assert.equal(classifyPlace(places[6]), null); // railway station
  assert.equal(classifyPlace(places[7]), null); // mountain range
});

test("ranking favours the traveller's interests", () => {
  const nature = rankPlaces(places, { center, interests: ["nature"] });
  assert.ok(nature[0].categories.includes("nature"));
  const spiritual = rankPlaces(places, { center, interests: ["spiritual"] });
  assert.ok(spiritual[0].categories.includes("spiritual"));
  assert.equal(nature.length, 6);
});

test("trip length and validation", () => {
  assert.equal(tripDays("2026-10-16", "2026-10-18"), 3);
  const errs = validateTrip({ destination: "", budget: 100, travellers: 0, startDate: "2026-10-01", endDate: "2026-09-30" }, "2026-10-09");
  assert.deepEqual(Object.keys(errs).sort(), ["budget", "destination", "endDate", "startDate", "travellers"]);
  assert.deepEqual(validateTrip({ destination: "Munnar", budget: 30000, travellers: 2, startDate: "2026-10-16", endDate: "2026-10-18" }, "2026-10-09"), {});
});

test("budget tiers are per person per day, and the split adds up", () => {
  assert.equal(budgetTier(6000, 2, 3).tier, "Budget");
  assert.equal(budgetTier(30000, 2, 3).tier, "Premium");
  assert.equal(budgetTier(150000, 1, 3).tier, "Luxury");
  const b = budgetBreakdown(30000, 2, 3);
  assert.equal(b.lines.reduce((s, l) => s + l.amount, 0), 30000);
  assert.equal(b.nights, 2);
  assert.equal(b.rooms, 1);
});

test("itinerary covers every day without repeating a place, indoor first when wet", () => {
  const ranked = rankPlaces(places, { center, interests: ["nature"] });
  const weather = [{ date: "2026-10-16", precipProb: 90, code: 63, tMin: 16, tMax: 22 }];
  const plan = buildItinerary({ places: ranked, startDate: "2026-10-16", days: 2, weather, pace: "balanced" });
  assert.equal(plan.length, 2);
  assert.equal(plan[0].wet, true);
  assert.ok(plan[0].slots[0].place.categories.some((c) => ["culture", "spiritual", "food"].includes(c)));
  const titles = plan.flatMap((d) => d.slots.map((s) => s.place?.title)).filter(Boolean);
  assert.equal(new Set(titles).size, titles.length);
});

test("short on places → clearly marked free slots, never invented sights", () => {
  const plan = buildItinerary({ places: [], startDate: "2026-10-16", days: 2 });
  assert.ok(plan.every((d) => d.slots.length >= 2 && d.slots.every((s) => s.place === null && s.note)));
});

test("packing list follows the weather", () => {
  const list = packingList({ weather: [{ tMin: 4, tMax: 12, precipProb: 80 }], categories: ["spiritual"] });
  assert.ok(list.includes("Umbrella or rain jacket"));
  assert.ok(list.includes("Warm jacket / layers"));
  assert.ok(list.some((x) => x.startsWith("Modest clothing")));
  assert.equal(isWet({ precipProb: 10, code: 1 }), false);
});

test("route link and full plan", () => {
  const link = routeLink([{ place: { lat: 1, lon: 2 } }, { place: { lat: 3, lon: 4 } }, { place: { lat: 5, lon: 6 } }]);
  assert.equal(link, "https://www.google.com/maps/dir/?api=1&origin=1,2&destination=5,6&waypoints=3%2C4&travelmode=driving");
  const trip = { destination: "Munnar", budget: 30000, travellers: 2, startDate: "2026-10-16", endDate: "2026-10-18", interests: ["nature"], pace: "balanced" };
  const plan = makePlan(trip, { geo: { name: "Munnar", country: "India", ...center }, places, weather: [], weatherSource: "forecast" });
  assert.equal(plan.itinerary.length, 3);
  assert.equal(plan.budget.tier, "Premium");
  const prompt = buildPrompt(trip, plan);
  assert.match(prompt, /Use ONLY these planned stops/);
  assert.match(prompt, /Eravikulam National Park/);
});
