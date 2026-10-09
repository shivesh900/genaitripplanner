import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTrip } from "../lib/store";
import { INTERESTS, validateTrip, tripDays } from "../lib/planner";

const today = () => new Date().toISOString().slice(0, 10);

function AddTrip() {
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    destination: "",
    budget: "",
    travellers: 2,
    startDate: "",
    endDate: "",
    interests: ["culture", "nature"],
    pace: "balanced",
    preferences: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: undefined });
  };

  const toggleInterest = (id) =>
    setFormData((f) => ({
      ...f,
      interests: f.interests.includes(id) ? f.interests.filter((x) => x !== id) : [...f.interests, id],
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...formData, budget: Number(formData.budget), travellers: Number(formData.travellers) };
    const errs = validateTrip(data, today());
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const trip = await createTrip({ ...data, destination: data.destination.trim() });
      navigate(`/trip/${trip._id}`);
    } catch (error) {
      setErrors({ form: `Couldn't save the trip: ${error.message}` });
      setSaving(false);
    }
  };

  const days = formData.startDate && formData.endDate ? tripDays(formData.startDate, formData.endDate) : 0;
  const Err = ({ name }) => (errors[name] ? <span className="field-error">{errors[name]}</span> : null);

  return (
    <div className="page-container">
      <div className="form-page">
        <div className="page-header">
          <h1>🌍 Plan a New Trip</h1>
          <p>Fill in the details below and get a day-by-day plan built from real places and live weather.</p>
        </div>
        <form className="form-card" onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="destination">Destination *</label>
              <input type="text" id="destination" name="destination" placeholder="e.g. Jaipur, Munnar, Paris"
                value={formData.destination} onChange={handleChange} autoComplete="off" />
              <Err name="destination" />
            </div>
            <div className="form-group">
              <label htmlFor="budget">Total budget (₹) *</label>
              <input type="number" id="budget" name="budget" placeholder="e.g. 25000" min="500"
                value={formData.budget} onChange={handleChange} />
              <Err name="budget" />
            </div>
            <div className="form-group">
              <label htmlFor="travellers">Travellers *</label>
              <input type="number" id="travellers" name="travellers" min="1" max="20"
                value={formData.travellers} onChange={handleChange} />
              <Err name="travellers" />
            </div>
            <div className="form-group">
              <label htmlFor="startDate">Start Date *</label>
              <input type="date" id="startDate" name="startDate" min={today()} value={formData.startDate} onChange={handleChange} />
              <Err name="startDate" />
            </div>
            <div className="form-group">
              <label htmlFor="endDate">End Date *</label>
              <input type="date" id="endDate" name="endDate" min={formData.startDate || today()} value={formData.endDate} onChange={handleChange} />
              <Err name="endDate" />
              {days > 0 && !errors.endDate && <span className="field-hint">{days} day{days > 1 ? "s" : ""}</span>}
            </div>
            <div className="form-group full-width">
              <label>Interests</label>
              <div className="chips">
                {INTERESTS.map((i) => (
                  <button type="button" key={i.id} className={`chip ${formData.interests.includes(i.id) ? "chip-on" : ""}`}
                    aria-pressed={formData.interests.includes(i.id)} onClick={() => toggleInterest(i.id)}>
                    {i.emoji} {i.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group full-width">
              <label>Pace</label>
              <div className="chips">
                {[["relaxed", "🐢 Relaxed · 2 stops/day"], ["balanced", "🚶 Balanced · 3 stops/day"], ["packed", "⚡ Packed · 4 stops/day"]].map(([id, label]) => (
                  <button type="button" key={id} className={`chip ${formData.pace === id ? "chip-on" : ""}`}
                    aria-pressed={formData.pace === id} onClick={() => setFormData((f) => ({ ...f, pace: id }))}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group full-width">
              <label htmlFor="preferences">Notes for the AI write-up (optional)</label>
              <textarea id="preferences" name="preferences" placeholder="e.g. vegetarian food, travelling with parents, love sunsets"
                value={formData.preferences} onChange={handleChange} />
            </div>
          </div>
          {errors.form && <p className="field-error">{errors.form}</p>}
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : "✨ Create Trip Plan"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate("/trips")}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddTrip;
