const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Trip = require("./models/Trip");

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose
  .connect("mongodb://127.0.0.1:27017/ai-trip-planner")
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

// ==================== API Routes ====================

// POST /trips → Add a new trip
app.post("/trips", async (req, res) => {
  try {
    const { destination, budget, startDate, endDate, preferences } = req.body;
    const newTrip = new Trip({ destination, budget, startDate, endDate, preferences });
    const savedTrip = await newTrip.save();
    res.status(201).json(savedTrip);
  } catch (error) {
    res.status(500).json({ message: "Error creating trip", error: error.message });
  }
});

// GET /trips → Get all trips
app.get("/trips", async (req, res) => {
  try {
    const trips = await Trip.find().sort({ _id: -1 });
    res.json(trips);
  } catch (error) {
    res.status(500).json({ message: "Error fetching trips", error: error.message });
  }
});

// GET /trips/:id → Get a single trip by ID
app.get("/trips/:id", async (req, res) => {
  try {
    // Validate that the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid trip ID format" });
    }

    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }
    res.json(trip);
  } catch (error) {
    res.status(500).json({ message: "Error fetching trip", error: error.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
