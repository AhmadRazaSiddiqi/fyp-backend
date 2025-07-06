const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  videoSrcUrl: { type: String, required: true },
  category: { type: String, required: true },
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // reference to User
  uploadedAt: { type: Date, default: Date.now },
  thumbnail: { type: String },
  views: { type: Number, default: 0 },
  description: { type: String },
  comments: [
    {
      text: { type: String, required: true },
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      username: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
      isUploader: { type: Boolean, default: false }
    }
  ]
});

module.exports = mongoose.model('Video', videoSchema); 