const express = require("express");
const { cloudinary } = require("../utils/upload");

const router = express.Router();

// Cloudinary connection test endpoint
router.get("/test-cloudinary", async (req, res) => {
  try {
    const result = await cloudinary.api.ping();
    console.log("Cloudinary ping result:", result);
    res.json({ success: true, result });
  } catch (error) {
    console.error("Cloudinary connection error:", error);
    res.status(500).json({
      error: "Cloudinary connection failed",
      message: error.message,
    });
  }
});

module.exports = router; 