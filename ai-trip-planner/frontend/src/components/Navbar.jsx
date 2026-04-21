import { NavLink } from "react-router-dom";

function Navbar() {
  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar-brand">
        <span className="brand-icon">✈️</span>
        AI Trip Planner
      </NavLink>
      <div className="navbar-links">
        <NavLink to="/" end className={({ isActive }) => isActive ? "active" : ""}>
          Home
        </NavLink>
        <NavLink to="/add" className={({ isActive }) => isActive ? "active" : ""}>
          Add Trip
        </NavLink>
        <NavLink to="/trips" className={({ isActive }) => isActive ? "active" : ""}>
          View Trips
        </NavLink>
      </div>
    </nav>
  );
}

export default Navbar;
