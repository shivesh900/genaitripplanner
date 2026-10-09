const mongoose = require("mongoose");

const tripSchema = new mongoose.Schema({
  destination: {
    type: String,
    required: true,
  },
  budget: {
    type: Number,
    required: true,
  },
  startDate: {
    type: String,
    required: true,
  },
  endDate: {
    type: String,
    required: true,
  },
  preferences: {
    type: String,
    default: "",
  },
  travellers: { type: Number, default: 1 },
  interests: { type: [String], default: [] },
  pace: { type: String, default: "balanced" },
  // The generated itinerary and optional AI write-up (built in the browser).
  plan: { type: mongoose.Schema.Types.Mixed, default: null },
  writeUp: { type: mongoose.Schema.Types.Mixed, default: null },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

module.exports = mongoose.model("Trip", tripSchema);
