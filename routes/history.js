const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');
const Video = require('../models/Video');
const router = express.Router();

// Add or update video in history (POST - for frontend compatibility)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { videoId } = req.body;
    const user = await User.findOne({ username: req.user.username });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Remove if already exists
    user.history = user.history.filter(
      entry => entry.video.toString() !== videoId
    );
    // Add to front
    user.history.unshift({ video: videoId, watchedAt: new Date() });
    // Limit history size if you want (e.g., 100)
    user.history = user.history.slice(0, 100);

    await user.save();
    
    // Populate the history with video details for response
    const populatedUser = await User.findById(user._id).populate('history.video');
    const history = populatedUser.history.map(entry => ({
      _id: entry.video?._id,
      title: entry.video?.title,
      thumbnail: entry.video?.thumbnail,
      videoSrcUrl: entry.video?.videoSrcUrl,
      views: entry.video?.views,
      category: entry.video?.category,
      description: entry.video?.description,
      uploader: entry.video?.uploadedBy,
      watchedAt: entry.watchedAt
    })).filter(v => v._id);

    res.json({ 
      success: true,
      history: history
    });
  } catch (err) {
    console.error('History update error:', err);
    res.status(500).json({ error: 'Failed to update history' });
  }
});

// Add or update video in history (PATCH - original format)
router.patch('/', authenticateToken, async (req, res) => {
  try {
    const { video } = req.body;
    const user = await User.findOne({ username: req.user.username });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Remove if already exists
    user.history = user.history.filter(
      entry => entry.video.toString() !== video._id
    );
    // Add to front
    user.history.unshift({ video: video._id, watchedAt: new Date() });
    // Limit history size if you want (e.g., 100)
    user.history = user.history.slice(0, 100);

    await user.save();
    res.json({ 
      status: 'ok',
      user: {
        history: user.history
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update history' });
  }
});

// Get user history (most recent first)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username })
      .populate({
        path: 'history.video',
        select: 'title thumbnail views uploadedAt description category videoSrcUrl uploadedBy'
      });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Return sorted by watchedAt desc
    const history = user.history
      .sort((a, b) => b.watchedAt - a.watchedAt)
      .map(entry => ({
        _id: entry.video?._id,
        title: entry.video?.title,
        thumbnail: entry.video?.thumbnail,
        views: entry.video?.views,
        uploadedAt: entry.video?.uploadedAt,
        description: entry.video?.description,
        category: entry.video?.category,
        videoSrcUrl: entry.video?.videoSrcUrl,
        uploader: entry.video?.uploadedBy,
        watchedAt: entry.watchedAt
      }))
      .filter(v => v._id); // filter out deleted videos

    res.json({ 
      success: true,
      history: history
    });
  } catch (err) {
    console.error('Get history error:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Remove video from history
router.delete('/:videoId', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username });
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.history = user.history.filter(
      entry => entry.video.toString() !== req.params.videoId
    );

    await user.save();
    
    // Populate the updated history with video details for response
    const populatedUser = await User.findById(user._id).populate('history.video');
    const history = populatedUser.history
      .sort((a, b) => b.watchedAt - a.watchedAt)
      .map(entry => ({
        _id: entry.video?._id,
        title: entry.video?.title,
        thumbnail: entry.video?.thumbnail,
        views: entry.video?.views,
        uploadedAt: entry.video?.uploadedAt,
        description: entry.video?.description,
        category: entry.video?.category,
        videoSrcUrl: entry.video?.videoSrcUrl,
        uploader: entry.video?.uploadedBy,
        watchedAt: entry.watchedAt
      }))
      .filter(v => v._id);

    res.json({ 
      success: true,
      history: history
    });
  } catch (err) {
    console.error('Remove from history error:', err);
    res.status(500).json({ error: 'Failed to remove from history' });
  }
});

// Clear all history
router.delete('/', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username });
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.history = [];
    await user.save();
    res.json({ message: 'History cleared' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

// Delete all history
router.delete('/deleteall', authenticateToken, async (req, res) => {
  console.log('==== DELETEALL ROUTE HIT - DEBUG LOG ====');
  res.json({ test: 'THIS IS THE NEW ROUTE' });
});

module.exports = router; 