import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";

// AI-like suggestion generator
function generateAISuggestion(destination, budget) {
  let plan = "";
  let tier = "";

  if (budget < 10000) {
    tier = "Budget";
    plan = `Budget-friendly trip to ${destination}! Consider local transport, street food, and free attractions. ` +
      `Stay in hostels or budget guesthouses. Focus on walking tours and local markets for an authentic experience.`;
  } else if (budget >= 10000 && budget < 25000) {
    tier = "Standard";
    plan = `Comfortable trip to ${destination} with a balanced budget. Book mid-range hotels, enjoy local restaurants, ` +
      `and take guided tours. You can afford a mix of public transport and occasional cabs for convenience.`;
  } else if (budget >= 25000 && budget < 50000) {
    tier = "Premium";
    plan = `Premium trip to ${destination}! Stay in well-rated hotels, enjoy fine dining experiences, ` +
      `and book curated excursions. Consider domestic flights for longer distances and treat yourself to some luxury activities.`;
  } else {
    tier = "Luxury";
    plan = `Luxury trip to ${destination}! Book 5-star hotels, first-class flights, private tours, ` +
      `and exclusive dining experiences. Enjoy spa treatments, premium activities, and VIP access to top attractions.`;
  }

  return { plan, tier };
}

function TripDetails() {
  const { id } = useParams();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const res = await axios.get(`/api/trips/${id}`);
        setTrip(res.data);
      } catch (error) {
        console.error("Error fetching trip:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTrip();
  }, [id]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading trip details...</p>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-icon">❌</div>
          <h3>Trip not found</h3>
          <p>The trip you're looking for doesn't exist.</p>
          <Link to="/trips" className="btn btn-primary">← Back to Trips</Link>
        </div>
      </div>
    );
  }

  const suggestion = generateAISuggestion(trip.destination, trip.budget);

  return (
    <div className="page-container">
      <div className="detail-page">
        <Link to="/trips" className="back-link">← Back to My Trips</Link>
        <div className="detail-card">
          <div className="detail-banner">
            <h1>📍 {trip.destination}</h1>
            <p className="detail-subtitle">Trip plan overview & AI suggestions</p>
          </div>
          <div className="detail-body">
            <div className="detail-grid">
              <div className="detail-item">
                <div className="label">Budget</div>
                <div className="value">₹{trip.budget.toLocaleString()}</div>
              </div>
              <div className="detail-item">
                <div className="label">Trip Tier</div>
                <div className="value">{suggestion.tier}</div>
              </div>
              <div className="detail-item">
                <div className="label">Start Date</div>
                <div className="value">{trip.startDate}</div>
              </div>
              <div className="detail-item">
                <div className="label">End Date</div>
                <div className="value">{trip.endDate}</div>
              </div>
              {trip.preferences && (
                <div className="detail-item full-width">
                  <div className="label">Preferences</div>
                  <div className="value">{trip.preferences}</div>
                </div>
              )}
            </div>

            <div className="ai-suggestion">
              <div className="ai-suggestion-header">
                <span className="ai-tag">🤖 AI</span>
                <h3>Suggested Plan</h3>
              </div>
              <p>{suggestion.plan}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TripDetails;
