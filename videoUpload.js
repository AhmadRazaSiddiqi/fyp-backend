const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, // Set this in your .env file
  api_key: process.env.CLOUDINARY_CLOUD_API_KEY,
  api_secret: process.env.CLOUDINARY_CLOUD_API_SECRET,
});

// Set up multer storage with Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "video-library", // Cloudinary folder name for your videos
    allowed_formats: ["mp4", "mkv", "avi", "mov"],
    // Allowed formats for video files
  },
});

// Multer instance with storage configuration
const upload = multer({ storage: storage });

module.exports = upload;
