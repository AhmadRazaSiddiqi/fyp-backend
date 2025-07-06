# Video Library Backend

A Node.js backend for a video library application with authentication, video upload, and management features.

## Project Structure

```
FYP-Auth-Backend/
├── config/
│   └── database.js          # MongoDB connection configuration
├── middleware/
│   └── auth.js              # JWT authentication middleware
├── models/
│   ├── User.js              # User model
│   └── Video.js             # Video model
├── routes/
│   ├── auth.js              # Authentication routes (register, login, dashboard)
│   ├── videos.js            # Video management routes (upload, CRUD, likes/dislikes)
│   └── cloudinary.js        # Cloudinary integration routes
├── utils/
│   └── upload.js            # Cloudinary and Multer configuration
├── server.js                # Main server file
└── package.json
```

## Features

- **Authentication**: JWT-based user registration and login
- **Video Upload**: Cloudinary integration for video storage
- **Video Management**: CRUD operations for videos
- **Social Features**: Like/dislike videos, add to playlists
- **File Upload**: Multer middleware for handling file uploads

## API Endpoints

### Authentication
- `POST /register` - Register a new user
- `POST /login` - Login user
- `GET /dashboard` - Get user dashboard (protected)

### Videos
- `POST /upload-video` - Upload a new video (protected)
- `GET /api/videos` - Get all videos
- `GET /api/videos/:id` - Get video by ID
- `POST /api/videos/:id/like` - Like a video (protected)
- `POST /api/videos/:id/dislike` - Dislike a video (protected)
- `POST /api/videos/:id/add-to-playlist` - Add video to playlist (protected)

### Cloudinary
- `GET /test-cloudinary` - Test Cloudinary connection

## Environment Variables

Create a `.env` file with the following variables:

```
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
PORT=3000
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables

3. Start the server:
```bash
npm start
```

## Dependencies

- express
- mongoose
- bcryptjs
- jsonwebtoken
- cors
- dotenv
- cloudinary
- multer
- multer-storage-cloudinary 