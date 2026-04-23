import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function AddTrip() {
  const navigate = useNavigate();
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    destination: "",
    budget: "",
    startDate: "",
    endDate: "",
    preferences: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.destination || !formData.budget || !formData.startDate || !formData.endDate) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      await axios.post("/api/trips", {
        ...formData,
        budget: Number(formData.budget),
      });
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        navigate("/trips");
      }, 1500);
    } catch (error) {
      console.error("Error creating trip:", error);
      alert("Failed to create trip. Please try again.");
    }
  };

  return (
    <div className="page-container">
      {showSuccess && (
        <div className="success-alert">✅ Trip created successfully!</div>
      )}
      <div className="form-page">
        <div className="page-header">
          <h1>🌍 Plan a New Trip</h1>
          <p>Fill in the details below to create your personalized travel plan.</p>
        </div>
        <form className="form-card" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="destination">Destination *</label>
              <input
                type="text"
                id="destination"
                name="destination"
                placeholder="e.g. Paris, Tokyo, New York"
                value={formData.destination}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="budget">Budget (₹) *</label>
              <input
                type="number"
                id="budget"
                name="budget"
                placeholder="e.g. 25000"
                value={formData.budget}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="startDate">Start Date *</label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="endDate">End Date *</label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
              />
            </div>
            <div className="form-group full-width">
              <label htmlFor="preferences">Preferences (Optional)</label>
              <textarea
                id="preferences"
                name="preferences"
                placeholder="e.g. Adventure, Beach, Culture, Food, Relaxation..."
                value={formData.preferences}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              ✨ Create Trip Plan
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate("/trips")}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddTrip;
