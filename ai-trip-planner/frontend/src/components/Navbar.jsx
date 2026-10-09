import { NavLink } from "react-router-dom";

function Navbar() {
  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar-brand">
        <span className="brand-icon">✈️</span>
        <span className="brand-text">AI Trip Planner</span>
      </NavLink>
      <div className="navbar-links">
        <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
          Home
        </NavLink>
        <NavLink to="/add" className={({ isActive }) => (isActive ? "active" : "")}>
          Add Trip
        </NavLink>
        <NavLink to="/trips" className={({ isActive }) => (isActive ? "active" : "")}>
          View Trips
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => (isActive ? "active" : "")} aria-label="AI settings">
          ⚙︎
        </NavLink>
      </div>
    </nav>
  );
}

export default Navbar;
