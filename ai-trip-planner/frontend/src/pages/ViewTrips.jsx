import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { listTrips, deleteTrip, storageMode } from "../lib/store";
import { tripDays } from "../lib/planner";

function ViewTrips() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setTrips(await listTrips());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (e, id) => {
    e.preventDefault();
    if (!confirm("Delete this trip?")) return;
    await deleteTrip(id);
    load();
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading trips...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>📋 My Trip Plans</h1>
        <p>{storageMode === "browser" ? "Saved in this browser." : "Saved on the server."}</p>
      </div>
      {error && <p className="field-error">{error}</p>}
      {trips.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🧳</div>
          <h3>No trips planned yet</h3>
          <p>Start by creating your first trip plan!</p>
          <Link to="/add" className="btn btn-primary">
            ✨ Plan a Trip
          </Link>
        </div>
      ) : (
        <div className="trips-grid">
          {trips.map((trip) => (
            <Link to={`/trip/${trip._id}`} key={trip._id} style={{ textDecoration: "none" }}>
              <div className="trip-card">
                {trip.plan?.itinerary?.[0]?.slots?.find((s) => s.place?.thumbnail) && (
                  <img className="trip-card-img" alt="" loading="lazy"
                    src={trip.plan.itinerary[0].slots.find((s) => s.place?.thumbnail).place.thumbnail} />
                )}
                <div className="trip-card-header">
                  <span className="trip-destination">📍 {trip.plan?.destination?.name || trip.destination}</span>
                  <span className="trip-budget-badge">₹{Number(trip.budget).toLocaleString("en-IN")}</span>
                </div>
                <div className="trip-dates">
                  📅 {trip.startDate} → {trip.endDate} · {tripDays(trip.startDate, trip.endDate)} days
                  {trip.plan ? ` · ${trip.plan.budget.tier}` : ""}
                </div>
                <div className="trip-card-footer">
                  <span className="btn btn-secondary btn-sm">View Plan →</span>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={(e) => remove(e, trip._id)} aria-label={`Delete trip to ${trip.destination}`}>
                    🗑
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default ViewTrips;
