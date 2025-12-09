import mongoose from "mongoose";

const HabitSchema = new mongoose.Schema({
  name: String,
  goal: Number,
  checks: [Boolean]
});

const MonthSchema = new mongoose.Schema({
  userId: String,         // for now just a simple string
  year: Number,
  month: Number,
  monthLength: Number,
  title: String,
  habits: [HabitSchema]
}, { timestamps: true });

export default mongoose.model("Month", MonthSchema);
