const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');
const Video = require('../models/Video');
const router = express.Router();

// Get user's disliked videos
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username })
      .populate({
        path: 'dislikedVideos',
        select: 'title thumbnail views uploadedAt description category videoSrcUrl uploadedBy',
        populate: {
          path: 'uploadedBy',
          select: 'username'
        }
      });
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const formattedVideos = user.dislikedVideos.map(video => ({
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
      dislikedVideos: formattedVideos,
      count: formattedVideos.length
    });
  } catch (err) {
    console.error('Get disliked videos error:', err);
    res.status(500).json({ error: 'Failed to get disliked videos', details: err.message });
  }
});

// Add video to disliked videos
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { videoId } = req.body;
    const user = await User.findOne({ username: req.user.username });
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!videoId) return res.status(400).json({ error: 'Video ID is required' });
    
    // Check if video exists
    const video = await Video.findById(videoId);
    if (!video) return res.status(404).json({ error: 'Video not found' });
    
    // Check if already disliked
    if (user.dislikedVideos.includes(videoId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Video is already in disliked videos' 
      });
    }
    
    // Add to disliked videos
    user.dislikedVideos.push(videoId);
    
    // Remove from liked videos if present
    const wasLiked = user.likedVideos.includes(videoId);
    if (wasLiked) {
      user.likedVideos = user.likedVideos.filter(vId => !vId.equals(videoId));
      video.likes = Math.max(0, video.likes - 1);
    }
    
    // Update video dislikes
    video.dislikes += 1;
    
    await user.save();
    await video.save();
    
    res.json({ 
      success: true,
      message: 'Video added to disliked videos successfully',
      dislikedVideos: user.dislikedVideos,
      count: user.dislikedVideos.length
    });
  } catch (err) {
    console.error('Add to disliked videos error:', err);
    res.status(500).json({ error: 'Failed to add to disliked videos', details: err.message });
  }
});

// Remove video from disliked videos
router.delete('/:videoId', authenticateToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    const user = await User.findOne({ username: req.user.username });
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Check if video is in disliked videos
    if (!user.dislikedVideos.includes(videoId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Video is not in disliked videos' 
      });
    }
    
    // Remove from disliked videos
    user.dislikedVideos = user.dislikedVideos.filter(vId => !vId.equals(videoId));
    
    // Update video dislikes
    const video = await Video.findById(videoId);
    if (video) {
      video.dislikes = Math.max(0, video.dislikes - 1);
      await video.save();
    }
    
    await user.save();
    
    res.json({ 
      success: true,
      message: 'Video removed from disliked videos successfully',
      dislikedVideos: user.dislikedVideos,
      count: user.dislikedVideos.length
    });
  } catch (err) {
    console.error('Remove from disliked videos error:', err);
    res.status(500).json({ error: 'Failed to remove from disliked videos', details: err.message });
  }
});

// Check if video is disliked by user
router.get('/:videoId/check', authenticateToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    const user = await User.findOne({ username: req.user.username });
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const isDisliked = user.dislikedVideos.includes(videoId);
    
    res.json({
      success: true,
      isDisliked,
      videoId
    });
  } catch (err) {
    console.error('Check disliked video error:', err);
    res.status(500).json({ error: 'Failed to check disliked video', details: err.message });
  }
});

// Clear all disliked videos
router.delete('/', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const deletedCount = user.dislikedVideos.length;
    user.dislikedVideos = [];
    await user.save();
    
    res.json({ 
      success: true,
      message: `All ${deletedCount} disliked videos removed successfully`
    });
  } catch (err) {
    console.error('Clear disliked videos error:', err);
    res.status(500).json({ error: 'Failed to clear disliked videos', details: err.message });
  }
});

module.exports = router; 