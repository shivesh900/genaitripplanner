const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Trip = require("../models/Trip");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection (uses MONGODB_URI env variable for Atlas)
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ai-trip-planner";

let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  
  if (process.env.VERCEL && MONGODB_URI.includes("127.0.0.1")) {
    throw new Error("Cannot connect to local MongoDB in Vercel. Please set MONGODB_URI.");
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    });
    isConnected = true;
    console.log("MongoDB connected successfully");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    throw err;
  }
}

// ==================== API Routes ====================

app.get("/api/test", (req, res) => {
  res.json({ message: "Backend working 🚀" });
});

// POST /api/trips → Add a new trip
app.post("/api/trips", async (req, res) => {
  try {
    await connectDB();
    const { destination, budget, startDate, endDate, preferences } = req.body;
    const newTrip = new Trip({ destination, budget, startDate, endDate, preferences });
    const savedTrip = await newTrip.save();
    res.status(201).json(savedTrip);
  } catch (error) {
    res.status(500).json({ message: "Error creating trip", error: error.message });
  }
});

// GET /api/trips → Get all trips
app.get("/api/trips", async (req, res) => {
  try {
    await connectDB();
    const trips = await Trip.find().sort({ _id: -1 });
    res.json(trips);
  } catch (error) {
    res.status(500).json({ message: "Error fetching trips", error: error.message });
  }
});

// GET /api/trips/:id → Get a single trip by ID
app.get("/api/trips/:id", async (req, res) => {
  try {
    await connectDB();
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

// Export for Vercel serverless
module.exports = app;
