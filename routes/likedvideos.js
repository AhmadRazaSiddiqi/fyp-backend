const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');
const Video = require('../models/Video');
const router = express.Router();

// Get user's liked videos
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username })
      .populate({
        path: 'likedVideos',
        select: 'title thumbnail views uploadedAt description category videoSrcUrl uploadedBy',
        populate: {
          path: 'uploadedBy',
          select: 'username'
        }
      });
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const formattedVideos = user.likedVideos.map(video => ({
      _id: video._id,
      title: video.title,
      thumbnail: video.thumbnail,
      views: video.views,
      uploadedAt: video.uploadedAt,
      description: video.description,
      category: video.category,
      videoSrcUrl: video.videoSrcUrl,
      uploader: video.uploadedBy && video.uploadedBy.username ? video.uploadedBy.username : video.uploadedBy
    }));
    
    res.json({ 
      success: true,
      likedVideos: formattedVideos,
      count: formattedVideos.length
    });
  } catch (err) {
    console.error('Get liked videos error:', err);
    res.status(500).json({ error: 'Failed to get liked videos', details: err.message });
  }
});

// Add video to liked videos
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { videoId } = req.body;
    const user = await User.findOne({ username: req.user.username });
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!videoId) return res.status(400).json({ error: 'Video ID is required' });
    
    // Check if video exists
    const video = await Video.findById(videoId);
    if (!video) return res.status(404).json({ error: 'Video not found' });
    
    // Check if already liked
    if (user.likedVideos.includes(videoId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Video is already in liked videos' 
      });
    }
    
    // Add to liked videos
    user.likedVideos.push(videoId);
    
    // Remove from disliked videos if present
    const wasDisliked = user.dislikedVideos.includes(videoId);
    if (wasDisliked) {
      user.dislikedVideos = user.dislikedVideos.filter(vId => !vId.equals(videoId));
      video.dislikes = Math.max(0, video.dislikes - 1);
    }
    
    // Update video likes
    video.likes += 1;
    
    await user.save();
    await video.save();
    
    res.json({ 
      success: true,
      message: 'Video added to liked videos successfully',
      likedVideos: user.likedVideos,
      count: user.likedVideos.length
    });
  } catch (err) {
    console.error('Add to liked videos error:', err);
    res.status(500).json({ error: 'Failed to add to liked videos', details: err.message });
  }
});

// Remove video from liked videos
router.delete('/:videoId', authenticateToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    const user = await User.findOne({ username: req.user.username });
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Check if video is in liked videos
    if (!user.likedVideos.includes(videoId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Video is not in liked videos' 
      });
    }
    
    // Remove from liked videos
    user.likedVideos = user.likedVideos.filter(vId => !vId.equals(videoId));
    
    // Update video likes
    const video = await Video.findById(videoId);
    if (video) {
      video.likes = Math.max(0, video.likes - 1);
      await video.save();
    }
    
    await user.save();
    
    res.json({ 
      success: true,
      message: 'Video removed from liked videos successfully',
      likedVideos: user.likedVideos,
      count: user.likedVideos.length
    });
  } catch (err) {
    console.error('Remove from liked videos error:', err);
    res.status(500).json({ error: 'Failed to remove from liked videos', details: err.message });
  }
});

// Check if video is liked by user
router.get('/:videoId/check', authenticateToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    const user = await User.findOne({ username: req.user.username });
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const isLiked = user.likedVideos.includes(videoId);
    
    res.json({
      success: true,
      isLiked,
      videoId
    });
  } catch (err) {
    console.error('Check liked video error:', err);
    res.status(500).json({ error: 'Failed to check liked video', details: err.message });
  }
});

// Clear all liked videos
router.delete('/', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const deletedCount = user.likedVideos.length;
    user.likedVideos = [];
    await user.save();
    
    res.json({ 
      success: true,
      message: `All ${deletedCount} liked videos removed successfully`
    });
  } catch (err) {
    console.error('Clear liked videos error:', err);
    res.status(500).json({ error: 'Failed to clear liked videos', details: err.message });
  }
});

module.exports = router; 