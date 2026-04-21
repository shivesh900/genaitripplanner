import { Link } from "react-router-dom";

function Home() {
  return (
    <div className="home-page">
      <div className="home-hero">
        <div className="home-badge">
          <span className="dot"></span>
          AI-Powered Planning
        </div>
        <h1>Plan Your Dream Trip with AI</h1>
        <p>
          Create personalized travel plans powered by intelligent suggestions.
          Set your destination, budget, and preferences — let our AI craft the
          perfect itinerary for you.
        </p>
        <div className="home-actions">
          <Link to="/add" className="btn btn-primary">
            ✨ Plan a New Trip
          </Link>
          <Link to="/trips" className="btn btn-secondary">
            📋 View My Trips
          </Link>
        </div>
      </div>
      <div className="home-features">
        <div className="feature-item">
          <div className="feature-icon">🎯</div>
          <h3>Smart Suggestions</h3>
          <p>AI-powered trip plans</p>
        </div>
        <div className="feature-item">
          <div className="feature-icon">💰</div>
          <h3>Budget Aware</h3>
          <p>Plans within your budget</p>
        </div>
        <div className="feature-item">
          <div className="feature-icon">🗺️</div>
          <h3>Any Destination</h3>
          <p>Travel anywhere you want</p>
        </div>
      </div>
    </div>
  );
}

export default Home;
