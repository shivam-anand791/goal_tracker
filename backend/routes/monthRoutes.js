import express from "express";
import Month from "../models/Month.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// CREATE or UPDATE month (protected)
router.post("/save", authMiddleware, async (req, res) => {
  try {
    const { year, month } = req.body;
    const userId = req.userId;

    const existing = await Month.findOne({ userId, year, month });

    if (existing) {
      const updated = await Month.findByIdAndUpdate(
        existing._id,
        { ...req.body, userId },
        { new: true }
      );
      res.json(updated);
    } else {
      const created = await Month.create({
        ...req.body,
        userId
      });
      res.json(created);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET specific month (protected)
router.get("/:year/:month", authMiddleware, async (req, res) => {
  try {
    const { year, month } = req.params;

    const data = await Month.findOne({
      userId: req.userId,
      year,
      month
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
