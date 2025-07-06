const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');
const Video = require('../models/Video');
const router = express.Router();

// Get user playlists
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const playlistsWithVideos = await Promise.all(
      user.playlists.map(async (playlist) => {
        const videos = await Video.find({ _id: { $in: playlist.videos } })
          .populate('uploadedBy', 'username')
          .select('title thumbnail views videoSrcUrl category uploadedAt description uploadedBy');
        
        const formattedVideos = videos.map(video => ({
          _id: video._id,
          title: video.title,
          thumbnail: video.thumbnail,
          views: video.views,
          videoSrcUrl: video.videoSrcUrl,
          category: video.category,
          uploadedAt: video.uploadedAt,
          description: video.description,
          uploader: video.uploadedBy && video.uploadedBy.username ? video.uploadedBy.username : video.uploadedBy
        }));
        
        return {
          _id: playlist._id,
          name: playlist.name,
          videos: formattedVideos,
          videoCount: playlist.videos.length,
          createdAt: playlist.createdAt || new Date()
        };
      })
    );
    
    res.json({
      success: true,
      playlists: playlistsWithVideos,
      totalPlaylists: playlistsWithVideos.length
    });
  } catch (err) {
    console.error('Get playlists error:', err);
    res.status(500).json({ error: 'Failed to fetch playlists', details: err.message });
  }
});

// Get specific playlist by ID
router.get('/:playlistId', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const playlist = user.playlists.id(req.params.playlistId);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    
    const videos = await Video.find({ _id: { $in: playlist.videos } })
      .populate('uploadedBy', 'username')
      .select('title thumbnail views videoSrcUrl category uploadedAt description uploadedBy');
    
    const formattedVideos = videos.map(video => ({
      _id: video._id,
      title: video.title,
      thumbnail: video.thumbnail,
      views: video.views,
      videoSrcUrl: video.videoSrcUrl,
      category: video.category,
      uploadedAt: video.uploadedAt,
      description: video.description,
      uploader: video.uploadedBy && video.uploadedBy.username ? video.uploadedBy.username : video.uploadedBy
    }));
    
    res.json({
      success: true,
      playlist: {
        _id: playlist._id,
        name: playlist.name,
        videos: formattedVideos,
        videoCount: playlist.videos.length,
        createdAt: playlist.createdAt || new Date()
      }
    });
  } catch (err) {
    console.error('Get playlist error:', err);
    res.status(500).json({ error: 'Failed to fetch playlist', details: err.message });
  }
});

// Create playlist
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;
    const user = await User.findOne({ username: req.user.username });
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Playlist name is required' });
    }
    
    // Check if playlist with same name already exists
    const existingPlaylist = user.playlists.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (existingPlaylist) {
      return res.status(400).json({ error: 'A playlist with this name already exists' });
    }
    
    const newPlaylist = {
      name: name.trim(),
      description: description || '',
      videos: [],
      createdAt: new Date()
    };
    
    user.playlists.push(newPlaylist);
    await user.save();
    
    const createdPlaylist = user.playlists[user.playlists.length - 1];
    
    res.status(201).json({ 
      success: true,
      message: 'Playlist created successfully',
      playlist: {
        _id: createdPlaylist._id,
        name: createdPlaylist.name,
        description: createdPlaylist.description,
        videos: [],
        videoCount: 0,
        createdAt: createdPlaylist.createdAt
      }
    });
  } catch (err) {
    console.error('Create playlist error:', err);
    res.status(500).json({ error: 'Failed to create playlist', details: err.message });
  }
});

// Update playlist
router.put('/:playlistId', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;
    const user = await User.findOne({ username: req.user.username });
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const playlist = user.playlists.id(req.params.playlistId);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    
    if (name && name.trim() !== '') {
      // Check if another playlist with same name exists
      const existingPlaylist = user.playlists.find(p => 
        p.name.toLowerCase() === name.toLowerCase() && 
        p._id.toString() !== req.params.playlistId
      );
      if (existingPlaylist) {
        return res.status(400).json({ error: 'A playlist with this name already exists' });
      }
      playlist.name = name.trim();
    }
    
    if (description !== undefined) {
      playlist.description = description;
    }
    
    await user.save();
    
    res.json({ 
      success: true,
      message: 'Playlist updated successfully',
      playlist: {
        _id: playlist._id,
        name: playlist.name,
        description: playlist.description,
        videoCount: playlist.videos.length,
        createdAt: playlist.createdAt
      }
    });
  } catch (err) {
    console.error('Update playlist error:', err);
    res.status(500).json({ error: 'Failed to update playlist', details: err.message });
  }
});

// Add video to playlist
router.patch('/:playlistId/add', authenticateToken, async (req, res) => {
  try {
    const { videoId } = req.body;
    const user = await User.findOne({ username: req.user.username });
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!videoId) return res.status(400).json({ error: 'Video ID is required' });
    
    // Check if video exists
    const video = await Video.findById(videoId);
    if (!video) return res.status(404).json({ error: 'Video not found' });
    
    const playlist = user.playlists.id(req.params.playlistId);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    
    // Check if video is already in playlist
    if (playlist.videos.includes(videoId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Video is already in this playlist' 
      });
    }
    
    playlist.videos.push(videoId);
    await user.save();
    
    res.json({ 
      success: true,
      message: 'Video added to playlist successfully',
      playlist: {
        _id: playlist._id,
        name: playlist.name,
        videoCount: playlist.videos.length
      }
    });
  } catch (err) {
    console.error('Add video to playlist error:', err);
    res.status(500).json({ error: 'Failed to add video to playlist', details: err.message });
  }
});

// Remove video from playlist
router.delete('/:playlistId/remove', authenticateToken, async (req, res) => {
  try {
    const { videoId } = req.body;
    const user = await User.findOne({ username: req.user.username });
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!videoId) return res.status(400).json({ error: 'Video ID is required' });
    
    const playlist = user.playlists.id(req.params.playlistId);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    
    const initialLength = playlist.videos.length;
    playlist.videos = playlist.videos.filter(v => v.toString() !== videoId);
    
    if (playlist.videos.length === initialLength) {
      return res.status(400).json({ 
        success: false,
        message: 'Video is not in this playlist' 
      });
    }
    
    await user.save();
    
    res.json({ 
      success: true,
      message: 'Video removed from playlist successfully',
      playlist: {
        _id: playlist._id,
        name: playlist.name,
        videoCount: playlist.videos.length
      }
    });
  } catch (err) {
    console.error('Remove video from playlist error:', err);
    res.status(500).json({ error: 'Failed to remove video from playlist', details: err.message });
  }
});

// Delete specific playlist
router.delete('/:playlistId', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const playlist = user.playlists.id(req.params.playlistId);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

    user.playlists = user.playlists.filter(p => p._id.toString() !== req.params.playlistId);
    await user.save();
    
    // Get the updated playlists with video details
    const playlistsWithVideos = await Promise.all(
      user.playlists.map(async (playlist) => {
        const videos = await Video.find({ _id: { $in: playlist.videos } })
          .populate('uploadedBy', 'username')
          .select('title thumbnail views videoSrcUrl category uploadedAt description uploadedBy');
        
        const formattedVideos = videos.map(video => ({
          _id: video._id,
          title: video.title,
          thumbnail: video.thumbnail,
          views: video.views,
          videoSrcUrl: video.videoSrcUrl,
          category: video.category,
          uploadedAt: video.uploadedAt,
          description: video.description,
          uploader: video.uploadedBy && video.uploadedBy.username ? video.uploadedBy.username : video.uploadedBy
        }));
        
        return {
          _id: playlist._id,
          name: playlist.name,
          videos: formattedVideos,
          videoCount: playlist.videos.length,
          createdAt: playlist.createdAt || new Date()
        };
      })
    );
    
    res.json({ 
      success: true,
      message: 'Playlist deleted successfully',
      deletedPlaylist: {
        _id: playlist._id,
        name: playlist.name,
        videoCount: playlist.videos.length
      },
      playlists: playlistsWithVideos
    });
  } catch (err) {
    console.error('Delete playlist error:', err);
    res.status(500).json({ error: 'Failed to delete playlist', details: err.message });
  }
});

// Delete all playlists
router.delete('/', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const deletedCount = user.playlists.length;
    user.playlists = [];
    await user.save();
    
    res.json({ 
      success: true,
      message: `All ${deletedCount} playlists deleted successfully`,
      playlists: []
    });
  } catch (err) {
    console.error('Delete all playlists error:', err);
    res.status(500).json({ error: 'Failed to delete all playlists', details: err.message });
  }
});

module.exports = router; 