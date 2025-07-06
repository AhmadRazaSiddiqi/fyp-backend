const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// Import routes
const authRoutes = require("./routes/auth");
const videoRoutes = require("./routes/videos");
const cloudinaryRoutes = require("./routes/cloudinary");
const historyRoutes = require("./routes/history");
const likedVideosRoutes = require("./routes/likedvideos");
const watchLaterRoutes = require("./routes/watchlater");
const playlistRoutes = require("./routes/playlists");
const userRoutes = require("./routes/user");
const dislikedVideosRoutes = require("./routes/dislikedvideos");

// Import utilities and config
const connectDB = require("./config/database");

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Connect to MongoDB
connectDB();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", videoRoutes);
app.use("/", cloudinaryRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/likedvideos", likedVideosRoutes);
app.use("/api/watchlater", watchLaterRoutes);
app.use("/api/playlists", playlistRoutes);
app.use("/api/user", userRoutes);
app.use("/api/dislikedvideos", dislikedVideosRoutes);
app.get("/test", (_, res) => {
  res.send("Server Is Running");
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
