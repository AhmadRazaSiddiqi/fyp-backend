const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// Register route
router.post("/register", async (req, res) => {
  try {
    const { email, username, password } = req.body;
    if (!email || !username || !password) {
      return res.status(400).json({ error: "Email, username, and password are required" });
    }
    const userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ error: "User with this email already exists" });

    const user = new User({ email, username, password });
    await user.save();
    res.status(201).json({ status: 'ok', message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
});

// Login route
router.post("/login", async (req, res) => {
  console.log(req.body);
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { 
        email: user.email,
        username: user.username,
        userId: user._id.toString()
      },
      process.env.JWT_SECRET
    );
    res.json({ token });
  } catch (error) {
    res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
});

// Dashboard route
router.get("/dashboard", authenticateToken, (req, res) => {
  res.json({ message: `Welcome, ${req.user.username}!` });
});

module.exports = router; 