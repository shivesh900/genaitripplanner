import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

function ViewTrips() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const res = await axios.get("http://localhost:5000/trips");
        setTrips(res.data);
      } catch (error) {
        console.error("Error fetching trips:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTrips();
  }, []);

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
        <p>Browse all your planned trips below.</p>
      </div>

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
                <div className="trip-card-header">
                  <span className="trip-destination">📍 {trip.destination}</span>
                  <span className="trip-budget-badge">₹{trip.budget.toLocaleString()}</span>
                </div>
                <div className="trip-dates">
                  📅 {trip.startDate} → {trip.endDate}
                </div>
                <div className="trip-card-footer">
                  <span className="btn btn-secondary btn-sm">View Details →</span>
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
