import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getTrip, updateTrip, deleteTrip } from "../lib/store";
import { makePlan, describeWeather, routeLink, INTERESTS } from "../lib/planner";
import { geocode, weatherFor, placesNear, addSummaries } from "../lib/sources";
import { generateWriteUp, loadAISettings } from "../lib/ai";

const inr = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const LABELS = { stay: "Stay", food: "Food", transport: "Local transport", activities: "Entry fees & activities", buffer: "Buffer / shopping" };
const PROVIDER_NAMES = { free: "free AI (no key)", gemini: "Gemini (your key)", openai: "your OpenAI-compatible key" };

function prettyDate(d) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

async function buildPlan(trip, onStep) {
  onStep("Finding the destination…");
  const geo = await geocode(trip.destination);
  onStep(`Looking up sights around ${geo.name} and the weather for your dates…`);
  const [places, weather] = await Promise.all([
    placesNear(geo),
    weatherFor(geo, trip.startDate, trip.endDate).catch(() => ({ source: "unavailable", days: [] })),
  ]);
  onStep("Building your itinerary…");
  const plan = makePlan(trip, { geo, places, weather: weather.days, weatherSource: weather.source });
  const used = plan.itinerary.flatMap((d) => d.slots.map((s) => s.place).filter(Boolean));
  await addSummaries([...used, ...plan.alsoNearby]);
  return plan;
}

function TripDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState("");
  const [error, setError] = useState("");
  const [ai, setAi] = useState({ busy: false, error: "" });

  const generate = useCallback(async (t) => {
    setError("");
    try {
      const plan = await buildPlan(t, setStep);
      const saved = await updateTrip(t._id, { plan, writeUp: null });
      setTrip(saved);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setStep("");
    }
  }, []);

  useEffect(() => {
    (async () => {
      const t = await getTrip(id);
      setTrip(t);
      setLoading(false);
      if (t && !t.plan) generate(t);
    })();
  }, [id, generate]);

  const runAI = async () => {
    setAi({ busy: true, error: "" });
    try {
      const writeUp = await generateWriteUp(trip, trip.plan);
      setTrip(await updateTrip(trip._id, { writeUp }));
      setAi({ busy: false, error: "" });
    } catch (err) {
      setAi({ busy: false, error: err.message || String(err) });
    }
  };

  const remove = async () => {
    if (!confirm("Delete this trip?")) return;
    await deleteTrip(trip._id);
    navigate("/trips");
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading"><div className="spinner"></div><p>Loading trip details...</p></div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-icon">❌</div>
          <h3>Trip not found</h3>
          <p>The trip you're looking for doesn't exist on this device.</p>
          <Link to="/trips" className="btn btn-primary">← Back to Trips</Link>
        </div>
      </div>
    );
  }

  const plan = trip.plan;
  const aiSettings = loadAISettings();
  const tipFor = (day) => trip.writeUp?.days?.find((d) => Number(d.day) === day)?.tip;

  return (
    <div className="page-container">
      <div className="detail-page">
        <Link to="/trips" className="back-link">← Back to My Trips</Link>
        <div className="detail-card">
          <div className="detail-banner">
            <h1>📍 {plan ? plan.destination.name : trip.destination}</h1>
            <p className="detail-subtitle">
              {plan ? [plan.destination.admin1, plan.destination.country].filter(Boolean).join(", ") + " · " : ""}
              {prettyDate(trip.startDate)} → {prettyDate(trip.endDate)} · {trip.travellers || 1} traveller{(trip.travellers || 1) > 1 ? "s" : ""}
            </p>
          </div>
          <div className="detail-body">
            {!plan && !error && (
              <div className="loading" data-testid="planning"><div className="spinner"></div><p>{step || "Planning…"}</p></div>
            )}
            {error && (
              <div className="ai-suggestion error-box" role="alert">
                <p>⚠️ {error}</p>
                <button className="btn btn-secondary btn-sm" onClick={() => generate(trip)}>Try again</button>
              </div>
            )}
            {plan && (
              <>
                <div className="detail-grid">
                  <div className="detail-item"><div className="label">Budget</div><div className="value">{inr(trip.budget)}</div></div>
                  <div className="detail-item"><div className="label">Trip Tier</div><div className="value" data-testid="tier">{plan.budget.tier}</div></div>
                  <div className="detail-item"><div className="label">Per person / day</div><div className="value">{inr(plan.budget.perPersonPerDay)}</div></div>
                  <div className="detail-item"><div className="label">Days</div><div className="value">{plan.days}</div></div>
                  {trip.interests?.length > 0 && (
                    <div className="detail-item full-width">
                      <div className="label">Interests</div>
                      <div className="value">{trip.interests.map((i) => INTERESTS.find((x) => x.id === i)?.label).filter(Boolean).join(" · ")}</div>
                    </div>
                  )}
                </div>

                <section className="ai-suggestion" data-testid="writeup">
                  <div className="ai-suggestion-header">
                    <span className="ai-tag">🤖 AI</span>
                    <h3>Trip write-up</h3>
                  </div>
                  {trip.writeUp ? (
                    <>
                      <p>{trip.writeUp.overview}</p>
                      {trip.writeUp.foodToTry?.length > 0 && <p className="mt"><strong>Food to try:</strong> {trip.writeUp.foodToTry.join(", ")}</p>}
                      {trip.writeUp.localTips?.length > 0 && (
                        <ul className="tips">{trip.writeUp.localTips.map((t, i) => <li key={i}>{t}</li>)}</ul>
                      )}
                      <p className="muted small">Written by {PROVIDER_NAMES[trip.writeUp.provider] || "AI"} from the plan below. Check details before you go.</p>
                    </>
                  ) : (
                    <p>
                      Get a short guide, regional food to try and local tips written from this plan.
                      It uses {PROVIDER_NAMES[aiSettings.provider]} (<Link to="/settings" className="link">change</Link>).
                    </p>
                  )}
                  {ai.error && <p className="field-error">⚠️ {ai.error}</p>}
                  <div className="row">
                    <button className="btn btn-primary btn-sm" onClick={runAI} disabled={ai.busy}>
                      {ai.busy ? "Writing…" : trip.writeUp ? "↻ Rewrite" : "✨ Write it with AI"}
                    </button>
                  </div>
                </section>

                <h2 className="section-title">🗓️ Day by day</h2>
                <p className="muted small">
                  {plan.placesConsidered} real places found within 10 km, ranked for your interests.
                  {plan.weatherSource === "forecast" && " Weather: live forecast."}
                  {plan.weatherSource === "last-year" && " Weather: same dates last year (your trip is beyond the 16-day forecast)."}
                </p>
                <div className="days">
                  {plan.itinerary.map((d) => (
                    <article className="day-card" key={d.day} data-testid="day">
                      <header className="day-head">
                        <div>
                          <h3>Day {d.day}</h3>
                          <span className="muted small">{prettyDate(d.date)}</span>
                        </div>
                        {d.weather && (
                          <span className={`weather-chip ${d.wet ? "wet" : ""}`}>
                            {d.wet ? "🌧️" : "☀️"} {describeWeather(d.weather.code)} · {Math.round(d.weather.tMin)}–{Math.round(d.weather.tMax)}°C
                            {d.weather.precipProb != null ? ` · ${d.weather.precipProb}% rain` : ""}
                          </span>
                        )}
                      </header>
                      {d.wet && <p className="muted small">Rain likely, so indoor sights come first today.</p>}
                      <ol className="stops">
                        {d.slots.map((s, i) => (
                          <li className="stop" key={i}>
                            {s.place?.thumbnail ? <img src={s.place.thumbnail} alt="" loading="lazy" /> : <div className="stop-img-ph">{s.place ? "📍" : "☕"}</div>}
                            <div>
                              <span className="slot">{s.slot}</span>
                              {s.place ? (
                                <>
                                  <a className="stop-title" href={s.place.url} target="_blank" rel="noreferrer">{s.place.title}</a>
                                  <p className="muted small">{s.place.summary || s.place.description} {s.place.km != null && <span>· {s.place.km} km from centre</span>}</p>
                                </>
                              ) : (
                                <p className="stop-title">{s.note}</p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ol>
                      {tipFor(d.day) && <p className="day-tip">💡 {tipFor(d.day)}</p>}
                      {routeLink(d.slots) && (
                        <a className="btn btn-secondary btn-sm" href={routeLink(d.slots)} target="_blank" rel="noreferrer">🗺️ Open day route in Maps</a>
                      )}
                    </article>
                  ))}
                </div>

                <div className="two-col">
                  <section className="panel">
                    <h2 className="section-title">💰 Budget split ({plan.budget.tier})</h2>
                    {plan.budget.lines.map((l) => (
                      <div className="bar-row" key={l.key}>
                        <div className="bar-label"><span>{LABELS[l.key]}</span><span>{inr(l.amount)}</span></div>
                        <div className="bar"><span style={{ width: `${l.pct * 100}%` }} /></div>
                      </div>
                    ))}
                    <p className="muted small">
                      About {inr(plan.budget.stayPerNight)} per room per night ({plan.budget.rooms} room{plan.budget.rooms > 1 ? "s" : ""}, {plan.budget.nights} night{plan.budget.nights > 1 ? "s" : ""}): {plan.budget.stayHint}.
                      Food ≈ {inr(plan.budget.foodPerPersonPerDay)} per person per day. Travel to {plan.destination.name} isn't included.
                    </p>
                  </section>
                  <section className="panel">
                    <h2 className="section-title">🎒 Packing list</h2>
                    <ul className="checklist">{plan.packing.map((p) => <li key={p}>{p}</li>)}</ul>
                  </section>
                </div>

                {plan.alsoNearby.length > 0 && (
                  <section className="panel">
                    <h2 className="section-title">➕ Also nearby</h2>
                    <div className="nearby">
                      {plan.alsoNearby.map((p) => (
                        <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="nearby-item">
                          <strong>{p.title}</strong>
                          <span className="muted small">{p.description || p.categories.join(", ")}</span>
                        </a>
                      ))}
                    </div>
                  </section>
                )}

                <section className="panel">
                  <h2 className="section-title">🗺️ Map</h2>
                  <iframe
                    title={`Map of ${plan.destination.name}`}
                    className="map"
                    loading="lazy"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${plan.destination.lon - 0.08}%2C${plan.destination.lat - 0.06}%2C${plan.destination.lon + 0.08}%2C${plan.destination.lat + 0.06}&layer=mapnik&marker=${plan.destination.lat}%2C${plan.destination.lon}`}
                  />
                </section>

                <div className="row">
                  <button className="btn btn-secondary btn-sm" onClick={() => { setTrip({ ...trip, plan: null }); generate(trip); }}>↻ Re-plan</button>
                  <button className="btn btn-ghost btn-sm" onClick={remove}>🗑 Delete trip</button>
                </div>
                <p className="muted small credits">
                  Places & summaries: Wikipedia (CC BY-SA). Weather & geocoding: Open-Meteo. Map: © OpenStreetMap contributors.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TripDetails;
