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
});

module.exports = mongoose.model("Trip", tripSchema);
