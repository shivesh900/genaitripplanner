import { Link, useNavigate } from "react-router-dom";
import { createTrip } from "../lib/store";
import { addDays } from "../lib/planner";

function Home() {
  const navigate = useNavigate();

  const tryExample = async () => {
    const start = addDays(new Date().toISOString().slice(0, 10), 7);
    const trip = await createTrip({
      destination: "Munnar, Kerala",
      budget: 30000,
      travellers: 2,
      startDate: start,
      endDate: addDays(start, 2),
      interests: ["nature", "culture"],
      pace: "balanced",
      preferences: "Tea gardens, viewpoints, easy walks",
    });
    navigate(`/trip/${trip._id}`);
  };

  return (
    <div className="home-page">
      <div className="home-hero">
        <div className="home-badge">
          <span className="dot"></span>
          Real places · live weather · no API key needed
        </div>
        <h1>Plan Your Dream Trip with AI</h1>
        <p>
          Tell it where, when and your budget. It finds real sights around your
          destination, checks the weather for your dates, splits your budget and
          builds a day-by-day itinerary with routes. Add an AI write-up with one tap.
        </p>
        <div className="home-actions">
          <Link to="/add" className="btn btn-primary">
            ✨ Plan a New Trip
          </Link>
          <button type="button" className="btn btn-secondary" onClick={tryExample}>
            🌿 Try an example (Munnar)
          </button>
        </div>
      </div>
      <div className="home-features">
        <div className="feature-item">
          <div className="feature-icon">📍</div>
          <h3>Real places</h3>
          <p>Sights within 10 km, ranked for your interests</p>
        </div>
        <div className="feature-item">
          <div className="feature-icon">🌦️</div>
          <h3>Weather-aware</h3>
          <p>Indoor sights first on rainy days</p>
        </div>
        <div className="feature-item">
          <div className="feature-icon">💰</div>
          <h3>Budget split</h3>
          <p>Stay, food, transport and buffer per day</p>
        </div>
      </div>
    </div>
  );
}

export default Home;
