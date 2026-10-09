const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const crypto = require("crypto");
const Trip = require("../models/Trip");

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Storage: MongoDB when MONGODB_URI is set (e.g. Atlas), otherwise an in-memory
// store so the API always works for demos and tests (data resets on restart).
const MONGODB_URI = process.env.MONGODB_URI || "";
const useMongo = Boolean(MONGODB_URI);
const memory = new Map();

let isConnected = false;

async function connectDB() {
  if (!useMongo || isConnected) return;
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

const FIELDS = ["destination", "budget", "startDate", "endDate", "preferences", "travellers", "interests", "pace", "plan", "writeUp"];
const pick = (body) => Object.fromEntries(FIELDS.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));

function validate(t) {
  if (!t.destination || !String(t.destination).trim()) return "destination is required";
  if (!(Number(t.budget) > 0)) return "budget must be a positive number";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t.startDate || "") || !/^\d{4}-\d{2}-\d{2}$/.test(t.endDate || "")) return "startDate and endDate must be YYYY-MM-DD";
  if (t.endDate < t.startDate) return "endDate is before startDate";
  return null;
}

// ==================== API Routes ====================

app.get("/api/test", (req, res) => {
  res.json({ message: "Backend working 🚀", storage: useMongo ? "mongodb" : "memory" });
});

// POST /api/trips → Add a new trip
app.post("/api/trips", async (req, res) => {
  try {
    const data = pick(req.body || {});
    const problem = validate(data);
    if (problem) return res.status(400).json({ message: problem });
    data.budget = Number(data.budget);
    if (!useMongo) {
      const trip = { ...data, _id: crypto.randomUUID(), createdAt: new Date().toISOString() };
      memory.set(trip._id, trip);
      return res.status(201).json(trip);
    }
    await connectDB();
    const savedTrip = await new Trip(data).save();
    res.status(201).json(savedTrip);
  } catch (error) {
    res.status(500).json({ message: "Error creating trip", error: error.message });
  }
});

// GET /api/trips → Get all trips
app.get("/api/trips", async (req, res) => {
  try {
    if (!useMongo) return res.json([...memory.values()].reverse());
    await connectDB();
    const trips = await Trip.find().sort({ _id: -1 });
    res.json(trips);
  } catch (error) {
    res.status(500).json({ message: "Error fetching trips", error: error.message });
  }
});

async function findTrip(id) {
  if (!useMongo) return memory.get(id) || null;
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(id)) return undefined;
  return Trip.findById(id);
}

// GET /api/trips/:id → Get a single trip by ID
app.get("/api/trips/:id", async (req, res) => {
  try {
    const trip = await findTrip(req.params.id);
    if (trip === undefined) return res.status(400).json({ message: "Invalid trip ID format" });
    if (!trip) return res.status(404).json({ message: "Trip not found" });
    res.json(trip);
  } catch (error) {
    res.status(500).json({ message: "Error fetching trip", error: error.message });
  }
});

// PATCH /api/trips/:id → Save a generated plan / AI write-up
app.patch("/api/trips/:id", async (req, res) => {
  try {
    const patch = pick(req.body || {});
    if (!useMongo) {
      const trip = memory.get(req.params.id);
      if (!trip) return res.status(404).json({ message: "Trip not found" });
      const updated = { ...trip, ...patch };
      memory.set(trip._id, updated);
      return res.json(updated);
    }
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid trip ID format" });
    const trip = await Trip.findByIdAndUpdate(req.params.id, patch, { new: true });
    if (!trip) return res.status(404).json({ message: "Trip not found" });
    res.json(trip);
  } catch (error) {
    res.status(500).json({ message: "Error updating trip", error: error.message });
  }
});

// DELETE /api/trips/:id
app.delete("/api/trips/:id", async (req, res) => {
  try {
    if (!useMongo) {
      memory.delete(req.params.id);
      return res.status(204).end();
    }
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid trip ID format" });
    await Trip.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: "Error deleting trip", error: error.message });
  }
});

// Export for Vercel serverless
module.exports = app;
