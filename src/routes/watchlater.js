const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');
const Video = require('../models/Video');
const router = express.Router();

// Get user's watch later videos
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username })
      .populate({
        path: 'watchLater',
        select: 'title thumbnail views uploadedAt description category videoSrcUrl uploadedBy',
        populate: {
          path: 'uploadedBy',
          select: 'username'
        }
      });
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const formattedVideos = (user.watchLater || []).map(video => ({
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
    
    console.log('Backend - GET watch later, returning formatted videos:', formattedVideos.length);
    res.json({ 
      success: true,
      watchLater: formattedVideos,
      count: formattedVideos.length
    });
  } catch (err) {
    console.error('Get watch later error:', err);
    res.status(500).json({ error: 'Failed to get watch later videos', details: err.message });
  }
});

// Add video to watch later
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { videoId } = req.body;
    const user = await User.findOne({ username: req.user.username });
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!videoId) return res.status(400).json({ error: 'Video ID is required' });
    
    // Check if video exists
    const video = await Video.findById(videoId);
    if (!video) return res.status(404).json({ error: 'Video not found' });
    
    // Check if already in watch later
    if (user.watchLater && user.watchLater.includes(videoId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Video is already in watch later' 
      });
    }
    
    // Add to watch later
    if (!user.watchLater) {
      user.watchLater = [];
    }
    user.watchLater.push(videoId);
    await user.save();
    
    // Get the updated watch later list with full video objects
    const updatedUser = await User.findOne({ username: req.user.username })
      .populate({
        path: 'watchLater',
        select: 'title thumbnail views uploadedAt description category videoSrcUrl uploadedBy',
        populate: {
          path: 'uploadedBy',
          select: 'username'
        }
      });
    
    const formattedVideos = (updatedUser.watchLater || []).map(video => ({
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
    
    console.log('Backend - Watch later added, returning formatted videos:', formattedVideos.length);
    res.json({ 
      success: true,
      message: 'Video added to watch later successfully',
      watchLater: formattedVideos,
      count: formattedVideos.length
    });
  } catch (err) {
    console.error('Add to watch later error:', err);
    res.status(500).json({ error: 'Failed to add to watch later', details: err.message });
  }
});

// Remove video from watch later
router.delete('/:videoId', authenticateToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    const user = await User.findOne({ username: req.user.username });
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Check if video is in watch later
    if (!user.watchLater || !user.watchLater.includes(videoId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Video is not in watch later' 
      });
    }
    
    // Remove from watch later
    user.watchLater = user.watchLater.filter(vId => !vId.equals(videoId));
    await user.save();
    
    // Get the updated watch later list with full video objects
    const updatedUser = await User.findOne({ username: req.user.username })
      .populate({
        path: 'watchLater',
        select: 'title thumbnail views uploadedAt description category videoSrcUrl uploadedBy',
        populate: {
          path: 'uploadedBy',
          select: 'username'
        }
      });
    
    const formattedVideos = (updatedUser.watchLater || []).map(video => ({
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
    
    console.log('Backend - Watch later removed, returning formatted videos:', formattedVideos.length);
    res.json({ 
      success: true,
      message: 'Video removed from watch later successfully',
      watchLater: formattedVideos,
      count: formattedVideos.length
    });
  } catch (err) {
    console.error('Remove from watch later error:', err);
    res.status(500).json({ error: 'Failed to remove from watch later', details: err.message });
  }
});

// Clear all watch later videos
router.delete('/', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const deletedCount = user.watchLater ? user.watchLater.length : 0;
    user.watchLater = [];
    await user.save();
    
    res.json({ 
      success: true,
      message: `All ${deletedCount} watch later videos removed successfully`
    });
  } catch (err) {
    console.error('Clear watch later error:', err);
    res.status(500).json({ error: 'Failed to clear watch later', details: err.message });
  }
});

module.exports = router; 