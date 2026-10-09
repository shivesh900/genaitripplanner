import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import AddTrip from "./pages/AddTrip";
import ViewTrips from "./pages/ViewTrips";
import TripDetails from "./pages/TripDetails";
import Settings from "./pages/Settings";
import "./index.css";

// HashRouter so deep links work on static hosting (GitHub Pages) without server rewrites.
function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/add" element={<AddTrip />} />
        <Route path="/trips" element={<ViewTrips />} />
        <Route path="/trip/:id" element={<TripDetails />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Router>
  );
}

export default App;
