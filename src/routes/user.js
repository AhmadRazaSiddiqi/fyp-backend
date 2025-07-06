const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');
const Video = require('../models/Video');
const router = express.Router();

// Get user info with playlists
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username })
      .populate('likedVideos', 'title thumbnail views videoSrcUrl category')
      .populate('watchLater', 'title thumbnail views videoSrcUrl category')
      .populate('history.video', 'title thumbnail views videoSrcUrl category');
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Format playlists with video details
    const playlistsWithVideos = await Promise.all(
      user.playlists.map(async (playlist) => {
        const videos = await Video.find({ _id: { $in: playlist.videos } })
          .select('title thumbnail views videoSrcUrl category');
        return {
          _id: playlist._id,
          name: playlist.name,
          videos: videos
        };
      })
    );
    
    res.json({ 
      status: 'ok',
      user: {
        _id: user._id,
        username: user.username,
        createdAt: user.createdAt,
        likedVideos: user.likedVideos,
        watchLater: user.watchLater || [],
        history: user.history,
        allPlaylists: playlistsWithVideos
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
});

module.exports = router; 